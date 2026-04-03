# ──────────────────────────────────────────────
#  Lambda 실행 역할
# ──────────────────────────────────────────────
resource "aws_iam_role" "lambda" {
  name = "${var.project_name}-lambda-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action    = "sts:AssumeRole"
      Effect    = "Allow"
      Principal = { Service = "lambda.amazonaws.com" }
    }]
  })
}

resource "aws_iam_role_policy_attachment" "lambda_basic" {
  role       = aws_iam_role.lambda.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

resource "aws_iam_role_policy_attachment" "lambda_vpc" {
  role       = aws_iam_role.lambda.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaVPCAccessExecutionRole"
}

# ──────────────────────────────────────────────
#  Webhook Handler Lambda
# ──────────────────────────────────────────────
resource "aws_lambda_function" "webhook_handler" {
  function_name = "${var.project_name}-webhook-handler"
  description   = "웹훅 요청을 받아 DB 기반으로 동적 처리하는 핸들러"

  s3_bucket = var.lambda_s3_bucket
  s3_key    = var.lambda_s3_key

  runtime = "python3.12"
  handler = "index.handler"
  timeout = 30
  memory_size = 256

  role = aws_iam_role.lambda.arn

  vpc_config {
    subnet_ids         = aws_subnet.private[*].id
    security_group_ids = [aws_security_group.lambda.id]
  }

  environment {
    variables = {
      DB_HOST     = aws_db_instance.main.address
      DB_PORT     = "3306"
      DB_NAME     = var.db_name
      DB_USERNAME = var.db_username
      DB_PASSWORD = var.db_password
    }
  }

  tags = { Name = "${var.project_name}-webhook-handler" }
}

# ──────────────────────────────────────────────
#  API Gateway HTTP API — /external/{lambdaSeq} 동적 라우팅
# ──────────────────────────────────────────────
resource "aws_apigatewayv2_api" "lambda" {
  name          = "${var.project_name}-lambda-api"
  protocol_type = "HTTP"
  description   = "Lambda 동적 라우팅 API (/external/{lambdaSeq})"

  cors_configuration {
    allow_origins = ["*"]
    allow_methods = ["GET", "POST", "PUT", "DELETE", "OPTIONS"]
    allow_headers = ["*"]
    max_age       = 3600
  }
}

resource "aws_apigatewayv2_stage" "lambda" {
  api_id      = aws_apigatewayv2_api.lambda.id
  name        = "$default"
  auto_deploy = true

  access_log_settings {
    destination_arn = aws_cloudwatch_log_group.apigw.arn
    format = jsonencode({
      requestId      = "$context.requestId"
      ip             = "$context.identity.sourceIp"
      method         = "$context.httpMethod"
      path           = "$context.path"
      status         = "$context.status"
      responseLength = "$context.responseLength"
      lambdaSeq      = "$request.pathParameters.lambdaSeq"
    })
  }
}

resource "aws_cloudwatch_log_group" "apigw" {
  name              = "/apigateway/${var.project_name}-lambda-api"
  retention_in_days = 30
}

# ─── Lambda 통합 ───
resource "aws_apigatewayv2_integration" "webhook" {
  api_id                 = aws_apigatewayv2_api.lambda.id
  integration_type       = "AWS_PROXY"
  integration_uri        = aws_lambda_function.webhook_handler.invoke_arn
  payload_format_version = "2.0"
}

# ─── ANY /external/{lambdaSeq} 라우트 ───
# lambdaSeq 값이 path parameter로 Lambda에 전달되며,
# Lambda 내부에서 DB의 webhook_configs 테이블을 조회하여 동적 라우팅
resource "aws_apigatewayv2_route" "external" {
  api_id    = aws_apigatewayv2_api.lambda.id
  route_key = "ANY /external/{lambdaSeq}"
  target    = "integrations/${aws_apigatewayv2_integration.webhook.id}"
}

# ─── ANY /external/{lambdaSeq}/{proxy+} (하위 경로 포함) ───
resource "aws_apigatewayv2_route" "external_proxy" {
  api_id    = aws_apigatewayv2_api.lambda.id
  route_key = "ANY /external/{lambdaSeq}/{proxy+}"
  target    = "integrations/${aws_apigatewayv2_integration.webhook.id}"
}

# ─── API Gateway → Lambda 호출 권한 ───
resource "aws_lambda_permission" "apigw" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.webhook_handler.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.lambda.execution_arn}/*/*"
}
