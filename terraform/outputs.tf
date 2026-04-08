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

output "ssh_command" {
  description = "EC2 SSH 접속 명령 예시"
  value       = "ssh -i ${local_sensitive_file.app_private_key.filename} ec2-user@${aws_eip.app.public_ip}"
}

output "ssh_key_name" {
  description = "AWS에 등록된 키페어 이름"
  value       = aws_key_pair.app.key_name
}

output "ecr_repository_url" {
  description = "ECR 리포지토리 URL"
  value       = aws_ecr_repository.app.repository_url
}
