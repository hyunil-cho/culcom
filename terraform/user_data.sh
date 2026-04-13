#!/bin/bash
set -e

# ─── 패키지 설치 ───
dnf update -y
dnf install -y docker nginx certbot python3-certbot-nginx
systemctl enable docker
systemctl start docker
systemctl enable nginx

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
META_VERIFY_TOKEN=$(aws ssm get-parameter --name "/${project_name}/${environment}/meta/verify-token" --with-decryption --query "Parameter.Value" --output text --region ${aws_region})

# ─── CORS 허용 오리진 (HTTPS 도메인 단일) ───
CORS_ALLOWED_ORIGINS="https://${app_domain}"

# ─── 컨테이너 실행 ───
# 이미지 내부에는 supervisord로 Next.js(3000) + Spring Boot(8081)가 함께 기동된다.
# nginx가 호스트에서 종단(Termination) 후 두 포트로 직접 리버스 프록시하므로,
# 컨테이너 포트는 외부에 노출하지 않고 127.0.0.1 에만 바인딩한다.
docker pull ${app_image}
docker rm -f culcom-app 2>/dev/null || true

docker run -d \
  --name culcom-app \
  --restart always \
  -p 127.0.0.1:3000:3000 \
  -p 127.0.0.1:8081:8081 \
  -e SPRING_PROFILES_ACTIVE=${environment} \
  -e SPRING_DATASOURCE_URL="jdbc:mysql://${db_endpoint}/${db_name}?useSSL=true&serverTimezone=Asia/Seoul" \
  -e SPRING_DATASOURCE_USERNAME="$DB_USERNAME" \
  -e SPRING_DATASOURCE_PASSWORD="$DB_PASSWORD" \
  -e KAKAO_CLIENT_ID="$KAKAO_CLIENT_ID" \
  -e KAKAO_ADMIN_KEY="$KAKAO_ADMIN_KEY" \
  -e KAKAO_REDIRECT_URI="${redirect_uri}" \
  -e KAKAO_SYNC_BASE_URL="${sync_base_url}" \
  -e META_VERIFY_TOKEN="$META_VERIFY_TOKEN" \
  -e CORS_ALLOWED_ORIGINS="$CORS_ALLOWED_ORIGINS" \
  ${app_image}

# ─── 컨테이너 헬스 대기 (Next.js 3000 + Spring Boot 8081 둘 다) ───
for i in $(seq 1 60); do
  curl -fsS http://127.0.0.1:3000/  >/dev/null 2>&1 && \
  curl -fsS http://127.0.0.1:8081/  >/dev/null 2>&1 && break || true
  sleep 2
done

# ─── nginx 리버스 프록시 설정 (HTTP only, certbot 이 후속으로 443 자동 추가) ───
# /api/*, /swagger-ui*, /v3/api-docs* → Spring Boot (8081)
# 그 외 모든 경로                     → Next.js (3000)
cat >/etc/nginx/conf.d/culcom.conf <<NGINX
# 큰 파일 업로드 대비
client_max_body_size 50m;

# upstream 정의
upstream culcom_frontend { server 127.0.0.1:3000; keepalive 32; }
upstream culcom_backend  { server 127.0.0.1:8081; keepalive 32; }

server {
    listen 80;
    server_name ${app_domain};

    # ACME HTTP-01 challenge 용
    location /.well-known/acme-challenge/ {
        root /var/www/html;
    }

    # ── Spring Boot 직접 프록시 ──
    location /api/ {
        proxy_pass         http://culcom_backend;
        proxy_http_version 1.1;
        proxy_set_header   Host              \$host;
        proxy_set_header   X-Real-IP         \$remote_addr;
        proxy_set_header   X-Forwarded-For   \$proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto \$scheme;
        proxy_set_header   X-Forwarded-Host  \$host;
        proxy_read_timeout 300s;
    }

    location /swagger-ui {
        proxy_pass         http://culcom_backend;
        proxy_http_version 1.1;
        proxy_set_header   Host              \$host;
        proxy_set_header   X-Real-IP         \$remote_addr;
        proxy_set_header   X-Forwarded-For   \$proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto \$scheme;
    }

    location /v3/api-docs {
        proxy_pass         http://culcom_backend;
        proxy_http_version 1.1;
        proxy_set_header   Host              \$host;
        proxy_set_header   X-Real-IP         \$remote_addr;
        proxy_set_header   X-Forwarded-For   \$proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto \$scheme;
    }

    # ── Next.js 프론트 ──
    location / {
        proxy_pass         http://culcom_frontend;
        proxy_http_version 1.1;
        proxy_set_header   Upgrade           \$http_upgrade;
        proxy_set_header   Connection        "upgrade";
        proxy_set_header   Host              \$host;
        proxy_set_header   X-Real-IP         \$remote_addr;
        proxy_set_header   X-Forwarded-For   \$proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto \$scheme;
        proxy_set_header   X-Forwarded-Host  \$host;
        proxy_read_timeout 300s;
    }
}
NGINX

mkdir -p /var/www/html
nginx -t
systemctl restart nginx

# ─── Let's Encrypt 인증서 발급 ───
# --nginx 플러그인이 위 conf 를 자동으로 443 server 블록 + 80→443 리다이렉트로 재작성한다.
certbot --nginx \
  -d ${app_domain} \
  --non-interactive --agree-tos \
  -m ${letsencrypt_email} \
  --redirect \
  --keep-until-expiring

# ─── 자동 갱신 ───
# Amazon Linux 2023 의 certbot 패키지는 systemd timer 를 함께 설치한다.
systemctl enable --now certbot-renew.timer 2>/dev/null || \
  echo "0 3 * * * root certbot renew --quiet --deploy-hook 'systemctl reload nginx'" \
    > /etc/cron.d/certbot-renew