# Culcom Backoffice API 명세서

> 기존 Go 웹 애플리케이션의 전체 라우트 및 API 명세  
> 기준: `main.go` 라우트 등록 및 `handlers/` 소스코드

---

## 목차

1. [인증](#1-인증)
2. [대시보드](#2-대시보드)
3. [고객 관리](#3-고객-관리)
4. [지점 관리](#4-지점-관리)
5. [연동 서비스](#5-연동-서비스)
6. [메시지 템플릿](#6-메시지-템플릿)
7. [공지사항](#7-공지사항)
8. [설정](#8-설정)
9. [SMS 서비스](#9-sms-서비스)
10. [수업 관리 (Complex)](#10-수업-관리)
11. [회원 관리 (Complex)](#11-회원-관리)
12. [스태프 관리 (Complex)](#12-스태프-관리)
13. [출석 관리](#13-출석-관리)
14. [멤버십](#14-멤버십)
15. [수업 시간대](#15-수업-시간대)
16. [연기 요청 관리 (Admin)](#16-연기-요청-관리-admin)
17. [환불 요청 관리 (Admin)](#17-환불-요청-관리-admin)
18. [설문 관리 (Admin)](#18-설문-관리-admin)
19. [공개 API - 외부 고객 등록](#19-공개-api---외부-고객-등록)
20. [공개 - 멤버십 조회](#20-공개---멤버십-조회)
21. [공개 - 연기 요청](#21-공개---연기-요청)
22. [공개 - 환불 요청](#22-공개---환불-요청)
23. [공개 - 상담/설문](#23-공개---상담설문)
24. [공개 - 게시판 (Board)](#24-공개---게시판)
25. [공개 - 카카오 OAuth](#25-공개---카카오-oauth)
26. [기타](#26-기타)

---

## 인증 방식

- **세션 기반 인증** (Gorilla Sessions, Cookie Store)
- 세션 이름: `user-session` (관리자), `board-session` (공개 게시판 카카오 사용자)
- 세션 저장 값: `authenticated`, `user_id`, `user_seq`, `selectedBranch`
- 미들웨어: `RequireAuthRecover` → 인증 확인 + 패닉 복구, `InjectBranchData` → 지점 컨텍스트 주입

---

## 1. 인증

### `POST /login` — 로그인
- **핸들러:** `login.LoginHandler`
- **인증:** 불필요
- **요청 (Form):**

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| `username` | string | Y | 사용자 ID |
| `password` | string | Y | 비밀번호 |

- **성공:** 세션 생성 후 `302 → /dashboard`
- **실패:** `302 → /login?error=login_failed`

### `GET /login` — 로그인 페이지
- **핸들러:** `login.LoginHandler`
- **인증:** 불필요
- **응답:** HTML (`auth/login.html`)
- **Query Params:** `error` (optional, 에러 메시지 표시)

### `GET|POST /logout` — 로그아웃
- **핸들러:** `login.LogoutHandler`
- **인증:** 필요
- **응답:** 세션 무효화 후 `302 → /login`

---

## 2. 대시보드

### `GET /dashboard` — 대시보드 페이지
- **핸들러:** `home.Handler`
- **인증:** 필요 + 지점 컨텍스트
- **응답:** HTML (`dashboard/home.html`)
- **데이터:** 오늘 총 고객 수, 일별 고객 통계, SMS/LMS 잔여 건수

### `GET /api/dashboard/caller-stats` — CALLER 통계 API
- **핸들러:** `home.GetCallerStatsAPI`
- **인증:** 필요
- **요청 (Query):**

| 필드 | 타입 | 필수 | 기본값 | 설명 |
|------|------|------|--------|------|
| `period` | string | N | `day` | `day` / `week` / `month` |

- **응답 (JSON):**
```json
[
  {
    "caller": "A",
    "totalCount": 10,
    "confirmedCount": 5,
    "confirmationRate": 50.0
  }
]
```

---

## 3. 고객 관리

### `GET /customers` — 고객 목록 페이지
- **핸들러:** `customers.Handler`
- **인증:** 필요 + 지점 컨텍스트
- **요청 (Query):**

| 필드 | 타입 | 필수 | 기본값 | 설명 |
|------|------|------|--------|------|
| `page` | int | N | 1 | 페이지 번호 |
| `filter` | string | N | `new` | `new` (신규/진행중), `all` (전체) |
| `search_type` | string | N | - | `name`, `phone`, `register_date`, `contact_date`, `reservation_date` |
| `search_keyword` | string | N | - | 검색어 |

- **응답:** HTML (`customers/list.html`) + 페이지네이션

### `GET /customers/add` — 고객 추가 폼
- **핸들러:** `customers.AddHandler`
- **인증:** 필요 + 지점 컨텍스트
- **응답:** HTML (`customers/add.html`)

### `POST /customers/add` — 고객 추가 처리
- **핸들러:** `customers.AddHandler`
- **인증:** 필요 + 지점 컨텍스트
- **요청 (Form):**

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| `name` | string | Y | 고객명 |
| `phone_number` | string | Y | 전화번호 |
| `comment` | string | N | 비고 |

- **성공:** `302 → /customers` (flash: 성공 메시지)
- **실패:** `302 → /error`

### `POST /api/customers/comment` — 고객 코멘트 수정
- **핸들러:** `customers.UpdateCommentHandler`
- **인증:** 필요
- **요청 (Form):**

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| `customer_seq` | string | Y | 고객 PK |
| `comment` | string | Y | 코멘트 내용 |

- **응답 (JSON):**
```json
{ "success": true, "comment": "수정된 코멘트" }
```

### `POST /api/customers/process-call` — 통화 처리
- **핸들러:** `customers.ProcessCallHandler`
- **인증:** 필요
- **요청 (Form):**

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| `customer_seq` | string | Y | 고객 PK |
| `caller` | string | Y | 콜러 구분 (A~Z) |

- **응답 (JSON):**
```json
{
  "success": true,
  "call_count": 5,
  "last_update_date": "2026-04-01 14:30:00",
  "message": "해당 고객에 대한 통화 횟수 증가가 완료되었습니다"
}
```

### `POST /api/customers/reservation` — 예약 생성
- **핸들러:** `customers.CreateReservationHandler`
- **인증:** 필요
- **요청 (Form):**

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| `customer_seq` | string | Y | 고객 PK |
| `caller` | string | Y | 콜러 구분 |
| `interview_date` | string | Y | 상담 일시 (형식: `2006-01-02T15:04:05`) |

- **응답 (JSON):**
```json
{
  "success": true,
  "reservation_id": 123,
  "customer_seq": 456,
  "interview_date": "2026-04-01 14:30:05",
  "message": "예약이 생성되었습니다"
}
```

### `POST /api/customers/update-name` — 고객명 수정
- **핸들러:** `customers.UpdateCustomerNameHandler`
- **인증:** 필요
- **요청 (Form):**

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| `customer_seq` | string | Y | 고객 PK |
| `name` | string | Y | 변경할 이름 |

- **응답 (JSON):** `{ "success": true }`

### `POST /api/customers/delete` — 고객 삭제
- **핸들러:** `customers.DeleteCustomerHandler`
- **인증:** 필요
- **요청 (Form):**

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| `customer_seq` | string | Y | 고객 PK |

- **응답 (JSON):** `{ "success": true, "message": "고객이 삭제되었습니다" }`
- **참고:** 카카오 사용자인 경우 자동 연동 해제

### `POST /api/customers/mark-no-phone-interview` — 전화상안함 처리
- **핸들러:** `customers.MarkNoPhoneInterviewHandler`
- **인증:** 필요
- **요청 (Form):**

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| `customer_seq` | string | Y | 고객 PK |
| `caller` | string | Y | 콜러 구분 |

- **응답 (JSON):** `{ "success": true, "message": "전화상안함으로 처리되었습니다" }`

---

## 4. 지점 관리

### `GET /branches` — 지점 목록
- **핸들러:** `branches.Handler`
- **인증:** 필요 + 지점 컨텍스트
- **요청 (Query):**

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| `page` | int | N | 페이지 번호 |
| `searchType` | string | N | 검색 타입 |
| `searchKeyword` | string | N | 검색어 |

- **응답:** HTML (`branches/list.html`)

### `GET /branches/detail` — 지점 상세
- **핸들러:** `branches.DetailHandler`
- **인증:** 필요 + 지점 컨텍스트
- **요청 (Query):** `id` (int, 지점 PK)
- **응답:** HTML (`branches/detail.html`)

### `GET /branches/add` — 지점 추가 폼
- **핸들러:** `branches.AddHandler`
- **인증:** 필요 + 지점 컨텍스트
- **응답:** HTML (`branches/add.html`)

### `POST /branches/add` — 지점 추가 처리
- **핸들러:** `branches.AddHandler`
- **인증:** 필요 + 지점 컨텍스트
- **요청 (Form):**

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| `name` | string | Y | 지점명 |
| `alias` | string | Y | 별칭 (URL 슬러그) |
| `manager` | string | N | 담당자 |
| `address` | string | N | 주소 |
| `directions` | string | N | 오시는 길 |

- **성공:** `302 → /branches`

### `GET /branches/edit` — 지점 수정 폼
- **핸들러:** `branches.EditHandler`
- **인증:** 필요 + 지점 컨텍스트
- **요청 (Query):** `id` (int)
- **응답:** HTML (`branches/edit.html`)

### `POST /branches/edit` — 지점 수정 처리
- **핸들러:** `branches.EditHandler`
- **인증:** 필요 + 지점 컨텍스트
- **요청 (Form):** `name`, `alias`, `manager`, `address`, `directions`
- **성공:** `302 → /branches`

### `POST /branches/delete` — 지점 삭제
- **핸들러:** `branches.DeleteHandler`
- **인증:** 필요
- **요청 (Query):** `id` (int)
- **응답:** `302 → /branches`

---

## 5. 연동 서비스

### `GET /integrations` — 연동 서비스 목록
- **핸들러:** `integrations.Handler`
- **인증:** 필요 + 지점 컨텍스트
- **응답:** HTML (`integrations/list.html`)

### `GET /integrations/configure` — SMS 설정 페이지
- **핸들러:** `integrations.ConfigureHandler`
- **인증:** 필요 + 지점 컨텍스트
- **요청 (Query):** `id` (string, 서비스 ID)
- **응답:** HTML (`integrations/sms-config.html`)

### `POST /api/sms/config` — SMS 설정 저장
- **핸들러:** `integrations.SMSConfigSaveHandler`
- **인증:** 필요
- **요청 (Form):**

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| `account_id` | string | Y | 마이문자 계정 ID |
| `password` | string | Y | 비밀번호 |
| `sender_phones` | string[] | Y | 발신번호 목록 |
| `is_active` | string | Y | 활성 여부 (`true`/`on`) |

- **응답:** `302 → /integrations`

### `GET /integrations/kakao-sync` — 카카오 싱크 페이지
- **핸들러:** `integrations.KakaoSyncHandler`
- **인증:** 필요 + 지점 컨텍스트
- **응답:** HTML (`integrations/kakao-sync.html`)

### `POST /api/external/sms` — SMS 테스트 발송
- **핸들러:** `integrations.SMSTestHandler`
- **인증:** 필요
- **요청 (JSON):**
```json
{
  "account_id": "string",
  "password": "string",
  "sender_phone": "string",
  "receiver_phone": "string",
  "message": "string"
}
```
- **응답 (JSON):**
```json
{ "success": true, "message": "string", "nums": "string", "cols": "string" }
```

### `POST /api/integrations/activate` — 연동 활성화
- **핸들러:** `integrations.ActivateHandler`
- **인증:** 필요
- **요청 (JSON):** `{ "service_id": "string" }`
- **응답 (JSON):** `{ "success": true, "message": "string" }`

### `POST /api/integrations/disconnect` — 연동 해제
- **핸들러:** `integrations.DisconnectHandler`
- **인증:** 필요
- **요청 (JSON):** `{ "service_id": "string" }`
- **응답 (JSON):** `{ "success": true, "message": "string" }`

### `GET /api/integrations/check-sms` — SMS 연동 확인
- **핸들러:** `integrations.CheckSMSIntegrationHandler`
- **인증:** 필요
- **응답 (JSON):** `{ "success": true/false, "message": "string" }`

### `GET /api/integrations/sms-senders` — SMS 발신번호 조회
- **핸들러:** `integrations.GetSMSSenderNumbersHandler`
- **인증:** 필요
- **응답 (JSON):**
```json
{ "success": true, "isActive": true, "senderPhones": ["010-1234-5678"] }
```

### `POST /api/calendar/create-event` — 구글 캘린더 이벤트 생성
- **핸들러:** `integrations.CreateCalendarEventHandler`
- **인증:** 필요
- **요청 (JSON):**
```json
{
  "customer_name": "string",
  "phone_number": "string",
  "interview_date": "2026-01-02 15:04:05",
  "duration": 60,
  "caller": "A",
  "call_count": 3,
  "commercial_name": "string",
  "ad_source": "string",
  "comment": "string"
}
```
- **응답 (JSON):**
```json
{ "success": true, "message": "캘린더 이벤트가 생성되었습니다", "link": "https://..." }
```

---

## 6. 메시지 템플릿

### `GET /message-templates` — 템플릿 목록
- **핸들러:** `messagetemplates.Handler`
- **인증:** 필요 + 지점 컨텍스트
- **요청 (Query):** `page` (int)
- **응답:** HTML (`message-templates/list.html`)

### `GET /message-templates/add` — 템플릿 추가 폼
- **핸들러:** `messagetemplates.AddHandler`
- **인증:** 필요 + 지점 컨텍스트
- **응답:** HTML

### `POST /message-templates/add` — 템플릿 추가 처리
- **핸들러:** `messagetemplates.AddHandler`
- **인증:** 필요 + 지점 컨텍스트
- **요청 (Form):**

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| `name` | string | Y | 템플릿명 |
| `content` | string | Y | 메시지 내용 (플레이스홀더 포함) |
| `description` | string | N | 설명 |
| `is_active` | string | N | 활성 여부 |

- **성공:** `302 → /message-templates`

### `GET /message-templates/edit` — 템플릿 수정 폼
- **핸들러:** `messagetemplates.EditHandler`
- **인증:** 필요 + 지점 컨텍스트
- **요청 (Query):** `id` (int)

### `POST /message-templates/edit` — 템플릿 수정 처리
- **핸들러:** `messagetemplates.EditHandler`
- **요청 (Form):** `name`, `content`, `description`, `is_active`
- **성공:** `302 → /message-templates`

### `POST /message-templates/delete` — 템플릿 삭제
- **핸들러:** `messagetemplates.DeleteHandler`
- **인증:** 필요
- **요청 (Query):** `id` (int)
- **응답:** `302 → /message-templates`

### `POST /message-templates/set-default` — 기본 템플릿 설정
- **핸들러:** `messagetemplates.SetDefaultHandler`
- **인증:** 필요
- **요청 (Query):** `id` (int)
- **응답:** `302 → /message-templates`

### `GET /api/message-templates` — 활성 템플릿 목록 API
- **핸들러:** `messagetemplates.GetTemplatesAPI`
- **인증:** 필요
- **응답 (JSON):** 활성 템플릿 배열

---

## 7. 공지사항

### `GET /notices` — 공지 목록
- **핸들러:** `notices.Handler`
- **인증:** 필요 + 지점 컨텍스트
- **요청 (Query):**

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| `page` | int | N | 페이지 번호 |
| `filter` | string | N | 카테고리 필터 |
| `searchKeyword` | string | N | 제목 검색 |

- **응답:** HTML (`notices/list.html`)

### `GET /notices/detail` — 공지 상세 (조회수 증가)
- **핸들러:** `notices.DetailHandler`
- **인증:** 필요 + 지점 컨텍스트
- **요청 (Query):** `id` (int)
- **응답:** HTML (`notices/detail.html`)

### `GET /notices/add` — 공지 추가 폼
- **핸들러:** `notices.AddHandler`
- **인증:** 필요 + 지점 컨텍스트

### `POST /notices/add` — 공지 추가 처리
- **핸들러:** `notices.AddHandler`
- **요청 (Form):**

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| `title` | string | Y | 제목 |
| `content` | string | Y | 내용 |
| `category` | string | Y | `공지사항` / `이벤트` |
| `is_pinned` | string | N | 상단 고정 여부 |
| `event_start_date` | string | N | 이벤트 시작일 |
| `event_end_date` | string | N | 이벤트 종료일 |

- **성공:** `302 → /notices`

### `GET /notices/edit` — 공지 수정 폼
- **핸들러:** `notices.EditHandler`
- **요청 (Query):** `id` (int)

### `POST /notices/edit` — 공지 수정 처리
- **핸들러:** `notices.EditHandler`
- **요청 (Form):** 위 추가와 동일
- **성공:** `302 → /notices`

### `POST /notices/delete` — 공지 삭제
- **핸들러:** `notices.DeleteHandler`
- **인증:** 필요
- **요청 (Form):** `id` (string)
- **응답:** `302 → /notices`

---

## 8. 설정

### `GET /settings` — 설정 페이지
- **핸들러:** `settings.Handler`
- **인증:** 필요 + 지점 컨텍스트
- **응답:** HTML (`settings/index.html`)

### `GET /settings/reservation-sms` — 예약 SMS 설정 폼
- **핸들러:** `settings.ReservationSMSConfigHandler`
- **인증:** 필요 + 지점 컨텍스트

### `POST /settings/reservation-sms` — 예약 SMS 설정 저장
- **핸들러:** `settings.ReservationSMSConfigHandler`
- **요청 (Form):**

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| `template_seq` | string | Y | 메시지 템플릿 PK |
| `sender_number` | string | Y | 발신번호 |
| `auto_send` | string | N | 자동 발송 여부 |

- **성공:** `302 → /settings`

---

## 9. SMS 서비스

### `POST /api/service/sms` — SMS 발송
- **핸들러:** `services.SendSMSHandler`
- **인증:** 필요
- **요청 (Form):**

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| `customer_seq` | string | Y | 고객 PK |
| `sender_phone` | string | Y | 발신번호 |
| `receiver_phone` | string | Y | 수신번호 |
| `message` | string | Y | 메시지 내용 |

- **응답 (JSON):**
```json
{
  "success": true,
  "message": "메시지가 성공적으로 전송되었습니다.",
  "nums": "string",
  "cols": "string"
}
```

### `GET /api/service/reservation-sms-config` — 예약 SMS 설정 조회
- **핸들러:** `services.GetReservationSMSConfigHandler`
- **인증:** 필요
- **응답 (JSON):**
```json
{
  "success": true,
  "template_seq": 1,
  "template_name": "예약확정 안내",
  "template_content": "{{고객명}}님, 예약이 확정되었습니다.",
  "sender_number": "010-1234-5678",
  "auto_send": true
}
```

---

## 10. 수업 관리

### `GET /complex/classes` — 수업 목록
- **핸들러:** `management.Handler`
- **인증:** 필요 + 지점 컨텍스트
- **응답:** HTML (`management/complex_class_list.html`)

### `GET /complex/classes/add` — 수업 추가 폼
- **핸들러:** `management.AddHandler`
- **인증:** 필요 + 지점 컨텍스트
- **응답:** HTML (시간대, 스태프 목록 포함)

### `POST /complex/classes/update` — 수업 추가/수정
- **핸들러:** `management.UpdateHandler`
- **인증:** 필요 + 지점 컨텍스트
- **요청 (Form):**

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| `id` | string | N | 수업 PK (없으면 신규 생성) |
| `time_slot_id` | string | Y | 시간대 PK |
| `staff_id` | string | N | 담당 스태프 PK |
| `name` | string | Y | 수업명 |
| `description` | string | N | 설명 |
| `capacity` | string | Y | 정원 |

- **응답:** `302 → /complex/classes`

### `GET /complex/classes/edit` — 수업 수정 폼
- **핸들러:** `management.EditHandler`
- **요청 (Query):** `id` (int)

### `POST /complex/classes/delete` — 수업 삭제
- **핸들러:** `management.DeleteHandler`
- **요청 (Form):** `id` (string)
- **응답:** `302 → /complex/classes`

---

## 11. 회원 관리

### `GET /complex/members` — 회원 목록
- **핸들러:** `management.MemberListHandler`
- **인증:** 필요 + 지점 컨텍스트
- **응답:** HTML (`members/member_list.html`)

### `GET /complex/members/add` — 회원 추가 폼
- **핸들러:** `management.MemberAddHandler`
- **인증:** 필요 + 지점 컨텍스트
- **응답:** HTML (멤버십, 시간대, 수업 목록 포함)

### `POST /complex/members/update` — 회원 추가/수정
- **핸들러:** `management.MemberUpdateHandler`
- **인증:** 필요 + 지점 컨텍스트
- **요청 (Form):**

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| `id` | string | N | 회원 PK (없으면 신규) |
| `name` | string | Y | 이름 |
| `phone_number` | string | Y | 전화번호 |
| `level` | string | N | 레벨 |
| `language` | string | N | 언어 |
| `info` | string | N | 인적사항 |
| `chart_number` | string | N | 차트번호 |
| `comment` | string | N | 코멘트 |
| `join_date` | string | N | 가입일 |
| `signup_channel` | string | N | 가입 경로 |
| `signup_channel_custom` | string | N | 직접 입력 가입 경로 |
| `interviewer` | string | N | 인터뷰어 |
| `membership_seq` | string | N | 멤버십 PK |
| `expiry_date` | string | N | 만료일 |
| `price` | string | N | 결제 금액 |
| `payment_date` | string | N | 납부일 |
| `payment_method` | string | N | 결제방법 |
| `payment_method_custom` | string | N | 직접 입력 결제방법 |
| `deposit_amount` | string | N | 디파짓 금액 |
| `class_id` | string | N | 배정 수업 PK |

- **응답:** `302 → /complex/members`

### `GET /complex/members/edit` — 회원 수정 폼
- **핸들러:** `management.MemberEditHandler`
- **요청 (Query):** `id` (string)

### `POST /complex/members/delete` — 회원 삭제
- **핸들러:** `management.MemberDeleteHandler`
- **요청 (Form):** `id` (string)
- **응답:** `302 → /complex/members`

### `GET /api/complex/members/memberships` — 회원 멤버십 조회 API
- **핸들러:** `management.MemberMembershipsAPIHandler`
- **인증:** 필요
- **요청 (Query):** `member_seq` (string)
- **응답 (JSON):**
```json
{ "memberships": [...] }
```

---

## 12. 스태프 관리

### `GET /complex/staffs` — 스태프 목록
- **핸들러:** `management.StaffListHandler`
- **인증:** 필요 + 지점 컨텍스트
- **응답:** HTML (`staffs/staff_list.html`)

### `GET /complex/staffs/add` — 스태프 추가 폼
- **핸들러:** `management.StaffAddHandler`
- **인증:** 필요 + 지점 컨텍스트
- **응답:** HTML (시간대, 수업 목록 포함)

### `POST /complex/staffs/update` — 스태프 추가/수정
- **핸들러:** `management.StaffUpdateHandler`
- **인증:** 필요 + 지점 컨텍스트
- **요청 (Form):**

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| `id` | string | N | 스태프 PK (없으면 신규) |
| `name` | string | Y | 이름 |
| `phone_number` | string | N | 전화번호 |
| `email` | string | N | 이메일 |
| `subject` | string | N | 담당 과목 |
| `status` | string | Y | `재직` / `휴직` / `퇴직` |
| `join_date` | string | N | 등록일 |
| `comment` | string | N | 비고 |
| `interviewer` | string | N | 인터뷰어 |
| `payment_method` | string | N | 결제방법 |
| `payment_method_custom` | string | N | 직접 입력 결제방법 |
| `deposit_amount` | string | N | 디파짓 금액 |
| `refundable_deposit` | string | N | 환급 예정 디파짓 |
| `non_refundable_deposit` | string | N | 환급불가 디파짓 |
| `refund_bank` | string | N | 환급 은행 |
| `refund_account` | string | N | 환급 계좌번호 |
| `refund_amount` | string | N | 환급 금액 |
| `assigned_classes` | string | N | 배정 수업 PK (콤마 구분) |

- **응답:** `302 → /complex/staffs`

### `GET /complex/staffs/edit` — 스태프 수정 폼
- **핸들러:** `management.StaffEditHandler`
- **요청 (Query):** `id` (string)

### `POST /complex/staffs/delete` — 스태프 삭제
- **핸들러:** `management.StaffDeleteHandler`
- **요청 (Form):** `id` (string)
- **응답:** `302 → /complex/staffs`

---

## 13. 출석 관리

### `GET /complex/attendance` — 출석 관리 메인
- **핸들러:** `attendance.Handler`
- **인증:** 필요 + 지점 컨텍스트
- **응답:** HTML (시간대별 수업/회원 카드 뷰)

### `GET /complex/attendance/detail` — 시간대별 상세 출석
- **핸들러:** `attendance.DetailHandler`
- **인증:** 필요 + 지점 컨텍스트
- **요청 (Query):** `slotSeq` (string, 시간대 PK)
- **응답:** HTML (수업별 회원 목록, 출석 이력)

### `POST /complex/attendance/reorder` — 수업 카드 순서 변경
- **핸들러:** `attendance.ReorderClassesHandler`
- **인증:** 필요 + 지점 컨텍스트
- **요청 (JSON):**
```json
{
  "classOrders": [
    { "id": 1, "sortOrder": 0 },
    { "id": 2, "sortOrder": 1 }
  ]
}
```
- **응답 (JSON):** `{ "status": "ok" }`

### `POST /complex/attendance/bulk` — 일괄 출석 처리
- **핸들러:** `attendance.BulkAttendanceHandler`
- **인증:** 필요 + 지점 컨텍스트
- **요청 (JSON):**
```json
{
  "classId": 1,
  "members": [
    { "id": 10, "isStaff": false, "attended": true },
    { "id": 20, "isStaff": true, "attended": false }
  ]
}
```
- **응답 (JSON):**
```json
[
  { "memberSeq": 10, "name": "홍길동", "status": "출석" },
  { "memberSeq": 20, "name": "김강사", "status": "결석" }
]
```

---

## 14. 멤버십

### `GET /complex/memberships` — 멤버십 목록
- **핸들러:** `memberships.ListHandler`
- **인증:** 필요 + 지점 컨텍스트
- **응답:** HTML (`memberships/list.html`)

### `GET /complex/memberships/add` — 멤버십 추가 폼
- **핸들러:** `memberships.AddHandler`
- **인증:** 필요 + 지점 컨텍스트

### `POST /complex/memberships/add` — 멤버십 추가 처리
- **핸들러:** `memberships.AddHandler`
- **요청 (Form):**

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| `name` | string | Y | 멤버십명 |
| `duration_value` | string | Y | 기간 값 |
| `duration_unit` | string | Y | 기간 단위 (일/주/월) |
| `count` | string | Y | 횟수 |
| `price` | string | Y | 가격 |

- **성공:** `302 → /complex/memberships`

### `GET /complex/memberships/edit` — 멤버십 수정 폼
- **핸들러:** `memberships.EditHandler`
- **요청 (Query):** `id` (int)

### `POST /complex/memberships/edit` — 멤버십 수정 처리
- **핸들러:** `memberships.EditHandler`
- **요청 (Form):** 위 추가와 동일
- **성공:** `302 → /complex/memberships`

### `POST /complex/memberships/delete` — 멤버십 삭제
- **핸들러:** `memberships.DeleteHandler`
- **인증:** 필요
- **요청 (Query):** `id` (int)
- **응답:** `302 → /complex/memberships`

---

## 15. 수업 시간대

### `GET /complex/timeslots` — 시간대 목록
- **핸들러:** `classtimeslots.Handler`
- **인증:** 필요 + 지점 컨텍스트
- **응답:** HTML (`classtimeslots/list.html`)

### `GET /complex/timeslots/add` — 시간대 추가 폼
- **핸들러:** `classtimeslots.AddHandler`
- **인증:** 필요 + 지점 컨텍스트

### `POST /complex/timeslots/add` — 시간대 추가 처리
- **핸들러:** `classtimeslots.AddHandler`
- **요청 (Form):**

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| `name` | string | Y | 시간대 이름 |
| `days_of_week` | string | Y | 요일 (쉼표 구분, 예: `월,수,금`) |
| `start_time` | string | Y | 시작 시간 (HH:MM) |
| `end_time` | string | Y | 종료 시간 (HH:MM) |

- **성공:** `302 → /complex/timeslots`

### `GET /complex/timeslots/edit` — 시간대 수정 폼
- **핸들러:** `classtimeslots.EditHandler`
- **요청 (Query):** `id` (int)

### `POST /complex/timeslots/edit` — 시간대 수정 처리
- **핸들러:** `classtimeslots.EditHandler`
- **요청 (Form):** 위 추가와 동일
- **성공:** `302 → /complex/timeslots`

### `POST /complex/timeslots/delete` — 시간대 삭제
- **핸들러:** `classtimeslots.DeleteHandler`
- **인증:** 필요 + 지점 컨텍스트
- **요청 (Query):** `id` (int)
- **응답:** `302 → /complex/timeslots`

---

## 16. 연기 요청 관리 (Admin)

### `GET /complex/postponements` — 연기 요청 목록
- **핸들러:** `management.PostponementListHandler`
- **인증:** 필요 + 지점 컨텍스트
- **응답:** HTML (`postponements/postponement_list.html`)

### `POST /complex/postponements/update-status` — 연기 요청 상태 변경
- **핸들러:** `management.PostponementUpdateStatusHandler`
- **인증:** 필요
- **요청 (Form):**

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| `id` | string | Y | 요청 PK |
| `status` | string | Y | `승인` / `반려` |
| `reject_reason` | string | N | 반려 사유 (반려 시) |

- **응답:** `302 → /complex/postponements`

### `GET /complex/postponements/reasons` — 연기 사유 목록
- **핸들러:** `management.PostponementReasonListHandler`
- **인증:** 필요 + 지점 컨텍스트
- **응답:** HTML

### `POST /complex/postponements/reasons/add` — 연기 사유 추가
- **핸들러:** `management.PostponementReasonAddHandler`
- **인증:** 필요 + 지점 컨텍스트
- **요청 (Form):**

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| `label` | string | Y | 사유 텍스트 |
| `labels` | string | N | JSON 배열 (하위 레이블) |

- **응답:** `302 → /complex/postponements/reasons`

### `POST /complex/postponements/reasons/delete` — 연기 사유 삭제
- **핸들러:** `management.PostponementReasonDeleteHandler`
- **인증:** 필요
- **요청 (Form):** `id` (string)
- **응답:** `302 → /complex/postponements/reasons`

### `POST /complex/postponements/reasons/label/delete` — 하위 레이블 삭제
- **핸들러:** `management.PostponementReasonLabelDeleteHandler`
- **인증:** 필요
- **요청 (Form):** `id`, `key`, `value`
- **응답:** `302 → /complex/postponements/reasons`

---

## 17. 환불 요청 관리 (Admin)

### `GET /complex/refunds` — 환불 요청 목록
- **핸들러:** `management.RefundListHandler`
- **인증:** 필요 + 지점 컨텍스트
- **응답:** HTML (`management/refund_list.html`)

### `POST /complex/refunds/update-status` — 환불 요청 상태 변경
- **핸들러:** `management.RefundUpdateStatusHandler`
- **인증:** 필요
- **요청 (Form):**

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| `id` | string | Y | 요청 PK |
| `status` | string | Y | `승인` / `반려` |
| `reject_reason` | string | N | 반려 사유 |

- **응답:** `302 → /complex/refunds`

---

## 18. 설문 관리 (Admin)

### `GET /complex/survey/templates` — 설문 템플릿 목록
- **핸들러:** `complexSurvey.TemplateListHandler`
- **인증:** 필요 + 지점 컨텍스트
- **응답:** HTML (`survey/template_list.html`)

### `POST /complex/survey/templates/create` — 설문 템플릿 생성
- **핸들러:** `complexSurvey.TemplateCreateHandler`
- **요청 (Form):**

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| `name` | string | Y | 설문지 이름 |
| `description` | string | N | 설명 |

- **응답:** `302 → /complex/survey/templates`

### `POST /complex/survey/templates/copy` — 설문 템플릿 복사
- **핸들러:** `complexSurvey.TemplateCopyHandler`
- **요청 (Form):** `source_id` (string, 원본 PK)
- **응답:** `302 → /complex/survey/templates`

### `POST /complex/survey/templates/delete` — 설문 템플릿 삭제
- **핸들러:** `complexSurvey.TemplateDeleteHandler`
- **요청 (Form):** `id` (string)
- **응답:** `302 → /complex/survey/templates`

### `POST /complex/survey/templates/status` — 설문 상태 변경
- **핸들러:** `complexSurvey.TemplateStatusHandler`
- **요청 (Form):**

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| `id` | string | Y | 템플릿 PK |
| `status` | string | Y | `작성중` / `활성` / `비활성` |

- **응답:** `302 → /complex/survey/templates`

### `GET /complex/survey/options` — 설문 질문/옵션 관리 페이지
- **핸들러:** `complexSurvey.OptionsHandler`
- **인증:** 필요 + 지점 컨텍스트
- **요청 (Query):** `template_id` (string)
- **응답:** HTML (`survey/options.html`)

### `POST /complex/survey/questions/add` — 질문 추가
- **핸들러:** `complexSurvey.QuestionAddHandler`
- **요청 (Form):**

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| `template_id` | string | Y | 템플릿 PK |
| `question_key` | string | Y | 질문 키 (예: `q1`) |
| `title` | string | Y | 질문 제목 |
| `section` | string | Y | 섹션 번호 |
| `section_title` | string | N | 섹션 제목 |
| `input_type` | string | Y | `radio` / `checkbox` / `text` |
| `is_grouped` | string | N | `0` / `1` |
| `groups` | string | N | 그룹명 (쉼표 구분) |

- **응답:** `302 → /complex/survey/options`

### `POST /complex/survey/questions/update` — 질문 수정
- **핸들러:** `complexSurvey.QuestionUpdateHandler`
- **요청 (Form):** `template_id`, `seq`, `title`, `question_key`, `input_type`, `is_grouped`, `groups`
- **응답:** `302 → /complex/survey/options`

### `POST /complex/survey/questions/delete` — 질문 삭제
- **핸들러:** `complexSurvey.QuestionDeleteHandler`
- **요청 (Form):** `template_id`, `seq`, `question_key`
- **응답:** `302 → /complex/survey/options`

### `POST /complex/survey/options/add` — 선택지 추가
- **핸들러:** `complexSurvey.AddOptionHandler`
- **요청 (Form):**

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| `template_id` | string | Y | 템플릿 PK |
| `question` | string | Y | 질문 키 |
| `group` | string | N | 그룹명 |
| `label` | string | Y | 선택지 텍스트 |
| `labels` | string | N | JSON 배열 (일괄 추가) |

- **응답:** `302 → /complex/survey/options`

### `POST /complex/survey/options/delete` — 선택지 삭제
- **핸들러:** `complexSurvey.DeleteOptionHandler`
- **요청 (Query):** `seq` (string), `template_id` (string)
- **응답:** `302 → /complex/survey/options`

### `POST /complex/survey/options/type` — 질문 입력타입 변경
- **핸들러:** `complexSurvey.UpdateTypeHandler`
- **요청 (Form):** `template_id`, `question`, `input_type` (`radio`/`checkbox`/`text`)
- **응답:** `302 → /complex/survey/options`

---

## 19. 공개 API - 외부 고객 등록

### `GET /api/external/customers` — 외부 시스템 고객 등록
- **핸들러:** `opens.ExternalRegisterCustomerHandler`
- **인증:** 불필요
- **요청 (Query):**

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| `name` | string | Y | 고객명 |
| `phone` | string | Y | 전화번호 |
| `location` | string | N | 지역 |
| `job` | string | N | 직업 |
| `reading` | string | N | 광고명 (AdName) |
| `writing` | string | N | 광고 플랫폼 (AdPlatform) |
| `language` | int | N | 언어 코드 |

- **응답 (JSON):**
```json
{
  "success": true,
  "message": "고객이 성공적으로 등록되었습니다",
  "customer_seq": 123,
  "branch_seq": 1
}
```

---

## 20. 공개 - 멤버십 조회

### `GET /complex/membership` — 멤버십 조회 페이지
- **핸들러:** `opens.MembershipCheckHandler`
- **인증:** 불필요
- **응답:** HTML (전화번호 입력 폼)

### `GET /complex/membership/result` — 멤버십 조회 결과
- **핸들러:** `opens.MembershipResultHandler`
- **인증:** 불필요
- **요청 (Query):** `phone` (string, 전화번호)
- **응답:** HTML (회원 정보, 출석 이력, 출석률, 연기 횟수)

---

## 21. 공개 - 연기 요청

### `GET /complex/postponement` — 연기 요청 페이지
- **핸들러:** `opens.PostponementHandler`
- **인증:** 불필요
- **응답:** HTML

### `GET /api/postponement/search-member` — 회원 검색 (연기용)
- **핸들러:** `opens.PostponementSearchMemberHandler`
- **인증:** 불필요
- **요청 (Query):**

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| `name` | string | Y | 회원 이름 |
| `phone` | string | Y | 전화번호 |

- **응답 (JSON):**
```json
{
  "members": [
    {
      "seq": 1,
      "branch_seq": 1,
      "branch_name": "강남",
      "name": "홍길동",
      "phone_number": "010-1234-5678",
      "level": "3-",
      "join_date": "2026-01-01",
      "memberships": [
        {
          "seq": 1,
          "membership_name": "3개월권",
          "start_date": "2026-01-01",
          "expiry_date": "2026-04-01",
          "postpone_total": 3,
          "postpone_used": 0,
          "status": "활성"
        }
      ],
      "classes": [
        { "seq": 1, "name": "영어회화 A" }
      ]
    }
  ]
}
```

### `GET /api/postponement/reasons` — 연기 사유 목록
- **핸들러:** `opens.PostponementReasonsAPIHandler`
- **인증:** 불필요
- **요청 (Query):** `branch_id` (string, 지점 PK)
- **응답 (JSON):**
```json
{ "reasons": [{ "label": "개인 사정" }, { "label": "건강 문제" }] }
```

### `POST /api/postponement/submit` — 연기 요청 제출
- **핸들러:** `opens.PostponementSubmitHandler`
- **인증:** 불필요
- **요청 (Form):**

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| `name` | string | Y | 요청자 이름 |
| `phone` | string | Y | 전화번호 |
| `branch_id` | string | Y | 지점 PK |
| `member_seq` | string | Y | 회원 PK |
| `member_membership_seq` | string | Y | 회원-멤버십 PK |
| `time_slot` | string | Y | 수업 시간대 |
| `current_class` | string | Y | 수강 중인 수업 |
| `start_date` | string | Y | 연기 시작일 |
| `end_date` | string | Y | 연기 종료일 |
| `reason` | string | Y | 연기 사유 |
| `reason_custom` | string | N | 기타 사유 (직접 입력) |

- **응답:** HTML (연기 요청 완료 페이지)

---

## 22. 공개 - 환불 요청

### `GET /complex/refund` — 환불 요청 페이지
- **핸들러:** `opens.RefundHandler`
- **인증:** 불필요
- **응답:** HTML

### `GET /api/refund/search-member` — 회원 검색 (환불용)
- **핸들러:** `opens.RefundSearchMemberHandler`
- **인증:** 불필요
- **요청 (Query):** `name` (string), `phone` (string)
- **응답 (JSON):**
```json
{
  "members": [
    {
      "seq": 1,
      "branch_seq": 1,
      "branch_name": "강남",
      "name": "홍길동",
      "phone_number": "010-1234-5678",
      "memberships": [
        {
          "seq": 1,
          "membership_name": "3개월권",
          "price": "300000",
          "status": "활성"
        }
      ]
    }
  ]
}
```

### `POST /api/refund/submit` — 환불 요청 제출
- **핸들러:** `opens.RefundSubmitHandler`
- **인증:** 불필요
- **요청 (Form):**

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| `branch_seq` | string | Y | 지점 PK |
| `member_seq` | string | Y | 회원 PK |
| `member_membership_seq` | string | Y | 회원-멤버십 PK |
| `member_name` | string | Y | 회원명 |
| `phone_number` | string | Y | 전화번호 |
| `membership_name` | string | Y | 멤버십명 |
| `price` | string | N | 결제 금액 |
| `reason` | string | Y | 환불 사유 |
| `bank_name` | string | Y | 환불 은행 |
| `account_number` | string | Y | 계좌번호 |
| `account_holder` | string | Y | 예금주 |

- **응답 (JSON):** `{ "success": true }`

---

## 23. 공개 - 상담/설문

### `GET /consultation/success` — 상담 등록 완료
- **핸들러:** `consultation.SuccessHandler`
- **인증:** 불필요
- **요청 (Query):** `name` (string, optional)
- **응답:** HTML

### `GET /complex/survey` — 설문 페이지
- **핸들러:** `consultation.SurveyHandler`
- **인증:** 불필요
- **요청 (Query):**

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| `branch_seq` | int | N | 지점 PK |
| `template_id` | int | N | 설문 템플릿 PK |

- **응답:** HTML (동적 설문 폼)

### `POST /consultation/survey/submit` — 설문 제출
- **핸들러:** `consultation.SurveySubmitHandler`
- **인증:** 불필요
- **요청 (Form):**

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| `branch_seq` | int | Y | 지점 PK |
| `name` | string | Y | 이름 |
| `phone_number` | string | Y | 전화번호 |
| `gender` | string | N | 성별 |
| `location` | string | N | 지역 |
| `age_group` | string | N | 연령대 |
| `occupation` | string | N | 직업 |
| `occupation_detail` | string | N | 직업 상세 |
| `ad_source` | string | N | 광고 출처 |
| `q1` ~ `q9` | string/string[] | N | 설문 응답 (체크박스는 배열) |

- **응답:** `302 → /consultation/success?name=...`

### `GET /api/complex/survey/submissions` — 설문 제출 내역 API
- **핸들러:** `consultation.SurveySubmissionsAPIHandler`
- **인증:** 필요
- **응답 (JSON):** 설문 제출 목록 배열

---

## 24. 공개 - 게시판

### `GET /board` (또는 `GET /`) — 게시판 목록
- **핸들러:** `board.ListHandler`
- **인증:** 불필요
- **요청 (Query):**

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| `page` | int | N | 페이지 번호 |
| `filter` | string | N | 카테고리 필터 (기본: `all`) |
| `q` | string | N | 제목 검색어 |

- **응답:** HTML (공지사항/이벤트 목록, 카카오 로그인 여부 표시)

### `GET /board/detail` — 게시판 상세
- **핸들러:** `board.DetailHandler`
- **인증:** 불필요
- **요청 (Query):** `id` (string, 게시물 PK)
- **응답:** HTML

### `GET /board/mypage` — 마이페이지
- **핸들러:** `board.MypageHandler`
- **인증:** 카카오 세션 필요 (`board-session`)
- **응답:** HTML (회원 정보)

### `POST /board/withdraw` — 회원 탈퇴
- **핸들러:** `board.WithdrawHandler`
- **인증:** 카카오 세션 필요
- **응답 (JSON):**
```json
{ "success": true, "message": "회원탈퇴가 완료되었습니다" }
```
- **부수 효과:** 카카오 연동 해제, DB 삭제, 세션 무효화

### `GET /board/logout` — 게시판 로그아웃
- **핸들러:** `board.BoardLogoutHandler`
- **인증:** 카카오 세션 필요
- **응답:** `302 → /`

---

## 25. 공개 - 카카오 OAuth

### `GET /board/kakao/login` — 카카오 로그인 시작
- **핸들러:** `board.KakaoLoginHandler`
- **인증:** 불필요
- **요청 (Query):** `state` (string, optional, 지점 seq)
- **응답:** `302 → 카카오 OAuth 인증 URL`

### `GET /board/kakao/callback` — 카카오 OAuth 콜백
- **핸들러:** `board.KakaoCallbackHandler`
- **인증:** 불필요
- **요청 (Query):** `code` (카카오 인증 코드), `state` (상태 토큰)
- **동작:**
  - 카카오 토큰 발급 → 사용자 정보 조회
  - 기존 고객이면 세션 생성 후 `302 → /`
  - 신규 고객이면 DB 등록 후 `302 → /board/kakao/success`

### `GET /board/kakao/success` — 카카오 가입 완료
- **핸들러:** `board.KakaoRegistrationSuccessHandler`
- **인증:** 카카오 세션 필요
- **응답:** HTML (환영 페이지)

---

## 26. 기타

### `GET /privacy` — 개인정보처리방침
- **핸들러:** `opens.PrivacyPolicyHandler`
- **인증:** 불필요
- **응답:** HTML

### `GET /error` — 에러 페이지
- **핸들러:** `errorhandler.Handler404`
- **인증:** 불필요
- **응답:** HTML (`error.html`)

### `GET /complex` — 수업 관리 대시보드
- **핸들러:** `index.Handler`
- **인증:** 필요 + 지점 컨텍스트
- **응답:** HTML (`complex/index.html`)

### `GET /swagger/` — Swagger API 문서
- **핸들러:** `httpSwagger.WrapHandler`
- **인증:** 불필요
- **응답:** Swagger UI

### `GET /static/*` — 정적 파일
- 핸들러: `http.FileServer`
- CSS, JS, 이미지 등

---

## 라우트 총 개수

| 구분 | 개수 |
|------|------|
| 공개 라우트 (인증 불필요) | 17 |
| Complex 라우트 (인증 필요) | 30 |
| 일반 인증 라우트 | 28 |
| **합계** | **75** |

## JSON API 엔드포인트 요약

| 경로 | 메서드 | 인증 | 설명 |
|------|--------|------|------|
| `/api/external/customers` | GET | X | 외부 고객 등록 |
| `/api/postponement/search-member` | GET | X | 회원 검색 (연기) |
| `/api/postponement/reasons` | GET | X | 연기 사유 목록 |
| `/api/postponement/submit` | POST | X | 연기 요청 제출 |
| `/api/refund/search-member` | GET | X | 회원 검색 (환불) |
| `/api/refund/submit` | POST | X | 환불 요청 제출 |
| `/api/dashboard/caller-stats` | GET | O | CALLER 통계 |
| `/api/customers/comment` | POST | O | 코멘트 수정 |
| `/api/customers/process-call` | POST | O | 통화 처리 |
| `/api/customers/reservation` | POST | O | 예약 생성 |
| `/api/customers/update-name` | POST | O | 고객명 수정 |
| `/api/customers/delete` | POST | O | 고객 삭제 |
| `/api/customers/mark-no-phone-interview` | POST | O | 전화상안함 |
| `/api/external/sms` | POST | O | SMS 테스트 |
| `/api/integrations/activate` | POST | O | 연동 활성화 |
| `/api/integrations/disconnect` | POST | O | 연동 해제 |
| `/api/integrations/check-sms` | GET | O | SMS 연동 확인 |
| `/api/integrations/sms-senders` | GET | O | 발신번호 조회 |
| `/api/calendar/create-event` | POST | O | 캘린더 이벤트 |
| `/api/message-templates` | GET | O | 활성 템플릿 |
| `/api/service/sms` | POST | O | SMS 발송 |
| `/api/service/reservation-sms-config` | GET | O | 예약 SMS 설정 |
| `/api/sms/config` | POST | O | SMS 설정 저장 |
| `/api/complex/members/memberships` | GET | O | 회원 멤버십 |
| `/api/complex/survey/submissions` | GET | O | 설문 제출 내역 |
