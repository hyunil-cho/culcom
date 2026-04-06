variable "aws_region" {
  description = "AWS 리전"
  type        = string
  default     = "ap-northeast-2"
}

variable "project_name" {
  description = "프로젝트 이름 (리소스 네이밍 접두사)"
  type        = string
  default     = "culcom"
}

variable "environment" {
  description = "배포 환경 (stg / prod)"
  type        = string
  default     = "stg"
}

# ─── VPC ───
variable "vpc_cidr" {
  description = "VPC CIDR 블록"
  type        = string
  default     = "10.0.0.0/16"
}

variable "azs" {
  description = "사용할 가용영역 목록"
  type        = list(string)
  default     = ["ap-northeast-2a", "ap-northeast-2c"]
}

variable "public_subnet_cidrs" {
  description = "퍼블릭 서브넷 CIDR 목록"
  type        = list(string)
  default     = ["10.0.1.0/24", "10.0.2.0/24"]
}

variable "private_subnet_cidrs" {
  description = "프라이빗 서브넷 CIDR 목록"
  type        = list(string)
  default     = ["10.0.11.0/24", "10.0.12.0/24"]
}

# ─── RDS ───
variable "db_name" {
  description = "데이터베이스 이름"
  type        = string
  default     = "culcom"
}

variable "db_username" {
  description = "DB 마스터 사용자명"
  type        = string
  default     = "admin"
}

variable "db_password" {
  description = "DB 마스터 비밀번호"
  type        = string
  sensitive   = true
}

variable "db_instance_class" {
  description = "RDS 인스턴스 클래스"
  type        = string
  default     = "db.t3.micro"
}

# ─── EC2 ───
variable "app_image" {
  description = "앱 컨테이너 이미지 URI (Next.js + Spring Boot)"
  type        = string
}

variable "ec2_instance_type" {
  description = "EC2 인스턴스 타입"
  type        = string
  default     = "t3.small"
}

# ─── Secrets ───
variable "kakao_client_id" {
  description = "카카오 OAuth Client ID"
  type        = string
  sensitive   = true
}

variable "kakao_admin_key" {
  description = "카카오 Admin Key"
  type        = string
  sensitive   = true
}

variable "kakao_redirect_uri" {
  description = "카카오 OAuth Redirect URI"
  type        = string
}

variable "kakao_sync_base_url" {
  description = "카카오 싱크 Base URL"
  type        = string
  default     = "https://pf-link.kakao.com/qr/_qFHUn/pages/_MM"
}

# ─── Domain ───
variable "domain_name" {
  description = "서비스 도메인 (예: culcom.example.com). 빈 문자열이면 Route53/ACM 생성 생략"
  type        = string
  default     = ""
}
