output "vpc_id" {
  description = "VPC ID"
  value       = aws_vpc.main.id
}

output "app_public_ip" {
  description = "앱 서버 Elastic IP (접속용)"
  value       = aws_eip.app.public_ip
}

output "rds_endpoint" {
  description = "RDS MySQL 엔드포인트"
  value       = aws_db_instance.main.endpoint
}

output "rds_address" {
  description = "RDS MySQL 호스트 주소"
  value       = aws_db_instance.main.address
}

output "ecr_repository_url" {
  description = "ECR 리포지토리 URL"
  value       = aws_ecr_repository.app.repository_url
}
