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
  default     = "db.t3.medium"
}

# ─── ECS ───
variable "backend_image" {
  description = "Spring Boot 컨테이너 이미지 URI"
  type        = string
}

variable "frontend_image" {
  description = "Next.js 컨테이너 이미지 URI"
  type        = string
}

variable "backend_cpu" {
  type    = number
  default = 512
}

variable "backend_memory" {
  type    = number
  default = 1024
}

variable "frontend_cpu" {
  type    = number
  default = 256
}

variable "frontend_memory" {
  type    = number
  default = 512
}

variable "backend_desired_count" {
  type    = number
  default = 2
}

variable "frontend_desired_count" {
  type    = number
  default = 2
}

# ─── Secrets ───
variable "kakao_api_key" {
  description = "카카오 API 키"
  type        = string
  sensitive   = true
}

# ─── Lambda ───
variable "lambda_s3_bucket" {
  description = "Lambda 배포 패키지가 저장된 S3 버킷"
  type        = string
}

variable "lambda_s3_key" {
  description = "Lambda 배포 패키지 S3 키"
  type        = string
  default     = "culcom/webhook-handler.zip"
}

# ─── Domain ───
variable "domain_name" {
  description = "서비스 도메인 (예: culcom.example.com). 빈 문자열이면 Route53/ACM 생성 생략"
  type        = string
  default     = ""
}
