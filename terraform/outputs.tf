output "vpc_id" {
  description = "VPC ID"
  value       = aws_vpc.main.id
}

output "alb_dns_name" {
  description = "ALB DNS (프론트엔드/백엔드 접근용)"
  value       = aws_lb.main.dns_name
}

output "rds_endpoint" {
  description = "RDS MySQL 엔드포인트"
  value       = aws_db_instance.main.endpoint
}

output "rds_address" {
  description = "RDS MySQL 호스트 주소"
  value       = aws_db_instance.main.address
}

output "ecs_cluster_name" {
  description = "ECS 클러스터 이름"
  value       = aws_ecs_cluster.main.name
}

output "api_gateway_url" {
  description = "API Gateway URL (/external/{lambdaSeq} 엔드포인트)"
  value       = aws_apigatewayv2_api.lambda.api_endpoint
}

output "lambda_function_name" {
  description = "Webhook Handler Lambda 함수 이름"
  value       = aws_lambda_function.webhook_handler.function_name
}

output "lambda_function_arn" {
  description = "Webhook Handler Lambda ARN"
  value       = aws_lambda_function.webhook_handler.arn
}
