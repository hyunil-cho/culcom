# Culcom AWS 인프라 (Terraform)

## 아키텍처 개요

```
                    ┌────────────────────── VPC (10.0.0.0/16) ──────────────────────┐
                    │                                                                │
  사용자 ── HTTP ──►│  Public Subnet (AZ-a, AZ-c)                                    │
                    │  ┌──────────────────────────────────────┐                      │
                    │  │  EC2 (Amazon Linux 2023, t3.small)   │                      │
                    │  │  └─ Docker: culcom-app (단일 컨테이너)│                      │
                    │  │     · Next.js + Spring Boot          │                      │
                    │  │     · 호스트 80 → 컨테이너 3000       │                      │
                    │  │  Elastic IP 부착                      │                      │
                    │  └──────────────────────────────────────┘                      │
                    │                    │                                           │
                    │                    ▼                                           │
                    │  Private Subnet (AZ-a, AZ-c)                                   │
                    │  ┌──────────────────────────────────────┐                      │
                    │  │  RDS MySQL 8.0 (Single-AZ, gp3 20GB) │                      │
                    │  └──────────────────────────────────────┘                      │
                    │                                                                │
                    │  SSM Parameter Store (DB / Kakao 시크릿, SecureString)           │
                    └────────────────────────────────────────────────────────────────┘
```

> ALB / ECS / Lambda / API Gateway / NAT Gateway는 비용 절감 차원에서 제거되었고,
> 단일 EC2 위에서 Next.js + Spring Boot 통합 컨테이너를 직접 구동하는 단순 구성으로 전환되었습니다.
> Lambda 관련 코드는 `lambda.tf`에 주석 형태로만 남아 있으며 추후 필요 시 활성화됩니다.

## 리소스 구성

| 구성요소 | 리소스 | 설명 |
|---|---|---|
| **네트워크** | VPC, 퍼블릭/프라이빗 서브넷 2AZ, IGW | NAT Gateway 없음 (프라이빗은 인터넷 아웃바운드 불가) |
| **EC2** | Amazon Linux 2023 + Docker | 퍼블릭 서브넷 배치, EIP 부착, IAM 역할로 ECR/SSM 접근 |
| **RDS** | MySQL 8.0 (Single-AZ) | gp3 20GB(최대 100GB), utf8mb4, Asia/Seoul, 백업 7일 |
| **ECR** | 단일 리포지토리 `culcom-app` | 최근 3개 이미지만 유지 |
| **SSM** | Parameter Store (SecureString) | DB/Kakao 시크릿 중앙 관리, EC2가 부팅 시 조회 |
| **보안그룹** | EC2(80,22), RDS(3306) | RDS는 EC2 SG에서만 접근 허용 |

## 파일 구조

```
terraform/
├── provider.tf            # AWS 프로바이더 + 기본 태그
├── variables.tf           # 입력 변수 정의
├── terraform.tfvars.example
├── vpc.tf                 # VPC, 서브넷, IGW, 라우트 테이블
├── security_groups.tf     # EC2 / RDS 보안그룹
├── rds.tf                 # RDS MySQL + 파라미터 그룹
├── ecr.tf                 # ECR 단일 리포지토리 + 수명주기
├── ec2.tf                 # EC2 인스턴스 + IAM 역할 + EIP
├── secrets.tf             # SSM Parameter Store
├── user_data.sh           # EC2 부팅 스크립트 (Docker 설치 + 컨테이너 실행)
├── lambda.tf              # (보류) Lambda 리소스 주석 처리
├── alb.tf / ecs.tf        # (제거됨) 안내 주석만 존재
└── outputs.tf             # 주요 출력값
```

## 사용 방법

### 1. 사전 준비

- [Terraform CLI](https://developer.hashicorp.com/terraform/install) >= 1.5
- AWS CLI 설정 완료 (`aws configure`)
- 앱 컨테이너 이미지를 ECR `culcom-app` 리포지토리에 푸시

### 2. 변수 설정

```bash
cd terraform
cp terraform.tfvars.example terraform.tfvars
```

`terraform.tfvars`를 편집하여 필수 값을 입력:

```hcl
db_password        = "안전한_비밀번호"
kakao_client_id    = "..."
kakao_admin_key    = "..."
kakao_redirect_uri = "http://ELASTIC_IP/api/public/board/kakao/callback"
app_image          = "123456789012.dkr.ecr.ap-northeast-2.amazonaws.com/culcom-app:latest"
```

### 3. 인프라 배포

```bash
terraform init
terraform plan
terraform apply
```

### 4. 배포 후 확인

```bash
terraform output app_public_ip      # EC2 Elastic IP (서비스 접속 주소)
terraform output rds_endpoint       # DB 엔드포인트
terraform output ecr_repository_url # ECR URL
```

브라우저에서 `http://<app_public_ip>` 으로 접속.

## EC2 부팅 흐름 (`user_data.sh`)

1. `dnf`로 Docker 설치 및 기동
2. `aws ecr get-login-password`로 ECR 로그인
3. SSM Parameter Store에서 DB/Kakao 시크릿 조회
4. `docker pull` 후 컨테이너 실행
   - 호스트 `80` → 컨테이너 `3000`
   - `SPRING_PROFILES_ACTIVE`, `SPRING_DATASOURCE_*`, `KAKAO_*` 환경변수 주입

> Spring Boot(8081)와 Next.js(3000)는 동일 컨테이너 내부에서 함께 동작하며,
> 외부에는 Next.js가 80 포트로 노출되고 `/api/*`는 내부 프록시로 전달됩니다.

## 보안그룹 정책

```
인터넷 → EC2 (80, 22)
EC2    → RDS (3306)
EC2    → 인터넷 (egress all, ECR/SSM/외부 API 호출)
RDS    → EC2 SG에서만 인바운드 허용
```

## SSM Parameter Store 경로

| 파라미터 | 경로 |
|---|---|
| DB Username | `/culcom/<env>/db/username` |
| DB Password | `/culcom/<env>/db/password` |
| Kakao Client ID | `/culcom/<env>/kakao/client-id` |
| Kakao Admin Key | `/culcom/<env>/kakao/admin-key` |

EC2 IAM 역할은 `arn:aws:ssm:<region>:*:parameter/culcom/<env>/*` 만 조회 가능.

## 주요 변수

| 변수 | 기본값 | 설명 |
|---|---|---|
| `aws_region` | `ap-northeast-2` | AWS 리전 |
| `environment` | `stg` | 배포 환경 |
| `vpc_cidr` | `10.0.0.0/16` | VPC CIDR |
| `db_instance_class` | `db.t3.micro` | RDS 인스턴스 크기 |
| `ec2_instance_type` | `t3.small` | EC2 인스턴스 타입 |
| `app_image` | (필수) | ECR 컨테이너 이미지 URI |
| `db_password` | (필수, sensitive) | RDS 마스터 비밀번호 |
| `kakao_client_id` / `kakao_admin_key` | (필수, sensitive) | 카카오 OAuth/Admin 키 |
| `kakao_redirect_uri` | (필수) | 카카오 OAuth Redirect URI |
| `kakao_sync_base_url` | `https://pf-link.kakao.com/...` | 카카오 싱크 Base URL |
| `domain_name` | `""` | 도메인 사용 시 입력 (현재 미사용) |

## 인프라 삭제

```bash
terraform destroy
```

> RDS는 `skip_final_snapshot = false` 이므로 삭제 시 `culcom-final-snapshot`이 자동 생성됩니다.
