# Backend Architecture

## 기술 스택

- **Spring Boot 3.4.4** (Java 17) — port 8081
- **JPA (Hibernate)** — CUD + 단순 조회
- **MyBatis** — 복잡한 검색/통계 쿼리
- **Spring Security** — 세션 기반 인증
- **H2** (local) / **MySQL** (stg, prod)

## 아키텍처 패턴

```
Client → Controller → Repository (JPA)     ← CUD, 단건 조회
                    → QueryMapper (MyBatis) ← 검색, 페이징, 통계
```

**CQRS 스타일 분리:**
- `XxxController` — CUD + 단건 조회 (JPA Repository)
- `XxxQueryController` — 목록 검색 + 페이징 (MyBatis Mapper)

**공통 응답:** 모든 API는 `ApiResponse<T>` 래퍼 (`success`, `message`, `data`)

---

## 패키지 구조

```
com.culcom/
├── config/                    # 설정 및 인프라
│   ├── security/              #   CustomUserPrincipal
│   ├── SecurityConfig         #   Spring Security 필터 체인
│   ├── GlobalExceptionHandler #   공통 예외 처리
│   ├── ControllerResponseLogAspect  # AOP 요청/응답 로깅
│   └── LocalDataInitializer   #   local 프로필 초기 데이터
│
├── controller/                # REST 컨트롤러
│   ├── auth/                  #   인증, 사용자 관리
│   ├── board/                 #   공개 게시판
│   ├── branch/                #   지점 관리
│   ├── calendar/              #   캘린더
│   ├── complex/               #   복합시설 (회원, 수업, 출석, 연기, 환불)
│   │   ├── attendance/
│   │   ├── classes/
│   │   └── timeslot/
│   ├── customer/              #   고객(학원) 관리
│   ├── dashboard/             #   대시보드
│   ├── external/              #   외부 서비스 (구글 캘린더 등)
│   ├── integration/           #   3rd-party 연동 (SMS 등)
│   ├── kakao/                 #   카카오 OAuth
│   ├── kakaosync/             #   카카오 싱크
│   ├── message/               #   메시지 템플릿
│   ├── notice/                #   공지사항
│   ├── publicapi/             #   공개 API (연기 요청 등)
│   ├── settings/              #   설정
│   └── webhook/               #   웹훅 로그 조회
│
├── mapper/                    # MyBatis Mapper 인터페이스
├── repository/                # JPA Repository 인터페이스
├── service/                   # 비즈니스 서비스
├── dto/                       # 요청/응답 DTO (도메인별 하위 패키지)
├── entity/                    # JPA 엔티티 (도메인별 하위 패키지)
│   └── enums/                 #   한글 enum (대기/승인/반려, 출석/결석 등)
├── exception/                 # 커스텀 예외
└── util/                      # 유틸리티
```

---

## 컨트롤러 엔드포인트

### 인증/사용자

| 경로 | 컨트롤러 | 메서드 | 설명 |
|------|----------|--------|------|
| `POST /api/auth/login` | AuthController | login | 로그인 (세션 생성) |
| `GET /api/auth/me` | AuthController | me | 현재 세션 정보 |
| `POST /api/auth/branch/{seq}` | AuthController | selectBranch | 지점 전환 |
| `GET /api/users` | UserController | list | 사용자 목록 |
| `POST /api/users` | UserController | create | 사용자 생성 |
| `PUT /api/users/{seq}` | UserController | update | 사용자 수정 |
| `DELETE /api/users/{seq}` | UserController | delete | 사용자 삭제 |

### 지점

| 경로 | 컨트롤러 | 메서드 | 설명 |
|------|----------|--------|------|
| `GET /api/branches` | BranchController | list | 지점 목록 |
| `GET /api/branches/{seq}` | BranchController | get | 지점 상세 |
| `POST /api/branches` | BranchController | create | 지점 생성 |
| `PUT /api/branches/{seq}` | BranchController | update | 지점 수정 |
| `DELETE /api/branches/{seq}` | BranchController | delete | 지점 삭제 |

### 고객 (학원)

| 경로 | 컨트롤러 | 타입 | 설명 |
|------|----------|------|------|
| `GET /api/customers` | CustomerQueryController | **Query** | 고객 검색 (키워드, 상태 필터, 페이징) |
| `GET /api/customers/{seq}` | CustomerController | Command | 고객 상세 |
| `POST /api/customers` | CustomerController | Command | 고객 생성 |
| `PUT /api/customers/{seq}` | CustomerController | Command | 고객 수정 |
| `DELETE /api/customers/{seq}` | CustomerController | Command | 고객 삭제 |
| `POST /api/customers/process-call` | CustomerController | Command | 통화 처리 |
| `POST /api/customers/reservation` | CustomerController | Command | 예약 생성 |
| `POST /api/customers/comment` | CustomerController | Command | 코멘트 수정 |

