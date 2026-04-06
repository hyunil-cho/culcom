# ─── SSM Parameter Store (민감정보 중앙 관리) ───

resource "aws_ssm_parameter" "db_username" {
  name  = "/${var.project_name}/${var.environment}/db/username"
  type  = "SecureString"
  value = var.db_username

  tags = { Name = "${var.project_name}-db-username" }
}

resource "aws_ssm_parameter" "db_password" {
  name  = "/${var.project_name}/${var.environment}/db/password"
  type  = "SecureString"
  value = var.db_password

  tags = { Name = "${var.project_name}-db-password" }
}

resource "aws_ssm_parameter" "kakao_client_id" {
  name  = "/${var.project_name}/${var.environment}/kakao/client-id"
  type  = "SecureString"
  value = var.kakao_client_id

  tags = { Name = "${var.project_name}-kakao-client-id" }
}

resource "aws_ssm_parameter" "kakao_admin_key" {
  name  = "/${var.project_name}/${var.environment}/kakao/admin-key"
  type  = "SecureString"
  value = var.kakao_admin_key

  tags = { Name = "${var.project_name}-kakao-admin-key" }
}
