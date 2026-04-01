# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Culcom은 학원/복합시설 관리 백오피스 시스템. 기존 Go 모놀리스(`legacy-culcom/`)에서 Spring Boot + Next.js로 마이그레이션 중.

## Repository Structure

```
culcom/
├── backend/         # Spring Boot 3.4.4 (Java 17) REST API — port 8081
├── frontend/        # Next.js 14 App Router (TypeScript) — port 3000
├── legacy-culcom/   # 기존 Go 앱 (마이그레이션 원본, 참고용)
└── API_SPEC.md      # Go 기반 전체 API 명세서
```

## Build & Run

### Backend

```bash
cd backend
./gradlew build              # 빌드
./gradlew bootRun            # 실행 (기본 profile: local, H2 인메모리 DB)
./gradlew bootRun --args='--spring.profiles.active=stg'   # staging (MySQL)
./gradlew test               # 전체 테스트
./gradlew test --tests "com.culcom.SomeTest.methodName"   # 단일 테스트
```

### Frontend

```bash
cd frontend
npm install
npm run dev                  # 개발서버 (port 3000, /api/* → localhost:8081로 프록시)
npm run build && npm start   # 프로덕션
npm run lint                 # ESLint
```

## Architecture

### Backend (`backend/src/main/java/com/culcom/`)

- **Spring Boot + Spring Security** — 세션 기반 인증 (Spring Session JDBC)
- **Profiles**: `local` (H2, ddl-auto: create), `stg`/`prod` (MySQL, ddl-auto: validate)
- **local 환경**: 매 실행 시 DB 초기화, `root/root` 계정 자동 생성 (`LocalDataInitializer`)
- **Swagger UI**: `/swagger-ui.html` (Security에서 permitAll)
- **AOP 로깅**: `ControllerResponseLogAspect`가 모든 컨트롤러 요청/응답을 자동 로깅
- **Controller 개발 시, Entity를 어떠한 형태로든 request, response에 사용하지 않고, DTO를 통해 간접적으로 사용토록 한다

**패키지 구조 (도메인별 하위 패키지):**
- `controller/{domain}/` — REST 컨트롤러 (auth, branch, complex, customer, message, notice). 비즈니스 로직이 컨트롤러에 직접 구현됨
- `entity/` — JPA 엔티티 + `enums/` (한글 enum 값: 대기/승인/반려, 출석/결석/지각 등)
- `repository/` — Spring Data JPA 리포지토리
- `service/` — 현재 AuthService만 존재 (세션 관리 + 인증)
- `dto/{domain}/` — 도메인별 요청/응답 DTO + `ApiResponse<T>` (공통 응답 래퍼)
- `config/` — SecurityConfig, LocalDataInitializer, ControllerResponseLogAspect

**핵심 패턴:**
- 모든 API 응답은 `ApiResponse<T>` 래퍼 사용 (`success`, `message`, `data`). 정적 팩토리: `ApiResponse.ok(data)`, `ApiResponse.error(message)`
- 대부분의 엔드포인트가 `AuthService.getSessionBranchSeq(session)`으로 현재 지점 기준 데이터 필터링
- 인증 상태는 HttpSession에 저장: `userSeq`, `userId`, `role`, `branchSeqs`, `selectedBranchSeq`
- 엔티티 PK 필드명은 `seq` (sequence), `@GeneratedValue(IDENTITY)` 사용
- 페이징 API는 Spring Data `Page<T>` + `PageRequest.of(page, size, Sort)` 패턴 사용

**인증 흐름:**
1. `POST /api/auth/login` → `AuthService.authenticate()` → 세션 생성 + 첫 번째 지점 자동 선택
2. `POST /api/auth/branch/{branchSeq}` → 지점 전환 (ROOT는 전체, 그 외는 할당된 지점만)
3. 이후 API 호출 시 `session.getAttribute("selectedBranchSeq")`로 데이터 범위 결정

### Frontend (`frontend/`)

- `src/lib/api.ts` — 모든 API 호출 함수 + 타입 정의가 한 파일에 집중
- `next.config.js`에서 `/api/*` → `http://localhost:8081/api/*` 리버스 프록시
- 별도 frontend/CLAUDE.md 참조

### 데이터 흐름

Frontend (port 3000) → Next.js rewrite → Backend (port 8081) → H2/MySQL

## Conventions

- UI 텍스트, API 메시지, enum 값 모두 한글
- 비밀번호는 현재 평문 비교 (`AuthService.authenticate()`), SecurityConfig에 BCryptPasswordEncoder 빈은 등록됨
- 엔티티 PK 필드명은 `seq` (sequence)
- 새 컨트롤러/DTO 추가 시 도메인별 하위 패키지에 배치 (예: `controller/complex/`, `dto/auth/`)
