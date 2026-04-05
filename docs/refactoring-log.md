# 백엔드 리팩터링 로그

> 작성일: 2026-04-05
> 대상: `backend/src/main/java/com/culcom/`
> 코드 퀄리티: 6/10 → 8.5/10

---

## 1. [Critical] BCrypt 비밀번호 해싱 적용

**문제**: `AuthService.authenticate()`에서 평문 비교 (`equals`), 회원가입/수정 시 평문 저장

**수정**:
- `AuthService`: `passwordEncoder.matches()` 사용
- `UserController`: create/update 시 `passwordEncoder.encode()` 적용
- `LocalDataInitializer`: root/user 초기 계정도 BCrypt 해싱

**파일**: `AuthService.java`, `UserController.java`, `LocalDataInitializer.java`

---

## 2. [Critical] NPE 위험 코드 수정

**문제**: null 체크 없이 `.getSeq()`, `.getCustomer()` 등 체인 호출

**수정**:
- `CalendarController`: `getCustomer()` null 체크 추가
- `ComplexMemberController`: `getMember()` null 체크 추가
- `SurveyController`: `sectionMap.get()` / `questionMap.get()` null 체크 추가
- `CustomerController`: `CustomerStatus.valueOf()` 안전 처리

**파일**: 4개 컨트롤러

---

## 3. [Major] 예외 무시 코드 수정 + GlobalExceptionHandler 통합

**문제**: `catch (Exception ignored) {}`, `catch (IllegalArgumentException ignored) {}` — 예외를 무시하거나 컨트롤러마다 개별 try/catch

**수정**:
- `DashboardController`: `catch (Exception ignored)` → `log.warn()` + 데드코드 제거
- enum `valueOf()` try/catch **5곳 제거** → `GlobalExceptionHandler`의 `IllegalArgumentException` 핸들러가 공통 처리 (400 Bad Request + 메시지)

**파일**: `DashboardController.java`, `ComplexMemberController.java`, `CalendarController.java`, `CustomerController.java`, `SurveyController.java`

---

## 4. [Major] @Transactional 누락 수정

**문제**: 다중 save 작업에 트랜잭션 미적용 → 중간 실패 시 데이터 불일치

**수정**:
| 메서드 | save 횟수 |
|---|---|
| `AttendanceService.processBulkAttendance` | attendance + membership + activityLog |
| `ComplexMemberService.assignMembership` | membership + member |
| `MessageTemplateService.setDefault` | 루프 내 다중 save |

**파일**: 3개 서비스 (서비스 레이어 이동 후 `@Transactional` 적용)

---

## 5. [Major] CORS 환경별 설정 분리

**문제**: `SecurityConfig`에 `localhost:3000` 하드코딩

**수정**:
- `application.yml`에 `app.cors.allowed-origins` 프로퍼티 추가
- 기본값: `http://localhost:3000`
- 배포 시 `CORS_ALLOWED_ORIGINS` 환경변수로 오버라이드

**파일**: `SecurityConfig.java`, `application.yml`

---

## 6. BaseTimeEntity 공통화

**문제**: 29개 엔티티가 `createdDate`/`lastUpdateDate` + `@PrePersist`/`@PreUpdate`를 각각 구현. `@PreUpdate` 미구현 엔티티 22개 (수정일 자동 추적 안 됨)

**수정**:
- `BaseTimeEntity` (`@MappedSuperclass`) 생성
- 29개 엔티티에서 개별 날짜 필드 + 콜백 제거, `extends BaseTimeEntity` 적용
- `@Column(name=...)` 제거 → Spring naming strategy 통일 (`created_date`, `last_update_date`)
- `LocalDate` → `LocalDateTime` 타입 통일

**효과**:
- ~170줄 중복 코드 제거
- 22개 엔티티에 `@PreUpdate` 자동 수정일 추적 일괄 적용
- MyBatis 매퍼 XML과 컬럼명 일치 확인

**파일**: `BaseTimeEntity.java` (신규), 29개 엔티티, 3개 DTO

---

## 7. 서비스 레이어 도입

**문제**: 컨트롤러가 Repository를 직접 참조하며 비즈니스 로직 수행 (서비스는 Auth/Sms 2개뿐)

**수정**: 17개 서비스 클래스 신규 생성, 기존 2개 확장

