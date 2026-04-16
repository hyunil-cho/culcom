# ─── Amazon Linux 2023 최신 AMI ───
data "aws_ami" "al2023" {
  most_recent = true
  owners      = ["amazon"]

  filter {
    name   = "name"
    values = ["al2023-ami-*-x86_64"]
  }

  filter {
    name   = "virtualization-type"
    values = ["hvm"]
  }
}

# ─── EC2 IAM 역할 (ECR pull + SSM read) ───
resource "aws_iam_role" "ec2" {
  name = "${var.project_name}-ec2-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action    = "sts:AssumeRole"
      Effect    = "Allow"
      Principal = { Service = "ec2.amazonaws.com" }
    }]
  })
}

resource "aws_iam_role_policy" "ec2_ecr" {
  name = "${var.project_name}-ec2-ecr"
  role = aws_iam_role.ec2.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "ecr:GetAuthorizationToken",
        ]
        Resource = "*"
      },
      {
        Effect = "Allow"
        Action = [
          "ecr:BatchGetImage",
          "ecr:GetDownloadUrlForLayer",
          "ecr:BatchCheckLayerAvailability",
        ]
        Resource = aws_ecr_repository.app.arn
      },
    ]
  })
}

resource "aws_iam_role_policy" "ec2_ssm" {
  name = "${var.project_name}-ec2-ssm"
  role = aws_iam_role.ec2.id

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

resource "aws_iam_instance_profile" "ec2" {
  name = "${var.project_name}-ec2-profile"
  role = aws_iam_role.ec2.name
}

# ─── SSH 키페어 (Terraform이 새로 생성) ───
resource "tls_private_key" "app" {
  algorithm = "RSA"
  rsa_bits  = 4096
}

resource "aws_key_pair" "app" {
  key_name   = "${var.project_name}-${var.environment}-key"
  public_key = tls_private_key.app.public_key_openssh

  tags = { Name = "${var.project_name}-keypair" }
}

# 생성된 개인키를 로컬 파일로 저장 (terraform 디렉터리 내 .ssh/)
resource "local_sensitive_file" "app_private_key" {
  content         = tls_private_key.app.private_key_pem
  filename        = "${path.module}/.ssh/${aws_key_pair.app.key_name}.pem"
  file_permission = "0400"
}

# ─── Elastic IP ───
resource "aws_eip" "app" {
  instance = aws_instance.app.id
  domain   = "vpc"

  tags = { Name = "${var.project_name}-app-eip" }
}

# ─── EC2 인스턴스 ───
resource "aws_instance" "app" {
  ami                    = data.aws_ami.al2023.id
  instance_type          = var.ec2_instance_type
  subnet_id              = aws_subnet.public[0].id
  vpc_security_group_ids = [aws_security_group.ec2.id]
  iam_instance_profile   = aws_iam_instance_profile.ec2.name
  key_name               = aws_key_pair.app.key_name

  root_block_device {
    volume_size = 10
    volume_type = "gp3"
  }

  user_data = base64encode(templatefile("${path.module}/user_data.sh", {
    aws_region   = var.aws_region
    app_image    = var.app_image
    project_name = var.project_name
    environment  = var.environment
    db_endpoint  = aws_db_instance.main.endpoint
    db_name      = var.db_name
    redirect_uri = var.kakao_redirect_uri
    app_domain   = var.domain_name
  }))

  tags = { Name = "${var.project_name}-app" }

  depends_on = [aws_db_instance.main]
}
