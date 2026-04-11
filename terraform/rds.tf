locals {
  # local 환경: RDS를 퍼블릭 서브넷에 배치하고 외부에서 직접 접근 가능하도록 한다.
  # stg / prod 환경: 기존대로 프라이빗 서브넷, EC2 보안그룹에서만 접근 가능.
  is_local = var.environment == "local"
}

# ─── DB 서브넷 그룹 ───
resource "aws_db_subnet_group" "main" {
  name       = "${var.project_name}-db-subnet"
  subnet_ids = local.is_local ? aws_subnet.public[*].id : aws_subnet.private[*].id

  tags = { Name = "${var.project_name}-db-subnet-group" }
}

# ─── RDS MySQL (Multi-AZ) ───
resource "aws_db_instance" "main" {
  identifier = "${var.project_name}-${var.environment}"

  engine         = "mysql"
  engine_version = "8.0"
  instance_class = var.db_instance_class

  allocated_storage     = 20
  max_allocated_storage = 100
  storage_type          = "gp3"
  storage_encrypted     = true

  db_name  = var.db_name
  username = var.db_username
  password = var.db_password

  multi_az               = false
  db_subnet_group_name   = aws_db_subnet_group.main.name
  vpc_security_group_ids = [aws_security_group.rds.id]
  publicly_accessible    = local.is_local

  backup_retention_period = 7
  backup_window           = "03:00-04:00"
  maintenance_window      = "mon:04:30-mon:05:30"

  skip_final_snapshot       = false
  final_snapshot_identifier = "${var.project_name}-final-snapshot"

  parameter_group_name = aws_db_parameter_group.main.name

  tags = { Name = "${var.project_name}-rds" }
}

resource "aws_db_parameter_group" "main" {
  name   = "${var.project_name}-mysql80"
  family = "mysql8.0"

  parameter {
    name  = "character_set_server"
    value = "utf8mb4"
  }

  parameter {
    name  = "collation_server"
    value = "utf8mb4_unicode_ci"
  }

  parameter {
    name  = "time_zone"
    value = "Asia/Seoul"
  }

  tags = { Name = "${var.project_name}-mysql-params" }
}
