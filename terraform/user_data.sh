#!/bin/bash
set -e

# ─── Docker 설치 ───
dnf update -y
dnf install -y docker
systemctl enable docker
systemctl start docker

# ─── 메타데이터: 퍼블릭 IP / DNS ───
TOKEN=$(curl -s -X PUT "http://169.254.169.254/latest/api/token" -H "X-aws-ec2-metadata-token-ttl-seconds: 21600")
PUBLIC_IP=$(curl -s -H "X-aws-ec2-metadata-token: $TOKEN" http://169.254.169.254/latest/meta-data/public-ipv4)
PUBLIC_DNS=$(curl -s -H "X-aws-ec2-metadata-token: $TOKEN" http://169.254.169.254/latest/meta-data/public-hostname)

# ─── ECR 로그인 ───
aws ecr get-login-password --region ${aws_region} | docker login --username AWS --password-stdin $(echo "${app_image}" | cut -d'/' -f1)

# ─── SSM에서 시크릿 조회 ───
DB_USERNAME=$(aws ssm get-parameter --name "/${project_name}/${environment}/db/username" --with-decryption --query "Parameter.Value" --output text --region ${aws_region})
DB_PASSWORD=$(aws ssm get-parameter --name "/${project_name}/${environment}/db/password" --with-decryption --query "Parameter.Value" --output text --region ${aws_region})
KAKAO_CLIENT_ID=$(aws ssm get-parameter --name "/${project_name}/${environment}/kakao/client-id" --with-decryption --query "Parameter.Value" --output text --region ${aws_region})
KAKAO_ADMIN_KEY=$(aws ssm get-parameter --name "/${project_name}/${environment}/kakao/admin-key" --with-decryption --query "Parameter.Value" --output text --region ${aws_region})

# ─── CORS 허용 오리진 (로컬 + 퍼블릭 IP + 퍼블릭 DNS) ───
CORS_ALLOWED_ORIGINS="http://localhost:3000,http://$PUBLIC_IP,http://$PUBLIC_DNS"

# ─── 컨테이너 실행 ───
# 이미지 내부에는 supervisord로 Next.js(3000) + Spring Boot(8081)가 함께 기동됨.
# 외부에는 Next.js(3000)만 80으로 노출하고, /api/* 는 Next.js rewrite로 백엔드(8081)에 프록시된다.
docker pull ${app_image}
docker rm -f culcom-app 2>/dev/null || true

docker run -d \
  --name culcom-app \
  --restart always \
  -p 80:3000 \
  -e SPRING_PROFILES_ACTIVE=${environment} \
  -e SPRING_DATASOURCE_URL="jdbc:mysql://${db_endpoint}/${db_name}?useSSL=true&serverTimezone=Asia/Seoul" \
  -e SPRING_DATASOURCE_USERNAME="$DB_USERNAME" \
  -e SPRING_DATASOURCE_PASSWORD="$DB_PASSWORD" \
  -e KAKAO_CLIENT_ID="$KAKAO_CLIENT_ID" \
  -e KAKAO_ADMIN_KEY="$KAKAO_ADMIN_KEY" \
  -e KAKAO_REDIRECT_URI="${redirect_uri}" \
  -e KAKAO_SYNC_BASE_URL="${sync_base_url}" \
  -e CORS_ALLOWED_ORIGINS="$CORS_ALLOWED_ORIGINS" \
  ${app_image}
