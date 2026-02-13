#!/bin/bash
# build.sh
# Bash 버전 관리 빌드 스크립트

set -e

echo ""
echo "=== Culcom 빌드 스크립트 ==="
echo ""

# 버전 정보 수집
if [ ! -f VERSION ]; then
    echo "❌ VERSION 파일을 찾을 수 없습니다."
    exit 1
fi

VERSION=$(cat VERSION | tr -d '[:space:]')
BUILD_TIME=$(date '+%Y-%m-%d %H:%M:%S')
GIT_COMMIT=$(git rev-parse --short HEAD 2>/dev/null || echo "unknown")
GO_VERSION=$(go version)

# 빌드 정보 출력
echo "📦 빌드 정보"
echo "  버전:      $VERSION"
echo "  빌드 시간:  $BUILD_TIME"
echo "  Git 커밋:  $GIT_COMMIT"
echo "  Go 버전:   $GO_VERSION"
echo ""

# 빌드
echo "🔨 빌드 시작..."
LDFLAGS="-X 'backoffice/config.Version=$VERSION' -X 'backoffice/config.BuildTime=$BUILD_TIME' -X 'backoffice/config.GitCommit=$GIT_COMMIT' -X 'backoffice/config.GoVersion=$GO_VERSION'"

go build -ldflags "$LDFLAGS" -o culcom

echo ""
echo "✅ 빌드 성공!"
echo ""
echo "📄 실행 파일: culcom"
echo ""

# 파일 크기 확인
FILE_SIZE=$(du -h culcom | cut -f1)
echo "📊 파일 크기: $FILE_SIZE"
echo ""