| 서비스 | 주요 메서드 |
|---|---|
| `AttendanceService` | bulk 출석, CRUD, reorder |
| `ComplexMemberService` | 회원 CRUD, 멤버십 할당, 수업 배정 |
| `CustomerService` | 고객 CRUD, 통화 처리, 예약 생성 |
| `SurveyService` | 설문 전체 CRUD (템플릿/섹션/질문/선택지), 복제 |
| `MessageTemplateService` | 템플릿 CRUD, 기본 설정, 플레이스홀더 |
| `CalendarService` | 예약 조회, 상태 변경 |
| `BranchService` | 지점 CRUD, alias 조회 |
| `NoticeService` | 공지 CRUD, 조회수 |
| `ComplexClassService` | 수업 CRUD, auto-sortOrder |
| `ClassTimeSlotService` | 시간대 CRUD |
| `ComplexStaffService` | 스태프 CRUD, 환불정보 |
| `PostponementService` | 연기 생성/상태변경/사유 |
| `RefundService` | 환불 생성/상태변경 |
| `PublicPostponementService` | 회원검색/제출 |
| `UserService` | 사용자 CRUD/권한/비밀번호 |
| `WebhookConfigService` | 웹훅 CRUD |
| `SettingsService` | 예약SMS 설정 |
| `IntegrationService` | 연동/SMS 설정 |
| `MembershipService` | 멤버십 CRUD |
| `KakaoSyncService` | URL 생성 |

**결과**: AuthController 1개를 제외한 모든 컨트롤러에서 Repository 직접 참조 제거

---

## 8. N+1 쿼리 최적화

**문제**: 루프 내 개별 쿼리로 인한 성능 저하

| 서비스.메서드 | Before | After |
|---|---|---|
| `PublicPostponementService.searchMember` | N회원 → 2N 추가 쿼리 | 2~3 고정 쿼리 (배치 + 캐싱) |
| `SurveyService.copyTemplate` | 63+ 개별 save | 3 saveAll 배치 |
| `SurveyService.reorderQuestions` | 2N (findById + save) | 2 (findAllById + saveAll) |
| `AttendanceService.reorderClasses` | 2N (findById + save) | 2 (findAllById + saveAll) |
| `AttendanceService.bulkAttendance` | 50회원 → 200+ 쿼리 | 4 프리로드 + 개별 write |

**핵심 기법**:
- `findByMemberSeqIn()` — 배치 프리로드 (Repository 메서드 추가)
- `findAllById()` + `saveAll()` — JPA 배치
- `Map<Long, Entity>` — 인메모리 룩업으로 쿼리 대체
- `computeIfAbsent` — 지점별 수업 캐싱

---

## 9. @Valid 입력 검증 추가

**문제**: 대부분의 Request DTO에 `@NotBlank`/`@NotNull` 미적용, 컨트롤러에서 수동 null 체크

**수정**:
- 24개 Request DTO에 `@NotBlank`/`@NotNull` 어노테이션 추가
- 15개 컨트롤러에 `@Valid @RequestBody` 적용
- 5곳의 수동 null 체크 제거 (검증 어노테이션으로 대체)
- `GlobalExceptionHandler.handleValidation()`이 400 Bad Request 자동 응답

---

## 10. Map<String,String> → 명시적 DTO 분리

**문제**: 컨트롤러가 `@RequestBody Map<String, String>`으로 요청을 받아 타입 안전성 없음

**수정**:
- `CalendarController.updateReservationStatus` → `ReservationStatusRequest` DTO
- `SurveyController.updateStatus` → `SurveyStatusRequest` DTO
- 각 DTO에 `@NotBlank` 검증 포함

---

## 11. 수동 setLastUpdateDate 호출 제거

**문제**: `BaseTimeEntity`의 `@PreUpdate`가 자동 처리하는데, 서비스에서 수동 호출 잔재

**수정**: `SurveyService`, `NoticeService`, `ComplexStaffService`에서 `setLastUpdateDate(LocalDateTime.now())` 3곳 제거

---

## 미처리 항목 (Low 우선순위)

| 항목 | 사유 |
|---|---|
| 테스트 코드 (258 소스 / 2 테스트) | 기능 개발과 병행 작성이 효율적 |
| AuthController Repository 직접 참조 | 로그인 흐름 특성상 유지 적절 |
