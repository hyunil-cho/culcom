# Culcom AWS 인프라 (Terraform)

## 아키텍처 개요

```
                         ┌─────────────────────────────────────────────────────┐
                         │                      VPC (10.0.0.0/16)             │
                         │                                                     │
  사용자 ──── ALB ──────┤  ┌─── Public Subnet (AZ-a) ───┐  ┌─── Public Subnet (AZ-c) ───┐  │
              │          │  │  ALB, NAT Gateway           │  │  ALB                        │  │
              │          │  └─────────────────────────────┘  └────────────────────────────┘  │
              │          │                                                                    │
              ├── /api/* │  ┌─── Private Subnet (AZ-a) ──┐  ┌─── Private Subnet (AZ-c) ──┐  │
              │   ───────┤  │                              │  │                              │  │
              │          │  │  ECS Fargate (Backend)       │  │  ECS Fargate (Backend)       │  │
              │          │  │  ECS Fargate (Frontend)      │  │  ECS Fargate (Frontend)      │  │
              ├── /*     │  │                              │  │                              │  │
              │   ───────┤  │  RDS MySQL (Primary)         │  │  RDS MySQL (Standby)         │  │
              │          │  │  Lambda (webhook_handler)    │  │                              │  │
              │          │  └──────────────────────────────┘  └──────────────────────────────┘  │
              │          └─────────────────────────────────────────────────────────────────────┘
              │
  사용자 ──── API Gateway ── /external/{lambdaSeq} ──── Lambda (webhook_handler)
```

## 리소스 구성

| 구성요소 | 리소스 | 설명 |
|---|---|---|
| **네트워크** | VPC, 서브넷 2AZ, IGW, NAT Gateway | 퍼블릭/프라이빗 서브넷 분리 |
| **RDS** | MySQL 8.0, Multi-AZ | utf8mb4, Asia/Seoul, 자동 백업 7일 |
| **ECS Fargate** | 클러스터 + 2개 서비스 | Spring Boot(8081), Next.js(3000) |
| **ALB** | Application Load Balancer | `/api/*` → Backend, `/*` → Frontend |
| **Lambda** | webhook_handler (Python 3.12) | VPC 내 배치, RDS 직접 접근 |
| **API Gateway** | HTTP API v2 | `/external/{lambdaSeq}` 동적 라우팅 |
| **ECR** | 2개 리포지토리 | backend/frontend 컨테이너 이미지 저장 |

## 파일 구조

```
terraform/
├── provider.tf              # AWS 프로바이더 + 기본 태그
├── variables.tf             # 입력 변수 정의
├── terraform.tfvars.example # 변수 예시 (복사하여 사용)
├── vpc.tf                   # VPC, 서브넷, IGW, NAT Gateway, 라우트 테이블
├── security_groups.tf       # ALB / ECS / RDS / Lambda 보안그룹
├── rds.tf                   # RDS MySQL Multi-AZ + 파라미터 그룹
├── ecr.tf                   # ECR 리포지토리 + 수명주기 정책
├── alb.tf                   # ALB + 리스너 + 타겟그룹
├── ecs.tf                   # ECS 클러스터 + Backend/Frontend 서비스
├── lambda.tf                # Lambda 함수 + API Gateway HTTP API
└── outputs.tf               # 주요 리소스 출력값
```

## 사용 방법

### 1. 사전 준비

- [Terraform CLI](https://developer.hashicorp.com/terraform/install) >= 1.5
- AWS CLI 설정 완료 (`aws configure`)
- Lambda 배포 패키지를 S3에 업로드

```bash
# Lambda 패키지 빌드 및 S3 업로드
cd lambda
./deploy.sh <your-s3-bucket>
```

### 2. 변수 설정

```bash
cd terraform
cp terraform.tfvars.example terraform.tfvars
```

`terraform.tfvars`를 편집하여 필수 값을 입력:

```hcl
db_password      = "안전한_비밀번호"
backend_image    = "123456789012.dkr.ecr.ap-northeast-2.amazonaws.com/culcom-backend:latest"
frontend_image   = "123456789012.dkr.ecr.ap-northeast-2.amazonaws.com/culcom-frontend:latest"
lambda_s3_bucket = "culcom-deploy-bucket"
```

### 3. 인프라 배포

```bash
terraform init      # 프로바이더 다운로드
terraform plan      # 변경사항 미리보기
terraform apply     # 인프라 생성
```

### 4. 배포 후 확인

```bash
terraform output alb_dns_name       # 프론트엔드/백엔드 접속 주소
terraform output api_gateway_url    # Lambda API 엔드포인트
terraform output rds_endpoint       # DB 접속 정보
```

## ALB 라우팅 규칙

| 우선순위 | 경로 | 대상 |
|---|---|---|
| 100 | `/api/*` | Backend (Spring Boot:8081) |
| 110 | `/swagger-ui*`, `/v3/api-docs*` | Backend |
| 기본 | `/*` | Frontend (Next.js:3000) |

## Lambda 동적 라우팅

```
사용자 요청: GET /external/42
    ↓
API Gateway: ANY /external/{lambdaSeq}
    ↓
Lambda: event.pathParameters.lambdaSeq = "42"
    ↓
DB 조회: SELECT * FROM webhook_configs WHERE seq = 42
    ↓
설정 기반으로 인증 검증 → 필드 매핑 → 고객 데이터 저장
```

- `{lambdaSeq}` 값으로 DB의 `webhook_configs` 테이블을 조회하여 동적 처리
- `ANY /external/{lambdaSeq}/{proxy+}` 라우트로 하위 경로도 지원
- 인증 방식: NONE, API_KEY, QUERY_PARAM, HMAC_SHA256, BASIC 지원

## 보안그룹 정책

```
인터넷 → ALB (80, 443)
ALB → ECS (전체 포트)
ECS → RDS (3306)
Lambda → RDS (3306)
Lambda → 인터넷 (NAT Gateway 경유)
```

## 주요 변수

| 변수 | 기본값 | 설명 |
|---|---|---|
| `aws_region` | `ap-northeast-2` | AWS 리전 |
| `environment` | `stg` | 배포 환경 |
| `db_instance_class` | `db.t3.medium` | RDS 인스턴스 크기 |
| `backend_cpu` / `memory` | 512 / 1024 | Backend Fargate 스펙 |
| `frontend_cpu` / `memory` | 256 / 512 | Frontend Fargate 스펙 |
| `backend_desired_count` | 2 | Backend 태스크 수 |
| `frontend_desired_count` | 2 | Frontend 태스크 수 |

## 인프라 삭제

```bash
terraform destroy
```

> RDS는 `skip_final_snapshot = false`로 설정되어 삭제 시 최종 스냅샷이 자동 생성됩니다.