### 공지사항

| 경로 | 컨트롤러 | 타입 | 설명 |
|------|----------|------|------|
| `GET /api/notices` | NoticeQueryController | **Query** | 공지 검색 (카테고리, 키워드, 페이징) |
| `GET /api/notices/{seq}` | NoticeController | Command | 공지 상세 (조회수 증가) |
| `POST /api/notices` | NoticeController | Command | 공지 생성 |
| `PUT /api/notices/{seq}` | NoticeController | Command | 공지 수정 |
| `DELETE /api/notices/{seq}` | NoticeController | Command | 공지 삭제 |

### 공개 게시판

| 경로 | 컨트롤러 | 타입 | 설명 |
|------|----------|------|------|
| `GET /api/public/board/notices` | BoardQueryController | **Query** | 공개 공지 검색 |
| `GET /api/public/board/notices/{seq}` | BoardController | Command | 공지 상세 |
| `GET /api/public/board/session` | BoardController | Command | 세션 정보 |
| `POST /api/public/board/logout` | BoardController | Command | 로그아웃 |

### 복합시설 — 회원

| 경로 | 컨트롤러 | 타입 | 설명 |
|------|----------|------|------|
| `GET /api/complex/members` | ComplexMemberQueryController | **Query** | 회원 검색 |
| `GET /api/complex/members/{seq}` | ComplexMemberController | Command | 회원 상세 |
| `GET /api/complex/members/{seq}/memberships` | ComplexMemberController | Command | 회원권 목록 |
| `POST /api/complex/members` | ComplexMemberController | Command | 회원 생성 |
| `PUT /api/complex/members/{seq}` | ComplexMemberController | Command | 회원 수정 |
| `DELETE /api/complex/members/{seq}` | ComplexMemberController | Command | 회원 삭제 |

### 복합시설 — 수업

| 경로 | 컨트롤러 | 타입 | 설명 |
|------|----------|------|------|
| `GET /api/complex/classes` | ComplexClassQueryController | **Query** | 수업 검색 |
| `GET /api/complex/classes/{seq}` | ComplexClassController | Command | 수업 상세 |
| `POST /api/complex/classes` | ComplexClassController | Command | 수업 생성 |
| `PUT /api/complex/classes/{seq}` | ComplexClassController | Command | 수업 수정 |
| `DELETE /api/complex/classes/{seq}` | ComplexClassController | Command | 수업 삭제 |

### 복합시설 — 출석

| 경로 | 컨트롤러 | 설명 |
|------|----------|------|
| `GET /api/complex/attendance` | AttendanceController | 수업별 출석 목록 |
| `GET /api/complex/attendance/view` | AttendanceController | 출석 통합 뷰 |
| `GET /api/complex/attendance/view/detail` | AttendanceController | 시간대별 상세 |
| `POST /api/complex/attendance` | AttendanceController | 출석 기록 |
| `PUT /api/complex/attendance/{seq}` | AttendanceController | 출석 수정 |
| `POST /api/complex/attendance/bulk` | AttendanceController | 일괄 출석 처리 |

### 복합시설 — 연기/환불

| 경로 | 컨트롤러 | 타입 | 설명 |
|------|----------|------|------|
| `GET /api/complex/postponements` | PostponementQueryController | **Query** | 연기 요청 검색 |
| `POST /api/complex/postponements` | PostponementController | Command | 연기 요청 생성 |
| `PUT /api/complex/postponements/{seq}/status` | PostponementController | Command | 승인/반려 |
| `GET /api/complex/refunds` | RefundQueryController | **Query** | 환불 요청 검색 |
| `POST /api/complex/refunds` | RefundController | Command | 환불 요청 생성 |
| `PUT /api/complex/refunds/{seq}/status` | RefundController | Command | 승인/반려 |

### 대시보드

| 경로 | 컨트롤러 | 타입 | 설명 |
|------|----------|------|------|
| `GET /api/dashboard` | DashboardController | **Query** | 대시보드 통계 |
| `GET /api/dashboard/caller-stats` | DashboardController | **Query** | 콜러별 통계 |

### 웹훅

| 경로 | 컨트롤러 | 타입 | 설명 |
|------|----------|------|------|
| `GET /api/webhooks` | WebhookConfigController | Command | 웹훅 목록 |
| `POST /api/webhooks` | WebhookConfigController | Command | 웹훅 생성 |
| `PUT /api/webhooks/{seq}` | WebhookConfigController | Command | 웹훅 수정 |
| `DELETE /api/webhooks/{seq}` | WebhookConfigController | Command | 웹훅 삭제 |
| `GET /api/webhooks/logs` | WebhookLogQueryController | **Query** | 웹훅 로그 검색 |

