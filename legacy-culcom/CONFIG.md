# 환경별 설정 가이드

## 환경 구분

애플리케이션은 3가지 환경을 지원합니다:
- **dev** (개발)
- **staging** (스테이징)
- **prod** (운영)

## 설정 방법

### 방법 1: APP_ENV 환경변수 사용 (권장)

```bash
# Windows
set APP_ENV=dev
go run main.go

# Linux/Mac
export APP_ENV=dev
go run main.go

# 또는 한 줄로
APP_ENV=dev go run main.go
```

### 방법 2: 환경별 .env 파일 사용

환경별 파일을 준비합니다:
- `.env.dev` - 개발 환경
- `.env.staging` - 스테이징 환경
- `.env.prod` - 운영 환경

**godotenv 라이브러리 사용 시:**
```bash
# 설치
go get github.com/joho/godotenv

# config/config.go에서 주석 해제하고 사용
```

**사용 예:**
```bash
# 개발 환경으로 실행
APP_ENV=dev go run main.go  # .env.dev 자동 로드

# 운영 환경으로 실행
APP_ENV=prod go run main.go  # .env.prod 자동 로드
```

## 코드에서 환경 확인

```go
import "backoffice/config"

func someHandler() {
    // 현재 환경 확인
    env := config.GetEnvironment()
    
    // 개발 환경 체크
    if config.IsDevelopment() {
        // 개발 환경에서만 실행할 코드
    }
    
    // 운영 환경 체크
    if config.IsProduction() {
        // 운영 환경에서만 실행할 코드
    }
    
    // 전체 설정 가져오기
    cfg := config.GetConfig()
    fmt.Println(cfg.DB.Host)
    fmt.Println(cfg.Server.Port)
}
```

## main.go 수정 예시

```go
import (
    "backoffice/config"
    "backoffice/database"
)

func main() {
    // 설정 초기화
    if err := config.Init(); err != nil {
        log.Fatal("설정 초기화 실패:", err)
    }
    
    cfg := config.GetConfig()
    log.Printf("환경: %s", cfg.Env)
    log.Printf("디버그 모드: %v", cfg.Server.Debug)
    
    // DB 초기화
    if err := database.Init(); err != nil {
        log.Fatal("DB 초기화 실패:", err)
    }
    defer database.Close()
    
    // 서버 시작
    port := ":" + cfg.Server.Port
    log.Printf("서버 시작: http://localhost%s", port)
    http.ListenAndServe(port, nil)
}
```

## 환경별 설정 차이점

### 개발 환경 (.env.dev)
- 로컬 DB 사용
- DEBUG=true
- LOG_LEVEL=debug
- 상세한 에러 메시지

### 스테이징 환경 (.env.staging)
- 스테이징 서버 DB
- DEBUG=false
- LOG_LEVEL=info
- 운영과 유사한 환경

### 운영 환경 (.env.prod)
- 운영 서버 DB
- DEBUG=false
- LOG_LEVEL=error
- 최소한의 로그, 보안 강화

## 배포 시 주의사항

1. `.env` 파일들은 `.gitignore`에 추가
2. 운영 환경의 비밀번호는 별도 관리
3. 환경변수는 배포 도구나 컨테이너 설정에서 주입
4. 민감 정보는 환경변수로만 관리 (코드에 하드코딩 금지)
