# 빌드 가이드 (Version Management)

애플리케이션의 버전 정보를 관리하고 빌드 시 주입하는 방법을 설명합니다.

---

## 📋 버전 정보 구조

버전 정보는 다음과 같이 관리됩니다:

```go
type VersionInfo struct {
    Version     string    // 버전 번호 (예: 1.1.0)
    BuildTime   string    // 빌드 시간
    GoVersion   string    // Go 버전
    GitCommit   string    // Git 커밋 해시
    Environment string    // 환경 (dev, staging, prod)
}
```

---

## 🔧 버전 정보 설정 방법

### 1. VERSION 파일 사용 (기본)

프로젝트 루트에 `VERSION` 파일을 생성하고 버전 번호를 입력합니다:

```bash
echo "1.1.0" > VERSION
```

애플리케이션 시작 시 자동으로 이 파일을 읽어서 버전 정보를 설정합니다.

### 2. 빌드 시 버전 정보 주입 (권장)

Go의 `-ldflags` 옵션을 사용하여 빌드 시점에 버전 정보를 주입할 수 있습니다:

```powershell
# PowerShell
$VERSION = Get-Content VERSION
$BUILD_TIME = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
$GIT_COMMIT = git rev-parse --short HEAD
$GO_VERSION = go version

go build -ldflags `
  "-X 'backoffice/config.Version=$VERSION' `
   -X 'backoffice/config.BuildTime=$BUILD_TIME' `
   -X 'backoffice/config.GitCommit=$GIT_COMMIT' `
   -X 'backoffice/config.GoVersion=$GO_VERSION'" `
  -o culcom.exe
```

```bash
# Linux/Mac
VERSION=$(cat VERSION)
BUILD_TIME=$(date '+%Y-%m-%d %H:%M:%S')
GIT_COMMIT=$(git rev-parse --short HEAD)
GO_VERSION=$(go version)

go build -ldflags \
  "-X 'backoffice/config.Version=$VERSION' \
   -X 'backoffice/config.BuildTime=$BUILD_TIME' \
   -X 'backoffice/config.GitCommit=$GIT_COMMIT' \
   -X 'backoffice/config.GoVersion=$GO_VERSION'" \
  -o culcom
```

---

## 📦 빌드 스크립트

### PowerShell (build.ps1)

```powershell
# build.ps1
$ErrorActionPreference = "Stop"

Write-Host "=== Culcom 빌드 스크립트 ===" -ForegroundColor Cyan

# 버전 정보 수집
$VERSION = Get-Content VERSION -ErrorAction Stop
$BUILD_TIME = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
$GIT_COMMIT = git rev-parse --short HEAD 2>$null
if (-not $GIT_COMMIT) {
    $GIT_COMMIT = "unknown"
}
$GO_VERSION = go version

Write-Host "버전: $VERSION" -ForegroundColor Green
Write-Host "빌드 시간: $BUILD_TIME" -ForegroundColor Green
Write-Host "Git 커밋: $GIT_COMMIT" -ForegroundColor Green
Write-Host "Go 버전: $GO_VERSION" -ForegroundColor Green

# 빌드
Write-Host "`n빌드 시작..." -ForegroundColor Cyan
go build -ldflags `
  "-X 'backoffice/config.Version=$VERSION' `
   -X 'backoffice/config.BuildTime=$BUILD_TIME' `
   -X 'backoffice/config.GitCommit=$GIT_COMMIT' `
   -X 'backoffice/config.GoVersion=$GO_VERSION'" `
  -o culcom.exe

if ($LASTEXITCODE -eq 0) {
    Write-Host "`n✅ 빌드 성공!" -ForegroundColor Green
    Write-Host "실행 파일: culcom.exe" -ForegroundColor Yellow
} else {
    Write-Host "`n❌ 빌드 실패!" -ForegroundColor Red
    exit 1
}
```

**사용 방법:**
```powershell
.\build.ps1
```

### Bash (build.sh)

```bash
#!/bin/bash
# build.sh

set -e

echo "=== Culcom 빌드 스크립트 ==="

# 버전 정보 수집
VERSION=$(cat VERSION)
BUILD_TIME=$(date '+%Y-%m-%d %H:%M:%S')
GIT_COMMIT=$(git rev-parse --short HEAD 2>/dev/null || echo "unknown")
GO_VERSION=$(go version)

echo "버전: $VERSION"
echo "빌드 시간: $BUILD_TIME"
echo "Git 커밋: $GIT_COMMIT"
echo "Go 버전: $GO_VERSION"

