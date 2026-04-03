#!/bin/bash
# Lambda 배포 패키지 빌드 + S3 업로드 스크립트
# 사용법: ./deploy.sh <s3-bucket> <s3-key>
#   예: ./deploy.sh my-lambda-bucket culcom/webhook-handler.zip

set -e

S3_BUCKET=${1:?"S3 버킷을 지정하세요 (예: my-lambda-bucket)"}
S3_KEY=${2:-"culcom/webhook-handler.zip"}

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
BUILD_DIR="$SCRIPT_DIR/.build"
HANDLER_DIR="$SCRIPT_DIR/webhook_handler"

echo "=== Lambda 배포 패키지 빌드 시작 ==="

# 빌드 디렉토리 초기화
rm -rf "$BUILD_DIR"
mkdir -p "$BUILD_DIR"

# 의존성 설치
pip install -r "$HANDLER_DIR/requirements.txt" -t "$BUILD_DIR" --quiet

# 핸들러 코드 복사
cp "$HANDLER_DIR/handler.py" "$BUILD_DIR/index.py"

# ZIP 생성
cd "$BUILD_DIR"
zip -r9 "$SCRIPT_DIR/webhook-handler.zip" . --quiet

echo "=== 빌드 완료: webhook-handler.zip ==="

# S3 업로드
aws s3 cp "$SCRIPT_DIR/webhook-handler.zip" "s3://$S3_BUCKET/$S3_KEY"
echo "=== S3 업로드 완료: s3://$S3_BUCKET/$S3_KEY ==="

# 정리
rm -rf "$BUILD_DIR"
