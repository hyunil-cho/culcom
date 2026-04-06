# ──────────────────────────────────────────────
#  Lambda 관련 리소스 — 보류 (추후 활성화)
# ──────────────────────────────────────────────

# resource "aws_iam_role" "lambda" { ... }
# resource "aws_iam_role_policy_attachment" "lambda_basic" { ... }
# resource "aws_iam_role_policy_attachment" "lambda_vpc" { ... }
# resource "aws_lambda_function" "webhook_handler" { ... }
# resource "aws_apigatewayv2_api" "lambda" { ... }
# resource "aws_apigatewayv2_stage" "lambda" { ... }
# resource "aws_cloudwatch_log_group" "apigw" { ... }
# resource "aws_apigatewayv2_integration" "webhook" { ... }
# resource "aws_apigatewayv2_route" "external" { ... }
# resource "aws_apigatewayv2_route" "external_proxy" { ... }
# resource "aws_lambda_permission" "apigw" { ... }