---

## MyBatis Mapper

| Mapper | XML | 용도 |
|--------|-----|------|
| CustomerQueryMapper | CustomerQueryMapper.xml | 고객 검색 (이름/전화번호/상태 필터) |
| NoticeQueryMapper | NoticeQueryMapper.xml | 공지 검색 (관리자용 + 공개용) |
| PostponementQueryMapper | PostponementQueryMapper.xml | 연기 요청 검색 |
| RefundQueryMapper | RefundQueryMapper.xml | 환불 요청 검색 |
| ComplexMemberQueryMapper | ComplexMemberQueryMapper.xml | 회원 검색 |
| ComplexClassQueryMapper | ComplexClassQueryMapper.xml | 수업 검색 (JOIN: 시간대, 강사) |
| WebhookLogQueryMapper | WebhookLogQueryMapper.xml | 웹훅 로그 검색 |
| DashboardMapper | DashboardMapper.xml | 대시보드 통계/분석 |

---

## 예외 처리

`GlobalExceptionHandler`에서 모든 API 예외를 공통 처리:

| 예외 | HTTP | 로그 레벨 | 응답 메시지 |
|------|------|-----------|------------|
| `IllegalArgumentException` | 400 | info | 잘못된 요청 값 (Enum 파싱 실패, 날짜 형식 등) |
| `HttpMessageNotReadableException` | 400 | info | 요청 형식 오류 |
| `MethodArgumentNotValidException` | 400 | info | @Valid 검증 실패 |
| `MissingServletRequestParameterException` | 400 | info | 필수 파라미터 누락 |
| `EntityNotFoundException` | 404 | info | 엔티티 조회 실패 |
| `HttpRequestMethodNotSupportedException` | 405 | info | 잘못된 HTTP 메서드 |
| `DataIntegrityViolationException` | 409 | warn | 유니크 제약 조건 위반 |
| `BadSqlGrammarException` / `MyBatisSystemException` | 500 | error | MyBatis SQL 실행 실패 |
| `Exception` (catch-all) | 500 | error | 기타 서버 오류 |

---

## 인증 흐름

```
POST /api/auth/login → 세션 생성 → 첫 번째 지점 자동 선택
POST /api/auth/branch/{seq} → 지점 전환
이후 모든 API → session.selectedBranchSeq 기준 데이터 필터링
```

**역할:**
- `ROOT` — 전체 지점 접근
- `BRANCH_MANAGER` — 할당된 지점만
- `STAFF` — 할당된 지점만

**공개 API:** `/api/public/**` — 인증 불필요

---

## 엔티티/테이블

| 도메인 | 엔티티 | 테이블 |
|--------|--------|--------|
| 인증 | UserInfo | `user_info` |
| 지점 | Branch | `branches` |
| 고객 | Customer | `customers` |
| 예약 | ReservationInfo | `reservation_info` |
| 예약 | CallerSelectionHistory | `caller_selection_history` |
| 공지 | Notice | `notices` |
| 회원 | ComplexMember | `complex_members` |
| 회원권 | ComplexMemberMembership | `complex_member_memberships` |
| 수업 | ComplexClass | `complex_classes` |
| 시간대 | ClassTimeSlot | `class_time_slots` |
| 출석 | ComplexMemberAttendance | `complex_member_attendances` |
| 강사 | ComplexStaff | `complex_staff` |
| 연기 | ComplexPostponementRequest | `complex_postponement_requests` |
| 환불 | ComplexRefundRequest | `complex_refund_requests` |
| 웹훅 | WebhookConfig / WebhookLog | `webhook_configs` / `webhook_logs` |
| 메시지 | MessageTemplate / Placeholder | `message_templates` / `message_placeholders` |
| 설문 | SurveyTemplate / Section / Question / Option | `survey_templates` / `_sections` / `_questions` / `_options` |
| 연동 | ThirdPartyService / MymunjaConfigInfo | `third_party_services` / `mymunja_config_info` |

---

## 서비스

| 서비스 | 역할 |
|--------|------|
| AuthService | 인증, 세션 관리, 지점 권한 |
| BoardSessionService | 공개 게시판 쿠키 기반 세션 |
| KakaoOAuthService | 카카오 OAuth 인증 |
| SmsService | SMS/LMS 발송 (마이문자 연동) |
| WebhookLambdaService | AWS Lambda 웹훅 실행 |
