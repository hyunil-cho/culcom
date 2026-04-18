#!/bin/bash
set -e

# ─── 시간대 설정 (KST) ───
# 시스템 로그, journal, CloudWatch 에이전트 타임스탬프를 모두 한국 시간대로 맞춘다.
timedatectl set-timezone Asia/Seoul

# ─── 패키지 설치 ───
dnf update -y
dnf install -y docker amazon-cloudwatch-agent
systemctl enable docker
systemctl start docker

# ─── ECR 로그인 ───
aws ecr get-login-password --region ${aws_region} | docker login --username AWS --password-stdin $(echo "${app_image}" | cut -d'/' -f1)

# ─── SSM에서 시크릿 조회 ───
DB_USERNAME=$(aws ssm get-parameter --name "/${project_name}/${environment}/db/username" --with-decryption --query "Parameter.Value" --output text --region ${aws_region})
DB_PASSWORD=$(aws ssm get-parameter --name "/${project_name}/${environment}/db/password" --with-decryption --query "Parameter.Value" --output text --region ${aws_region})
KAKAO_CLIENT_ID=$(aws ssm get-parameter --name "/${project_name}/${environment}/kakao/client-id" --with-decryption --query "Parameter.Value" --output text --region ${aws_region})
KAKAO_CLIENT_SECRET=$(aws ssm get-parameter --name "/${project_name}/${environment}/kakao/client-secret" --with-decryption --query "Parameter.Value" --output text --region ${aws_region})
KAKAO_ADMIN_KEY=$(aws ssm get-parameter --name "/${project_name}/${environment}/kakao/admin-key" --with-decryption --query "Parameter.Value" --output text --region ${aws_region})
META_VERIFY_TOKEN=$(aws ssm get-parameter --name "/${project_name}/${environment}/meta/verify-token" --with-decryption --query "Parameter.Value" --output text --region ${aws_region})
KAKAO_SYNC_BASE_URL=$(aws ssm get-parameter --name "/${project_name}/${environment}/kakao/sync-base-url" --query "Parameter.Value" --output text --region ${aws_region})

# ─── CORS 허용 오리진 (HTTPS 도메인 단일) ───
CORS_ALLOWED_ORIGINS="https://${app_domain}"

# ─── 컨테이너 실행 ───
# 이미지 내부에는 supervisord로 Next.js(3000) + Spring Boot(8081)가 함께 기동된다.
# ALB가 TLS 종단 + 경로 기반 라우팅을 처리하므로 포트를 직접 노출한다.
docker pull ${app_image}
docker rm -f culcom-app 2>/dev/null || true

docker run -d \
  --name culcom-app \
  --restart always \
  --log-driver=awslogs \
  --log-opt awslogs-region=${aws_region} \
  --log-opt awslogs-group=/${project_name}/${environment}/app \
  --log-opt awslogs-stream=culcom-app \
  --log-opt awslogs-multiline-pattern="^[0-9]{4}-[0-9]{2}-[0-9]{2}" \
  -p 3000:3000 \
  -p 8081:8081 \
  -e TZ=Asia/Seoul \
  -e SPRING_PROFILES_ACTIVE=${environment} \
  -e SPRING_DATASOURCE_URL="jdbc:mysql://${db_endpoint}/${db_name}?useSSL=true&serverTimezone=Asia/Seoul" \
  -e SPRING_DATASOURCE_USERNAME="$DB_USERNAME" \
  -e SPRING_DATASOURCE_PASSWORD="$DB_PASSWORD" \
  -e KAKAO_CLIENT_ID="$KAKAO_CLIENT_ID" \
  -e KAKAO_CLIENT_SECRET="$KAKAO_CLIENT_SECRET" \
  -e KAKAO_ADMIN_KEY="$KAKAO_ADMIN_KEY" \
  -e KAKAO_REDIRECT_URI="${redirect_uri}" \
  -e KAKAO_SYNC_BASE_URL="$KAKAO_SYNC_BASE_URL" \
  -e META_VERIFY_TOKEN="$META_VERIFY_TOKEN" \
  -e CORS_ALLOWED_ORIGINS="$CORS_ALLOWED_ORIGINS" \
  ${app_image}

# ─── CloudWatch Agent 설정 (메모리 + 디스크 메트릭) ───
cat >/opt/aws/amazon-cloudwatch-agent/etc/amazon-cloudwatch-agent.json <<CWCONFIG
{
  "agent": {
    "metrics_collection_interval": 60,
    "run_as_user": "root"
  },
  "metrics": {
    "namespace": "CWAgent",
    "append_dimensions": {
      "InstanceId": "\$${aws:InstanceId}"
    },
    "metrics_collected": {
      "mem": {
        "measurement": ["mem_used_percent"],
        "metrics_collection_interval": 60
      },
      "disk": {
        "measurement": ["disk_used_percent"],
        "resources": ["/"],
        "metrics_collection_interval": 60
      }
    }
  }
}
CWCONFIG

/opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-ctl \
  -a fetch-config -m ec2 \
  -c file:/opt/aws/amazon-cloudwatch-agent/etc/amazon-cloudwatch-agent.json -s