# 빌드
echo ""
echo "빌드 시작..."
go build -ldflags \
  "-X 'backoffice/config.Version=$VERSION' \
   -X 'backoffice/config.BuildTime=$BUILD_TIME' \
   -X 'backoffice/config.GitCommit=$GIT_COMMIT' \
   -X 'backoffice/config.GoVersion=$GO_VERSION'" \
  -o culcom

echo ""
echo "✅ 빌드 성공!"
echo "실행 파일: culcom"
```

**사용 방법:**
```bash
chmod +x build.sh
./build.sh
```

---

## 🚀 실행 시 버전 확인

### 1. 콘솔 로그

애플리케이션 시작 시 버전 정보가 자동으로 출력됩니다:

```
===========================================
Version: 1.1.0
Build Time: 2026-02-13 14:30:00
Git Commit: a1b2c3d
Go Version: go version go1.21.0 windows/amd64
Environment: prod
===========================================
```

### 2. API 엔드포인트

#### `/api/version` - 버전 정보 조회

**요청:**
```bash
curl http://localhost:8080/api/version
```

**응답:**
```json
{
  "version": "1.1.0",
  "build_time": "2026-02-13 14:30:00",
  "go_version": "go version go1.21.0 windows/amd64",
  "git_commit": "a1b2c3d",
  "environment": "prod"
}
```

#### `/health` - 헬스 체크

**요청:**
```bash
curl http://localhost:8080/health
```

**응답:**
```json
{
  "status": "ok",
  "version": "1.1.0",
  "environment": "prod",
  "timestamp": "2026-02-13 14:30:00"
}
```

---

## 🔄 버전 업데이트 프로세스

### 1. VERSION 파일 업데이트

```bash
# 새 버전 번호 작성
echo "1.2.0" > VERSION
```

### 2. 릴리스 노트 작성

```bash
# patches 폴더에 릴리스 노트 생성
cp patches/RELEASE_NOTES_v1.1.0.md patches/RELEASE_NOTES_v1.2.0.md
# 새 버전의 변경사항으로 업데이트
```

### 3. Git 커밋 및 태그

```bash
git add VERSION patches/
git commit -m "chore: bump version to 1.2.0"
git tag -a v1.2.0 -m "Release v1.2.0"
git push origin main
git push origin v1.2.0
```

### 4. 빌드 및 배포

```powershell
# 빌드
.\build.ps1

# 또는 직접 빌드
$VERSION = Get-Content VERSION
go build -ldflags "-X 'backoffice/config.Version=$VERSION' ..." -o culcom.exe
```

---

## 📋 Semantic Versioning (SemVer)

버전 번호는 **MAJOR.MINOR.PATCH** 형식을 따릅니다:

- **MAJOR (X.0.0)**: Breaking Changes - 하위 호환성이 깨지는 변경
- **MINOR (0.X.0)**: 새로운 기능 추가 (하위 호환성 유지)
- **PATCH (0.0.X)**: 버그 수정 및 작은 개선

**예시:**
- `1.0.0` → `1.1.0`: 새 기능 추가
- `1.1.0` → `1.1.1`: 버그 수정
- `1.9.5` → `2.0.0`: Breaking Change

---

## 🛠️ 개발 환경

개발 중에는 VERSION 파일만 업데이트하면 자동으로 해당 버전이 사용됩니다.

빌드 정보가 주입되지 않은 경우:
- `Version`: VERSION 파일의 내용 (없으면 "dev")
- `BuildTime`: 애플리케이션 시작 시간
- `GitCommit`: 빈 문자열
- `GoVersion`: "unknown"

---

## ⚙️ CI/CD 통합

### GitHub Actions 예시

```yaml
name: Build and Release

on:
  push:
    tags:
      - 'v*'

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Set up Go
        uses: actions/setup-go@v4
        with:
          go-version: '1.21'
      
      - name: Build
        run: |
          VERSION=$(cat VERSION)
          BUILD_TIME=$(date '+%Y-%m-%d %H:%M:%S')
          GIT_COMMIT=$(git rev-parse --short HEAD)
          GO_VERSION=$(go version)
          
          go build -ldflags \
            "-X 'backoffice/config.Version=$VERSION' \
             -X 'backoffice/config.BuildTime=$BUILD_TIME' \
             -X 'backoffice/config.GitCommit=$GIT_COMMIT' \
             -X 'backoffice/config.GoVersion=$GO_VERSION'" \
            -o culcom
      
      - name: Create Release
        uses: actions/create-release@v1
        with:
          tag_name: ${{ github.ref }}
          release_name: Release ${{ github.ref }}
```

---

## 📞 문의

빌드나 버전 관리에 대한 질문이 있으시면 개발팀에 문의해주세요.
