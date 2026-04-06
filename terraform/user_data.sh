#!/bin/bash
set -e

# ─── Docker 설치 ───
dnf update -y
dnf install -y docker
systemctl enable docker
systemctl start docker

# ─── ECR 로그인 ───
aws ecr get-login-password --region ${aws_region} | docker login --username AWS --password-stdin $(echo "${app_image}" | cut -d'/' -f1)

# ─── SSM에서 시크릿 조회 ───
DB_USERNAME=$(aws ssm get-parameter --name "/${project_name}/${environment}/db/username" --with-decryption --query "Parameter.Value" --output text --region ${aws_region})
DB_PASSWORD=$(aws ssm get-parameter --name "/${project_name}/${environment}/db/password" --with-decryption --query "Parameter.Value" --output text --region ${aws_region})
KAKAO_CLIENT_ID=$(aws ssm get-parameter --name "/${project_name}/${environment}/kakao/client-id" --with-decryption --query "Parameter.Value" --output text --region ${aws_region})
KAKAO_ADMIN_KEY=$(aws ssm get-parameter --name "/${project_name}/${environment}/kakao/admin-key" --with-decryption --query "Parameter.Value" --output text --region ${aws_region})

# ─── 컨테이너 실행 ───
docker pull ${app_image}

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
  ${app_image}
