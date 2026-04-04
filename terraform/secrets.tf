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

resource "aws_ssm_parameter" "kakao_api_key" {
  name  = "/${var.project_name}/${var.environment}/kakao/api-key"
  type  = "SecureString"
  value = var.kakao_api_key

  tags = { Name = "${var.project_name}-kakao-api-key" }
}

# ─── ECS Execution Role에 SSM 읽기 권한 부여 ───

resource "aws_iam_role_policy" "ecs_execution_ssm" {
  name = "${var.project_name}-ecs-execution-ssm"
  role = aws_iam_role.ecs_execution.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Action = [
        "ssm:GetParameters",
        "ssm:GetParameter",
      ]
      Resource = "arn:aws:ssm:${var.aws_region}:*:parameter/${var.project_name}/${var.environment}/*"
    }]
  })
}