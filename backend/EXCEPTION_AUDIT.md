# 예외 처리 감사 보고서

## 현재 GlobalExceptionHandler 처리 현황

| 예외 타입 | HTTP 상태 | 비고 |
|-----------|-----------|------|
| `InvalidDateFormatException` | 400 | 날짜 파싱 실패 |
| `BadSqlGrammarException`, `MyBatisSystemException` | 500 | MyBatis 쿼리 실패 |
| `Exception` (catch-all) | 500 | 기타 모든 예외 |

---

## 누락된 예외 처리

### 1. RuntimeException (엔티티 조회 실패) — 8건

`.orElseThrow(() -> new RuntimeException(...))` 패턴. 현재 catch-all에 의해 500이 반환되지만, 실제로는 404가 적절함.

| 파일 | 라인 | 메시지 |
|------|------|--------|
| `controller/auth/UserController.java` | 33 | `"creator is not present"` |
| `controller/auth/UserController.java` | 54 | `"creator is not present"` |
| `controller/auth/UserController.java` | 102 | `"user not found"` |
| `controller/auth/AuthController.java` | 102 | `"user not found"` |
| `controller/branch/BranchController.java` | 36 | `"user not found"` |
| `controller/branch/BranchController.java` | 60 | `"user not found"` |
| `controller/kakaosync/KakaoSyncController.java` | 33 | `"지점을 찾을 수 없습니다."` |
| `controller/notice/NoticeController.java` | 57-58 | `"지점을 찾을 수 없습니다."` |

**권장 조치:** 커스텀 `EntityNotFoundException` 생성 → 핸들러에서 404 반환

---

### 2. IllegalArgumentException (Enum.valueOf 실패) — 5건

잘못된 enum 값이 요청으로 들어오면 `IllegalArgumentException` 발생. 현재 500으로 처리되지만, 400이 적절함.

| 파일 | 라인 | Enum 타입 |
|------|------|-----------|
| `controller/notice/NoticeController.java` | 52 | `NoticeCategory` |
| `controller/notice/NoticeController.java` | 72 | `NoticeCategory` |
| `controller/customer/CustomerController.java` | 73 | `CustomerStatus` |
| `controller/calendar/CalendarController.java` | 65 | `CustomerStatus` |
| `controller/complex/SurveyController.java` | 86 | `SurveyStatus` |

**권장 조치:** `@ExceptionHandler(IllegalArgumentException.class)` 추가 → 400 반환

---

### 3. NullPointerException (Map.get() null 전달) — 2건

`Map<String, String>` 요청 바디에서 키가 누락되면 `.get()` → null → `.valueOf(null)` → NPE.

| 파일 | 라인 | 누락 가능 키 |
|------|------|-------------|
| `controller/complex/SurveyController.java` | 86 | `"status"` |
| `controller/calendar/CalendarController.java` | 65 | `"status"` |

**권장 조치:** null 체크 추가 또는 DTO로 교체

---

### 4. Spring MVC 예외 (프레임워크 발생) — 미처리

Spring이 자동으로 던지는 예외들. 현재 catch-all에 의해 500으로 처리되지만, 적절한 상태 코드가 필요함.

| 예외 타입 | 발생 상황 | 적절한 HTTP 상태 |
|-----------|-----------|-----------------|
| `HttpMessageNotReadableException` | JSON 파싱 실패 (잘못된 요청 바디) | 400 |
| `MethodArgumentNotValidException` | `@Valid` 검증 실패 | 400 |
| `MissingServletRequestParameterException` | 필수 `@RequestParam` 누락 | 400 |
| `HttpRequestMethodNotSupportedException` | 잘못된 HTTP 메서드 | 405 |
| `DataIntegrityViolationException` | 유니크 제약 조건 위반 | 409 |

**권장 조치:** 각 예외별 핸들러 추가

---

## 정상 처리 확인 (조치 불필요)

| 예외 타입 | 위치 | 처리 방식 |
|-----------|------|-----------|
| `IllegalArgumentException` (Kakao state) | `KakaoOAuthService` | 컨트롤러에서 try-catch로 로컬 처리 |
| `NumberFormatException` | `SmsService`, `BoardSessionService` | 로컬 try-catch |
| `DateTimeParseException` | `DateTimeUtils` | `InvalidDateFormatException`으로 변환 → 핸들러 처리 |
| AWS SDK 예외 | `WebhookLambdaServiceImpl` | 로컬 try-catch |
| REST 호출 예외 | `SmsService`, `KakaoOAuthService` 등 | 로컬 try-catch |
| `RuntimeException` (HMAC 실패) | `BoardSessionService:115` | catch-all → 500 (적절) |
