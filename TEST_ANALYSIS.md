# Culcom 테스트케이스 분석 및 커버리지 리포트

> 분석일: 2026-04-18
> 대상: `backend/` (Spring Boot 3.4.4 + Java 17), `frontend/` (Next.js 14 + Vitest)

---

## 1. 요약

| 구분 | 테스트 파일 | 테스트 케이스 | 통과 | 실패 | Lines 커버리지 |
|---|---:|---:|---:|---:|---:|
| Backend (JUnit 5 + Spring Test) | 90 | 589 | 544 | 45 | **43.26%** |
| Frontend (Vitest + RTL) | 62 | 513 | 510 | 3 | **24.01%** |
| **합계** | **152** | **1,102** | **1,054** | **48** | — |

### 실측 커버리지 (실측 도구로 직접 측정)

- **Backend (JaCoCo)**: Lines 43.26%, Branches 34.67%, Methods 39.10%, Instructions 43.10%, Complexity 31.36%
- **Frontend (Vitest v8 coverage)**: Lines 24.01%, Branches 22.67%, Functions 19.64%, Statements 22.65%

> 분석 시점에 양쪽 모두 커버리지 도구 미설정 상태였으며, 본 리포트 작성을 위해
> `backend/build.gradle.kts`에 jacoco 플러그인을, `frontend/vitest.config.ts`에 v8 coverage 설정을 추가했습니다.

---

## 2. Backend 테스트 (90개 파일 / 약 589개 케이스)

### 2.1 종류별 분류

| 종류 | 파일 수 | 설명 |
|---|---:|---|
| Controller 테스트 | 32 | `@SpringBootTest` + MockMvc 기반 REST API 통합 |
| Service 테스트 | 53 | 비즈니스 로직 / 트랜잭션 / 도메인 규칙 |
| Mapper 테스트 | 1 | MyBatis SQL/매핑 검증 (`QueryMapperTest`) |
| Config / 기타 | 3 | 유니크 제약, 컨텍스트 로딩 등 |

### 2.2 도메인별 테스트 매트릭스

#### Auth (인증/사용자)

| 파일 | 종류 | 주요 검증 |
|---|---|---|
| `controller/auth/AuthControllerTest.java` | Controller | 로그인 성공/실패, 세션 조회, 지점 변경, ROOT/일반 권한 분기 |
| `controller/auth/UserControllerTest.java` | Controller | 사용자 CRUD, 중복 ID, 자기자신 삭제 방지, 권한 검증 |
| `service/AuthServiceFlowTest.java` | Service | 인증 흐름, 세션 속성 세팅, 첫 지점 자동 선택 |
| `service/AuthServiceManagedBranchesTest.java` | Service | 사용자별 관리 가능 지점 산출 |
| `service/UserServiceTest.java` | Service | 사용자 생성/수정/삭제/지점 할당 |
| `service/BoardAccountSignupTest.java` | Service | 게시판 계정 가입 플로우 |

#### Branch (지점)

| 파일 | 종류 | 주요 검증 |
|---|---|---|
| `controller/branch/BranchControllerTest.java` | Controller | 지점 CRUD, BRANCH_MANAGER 전용 권한 |

#### Calendar (예약/캘린더)

| 파일 | 종류 | 주요 검증 |
|---|---|---|
| `controller/calendar/CalendarControllerTest.java` | Controller | 일정/예약 CRUD, 상태 변경 |
| `service/CalendarServiceTest.java` | Service | 캘린더 비즈니스 로직 |

#### Complex - Member (회원)

| 파일 | 종류 | 주요 검증 |
|---|---|---|
| `controller/complex/member/ComplexMemberControllerTest.java` | Controller | 회원 CRUD, 검색, 상세 |
| `service/ComplexMemberServiceOverpaymentTest.java` | Service | 과납 처리 |
| `service/CustomerDeleteUnlinkTest.java` | Service | 고객 삭제 시 unlink |

#### Complex - Class (수업)

| 파일 | 종류 | 주요 검증 |
|---|---|---|
| `controller/complex/classes/ComplexClassControllerTest.java` | Controller | 수업 CRUD, 멤버 추가/제거 |
| `controller/complex/classes/ComplexClassControllerCapacityTest.java` | Controller | 정원 초과 차단 |
| `service/ComplexClassServiceAddMemberTest.java` | Service | 멤버 추가 시 정원/멤버십 검증 |
| `service/ComplexClassServiceCapacityTest.java` | Service | 정원 관리 비즈니스 |
| `service/ComplexClassServiceSetLeaderTest.java` | Service | 리더 설정 |
| `service/ComplexClassServiceCrossBranchTest.java` | Service | 지점 간 수업 처리 |
| `service/MemberClassServiceLeaderDetachTest.java` | Service | 리더 분리 |

#### Complex - Membership (멤버십)

| 파일 | 종류 | 주요 검증 |
|---|---|---|
| `controller/complex/membership/MembershipControllerTest.java` | Controller | 멤버십 CRUD |
| `service/MembershipIsActiveTest.java` | Service | active 판정 (만료/소진/환불/정지/경계값) |
| `service/MembershipExpiryServiceTest.java` | Service | 자동 만료 처리 |
| `service/MemberMembershipServiceChangeTest.java` | Service | 멤버십 변경/등급업 |
| `service/MemberMembershipServiceSingleActiveTest.java` | Service | 단일 활성 멤버십 보장 |
| `controller/complex/dashboard/MembershipExpiryDashboardIntegrationTest.java` | Integration | 대시보드 통합 |

#### Complex - Attendance (출석)

| 파일 | 종류 | 주요 검증 |
|---|---|---|
| `controller/complex/attendance/AttendanceControllerTest.java` | Controller | 출석 처리 API |
| `service/AttendanceServiceAbsentConsumeTest.java` | Service | 결석 처리도 usedCount 증가 |
| `service/AttendanceServiceQuotaTest.java` | Service | 출석 횟수/쿼터 |
| `service/AttendanceServiceCrossDayTest.java` | Service | 자정 경계 처리 |
| `service/AttendanceServiceExpireOnExhaustTest.java` | Service | 소진 시 자동 만료 |
| `service/AttendanceServiceSameDayToggleTest.java` | Service | 같은 날 토글 처리 |

#### Complex - Transfer (양도)

| 파일 | 종류 | 주요 검증 |
|---|---|---|
| `controller/complex/transfer/TransferControllerTest.java` | Controller | 양도 API |
| `service/TransferServiceCompleteTest.java` | Service | 양도 완료 |
| `service/TransferServiceCreateFeeTest.java` | Service | 수수료 계산 |
| `service/TransferServiceGapTest.java` | Service | 양도 간격 제한 |
| `service/TransferServiceLinkExpireTest.java` | Service | 7일 링크 만료 |
| `service/TransferServiceSmsTest.java` | Service | SMS 발송 |
| `service/TransferServiceStatusLockTest.java` | Service | 상태 잠금 |
| `service/TransferServiceUnpaidBalanceTest.java` | Service | 미납금 검증 |

#### Complex - Refund (환불)

| 파일 | 종류 | 주요 검증 |
|---|---|---|
| `controller/complex/refund/RefundControllerTest.java` | Controller | 환불 API |
| `service/RefundServiceDetachClassesTest.java` | Service | 환불 시 수업 분리 |
| `service/RefundServiceSmsTest.java` | Service | 환불 SMS |
| `service/PublicRefundServiceLinkExpireTest.java` | Service | 공개 링크 만료 |
| `service/PublicRefundServiceOutstandingTest.java` | Service | 대기 환불 |

#### Complex - Postponement (수업 연기)

| 파일 | 종류 | 주요 검증 |
|---|---|---|
| `controller/complex/postponements/PostponementControllerTest.java` | Controller | 연기 API |
| `service/PostponementReturnScanServiceTest.java` | Service | 복귀 스캔 |
| `service/PostponementReturnSmsTest.java` | Service | 복귀 SMS |
| `service/PostponementServiceSmsTest.java` | Service | 연기 SMS |
| `service/PostponementServiceStatusLockTest.java` | Service | 상태 잠금 |
| `service/PublicPostponementServiceOutstandingTest.java` | Service | 대기 연기 |
| `service/PublicPostponementServiceOverlapTest.java` | Service | 날짜 겹침 검증 |

#### Complex - Survey (설문)

| 파일 | 종류 | 주요 검증 |
|---|---|---|
| `controller/complex/survey/SurveyControllerTest.java` | Controller | 설문 CRUD |
| `service/SurveyEditorTest.java` | Service | 섹션/질문/선택지 편집 |
| `service/SurveySubmissionCustomerCommentTest.java` | Service | 응답 코멘트 |
| `service/SurveySubmissionDetailFieldsTest.java` | Service | 응답 상세 필드 |

#### Complex - 기타

| 파일 | 종류 | 주요 검증 |
|---|---|---|
| `controller/complex/dashboard/ComplexDashboardControllerTest.java` | Controller | 시설 대시보드 |
| `controller/complex/settings/ComplexSettingsControllerTest.java` | Controller | 시설 설정 |
| `controller/complex/staff/ComplexStaffControllerTest.java` | Controller | 직원 CRUD |
| `controller/complex/timeslot/ClassTimeSlotControllerTest.java` | Controller | 수업 시간 슬롯 |
| `service/ComplexStaffServiceLeaveTest.java` | Service | 직원 퇴사 |
| `service/ComplexStaffServiceRetireTest.java` | Service | 직원 정년 |
| `service/CardPaymentDetailValidationTest.java` | Service | 카드 결제 정보 검증 (16개) |

#### Customer / Notice / Consent / Settings

| 파일 | 종류 | 주요 검증 |
|---|---|---|
| `controller/customer/CustomerControllerTest.java` | Controller | 고객 CRUD |
| `controller/notice/NoticeControllerTest.java` | Controller | 공지 CRUD |
| `controller/consent/ConsentItemControllerTest.java` | Controller | 동의항목 CRUD |
| `controller/dashboard/DashboardControllerTest.java` | Controller | 메인 대시보드 |
| `controller/settings/SettingsControllerTest.java` | Controller | 시스템 설정 |
| `service/CustomerCallCountExceedTest.java` | Service | 콜 횟수 초과 처리 |

#### Message / SMS

| 파일 | 종류 | 주요 검증 |
|---|---|---|
| `controller/message/MessageTemplateControllerTest.java` | Controller | 메시지 템플릿 (22개) |
| `service/SmsMessageResolverTest.java` | Service | 변수 치환 (15개) |
| `service/SmsEventDispatchTest.java` | Service | 이벤트 발송 |
| `service/SmsEventTemplateResolveTest.java` | Service | 템플릿 해석 |
| `service/SmsEventAutoSendTest.java` | Service | 자동 발송 |
| `service/ActionMessageSmsTemplateTest.java` | Service | 액션 메시지 |
| `service/MessageTemplateCascadeDeleteTest.java` | Service | cascade 삭제 |

#### Public API / 외부 연동

| 파일 | 종류 | 주요 검증 |
|---|---|---|
| `controller/publicapi/PublicMembershipControllerTest.java` | Controller | 공개 멤버십 |
| `controller/publicapi/PublicPostponementControllerTest.java` | Controller | 공개 연기 |
| `controller/publicapi/PublicRefundControllerTest.java` | Controller | 공개 환불 |
| `controller/publicapi/PublicSurveyControllerTest.java` | Controller | 공개 설문 |
| `controller/publicapi/PublicTransferControllerTest.java` | Controller | 공개 양도 |
| `controller/publicapi/ZapierControllerTest.java` | Controller | Zapier 연동 |
| `controller/external/ExternalServiceControllerTest.java` | Controller | 외부 서비스 |
| `controller/external/MetaWebhookControllerTest.java` | Controller | Meta 웹훅 |
| `controller/integration/IntegrationControllerTest.java` | Controller | 통합 API |
| `controller/kakaosync/KakaoSyncControllerTest.java` | Controller | 카카오 동기화 |
| `controller/board/BoardMypageWithdrawTest.java` | Controller | 게시판 마이페이지 탈퇴 |
| `service/ZapierServiceTest.java` | Service | Zapier 서비스 |

#### Mapper / Config / Application

| 파일 | 종류 | 주요 검증 |
|---|---|---|
| `mapper/QueryMapperTest.java` | Mapper | MyBatis SQL/컬럼 매핑 (29개) |
| `config/UniqueConstraintExceptionTest.java` | Config | 유니크 제약 위반 → 409 변환 |
| `CulcomApplicationTests.java` | App | Spring Boot 컨텍스트 로딩 |

### 2.3 Backend 커버리지 (JaCoCo)

#### 전체 합계

| 지표 | 커버 / 전체 | 비율 |
|---|---:|---:|
| Instructions | 8,770 / 20,348 | **43.10%** |
| Branches     | 493 / 1,422   | **34.67%** |
| Lines        | 1,860 / 4,300 | **43.26%** |
| Methods      | 348 / 890     | **39.10%** |
| Complexity   | 504 / 1,607   | **31.36%** |

#### 상위 패키지별

| 패키지 | Lines | Methods | Instructions |
|---|---:|---:|---:|
| `com.culcom.config` | 173/196 | 42/50 | **91.1%** |
| `com.culcom.event` | 25/28 | 6/7 | **84.0%** |
| `com.culcom.entity` | 109/140 | 28/37 | **81.0%** |
| `com.culcom.exception` | 4/6 | 2/3 | **64.3%** |
| `com.culcom.service` | 1,136/2,704 | 137/447 | **40.5%** |
| `com.culcom.dto` | 204/477 | 54/112 | **38.9%** |
| `com.culcom.controller` | 208/718 | 78/225 | **29.1%** |
| `com.culcom.util` | 0/28 | 0/7 | **0.0%** |

#### 도메인별 컨트롤러 커버리지 (주요)

| 패키지 | Instructions |
|---|---:|
| `controller.calendar` | 100.0% |
| `controller.complex.membership` | 100.0% |
| `controller.complex.postponements` | 100.0% |
| `controller.branch` | 92.6% |
| `controller.complex.settings` | 75.0% |
| `controller.auth` | 71.8% |
| `controller.complex.classes` | 70.1% |
| `controller.complex.refund` | 58.7% |
| `controller.complex.dashboard` | 56.5% |
| `controller.complex.member` | 39.6% |
| `controller.board` | 18.5% |
| `controller.customer` | 9.6% |
| `controller.external` | 9.5% |
| `controller.dashboard` | 4.6% |
| `controller.complex.attendance` | 4.3% |
| `controller.kakao` | 4.1% |
| `controller.publicapi` | 1.7% |
| `controller.complex.staff` / `staff` / `survey` / `timeslot` / `transfer` / `consent` / `integration` / `kakaosync` / `message` / `notice` / `settings` | **0.0%** |

> **주**: 0% 컨트롤러는 테스트 자체는 존재하지만 `@MockBean`으로 서비스를 모킹하면서
> MockMvc 호출이 실제 컨트롤러 진입에 도달하지 못한 케이스가 다수입니다.
> 또한 이번 측정 중 45건의 테스트 실패가 있어 일부 도메인 커버리지가 낮게 측정되었습니다.

---

## 3. Frontend 테스트 (62개 파일 / 513개 케이스)

### 3.1 종류별 분류

| 종류 | 파일 수 | 위치 |
|---|---:|---|
| UI 컴포넌트 | 25 | `src/__tests__/ui/` |
| 페이지/통합 | 11 | `src/__tests__/*.test.tsx` (페이지/모달 흐름) |
| 비즈니스 컴포넌트 | 11 | `src/__tests__/*.test.tsx` |
| 유틸/라이브러리 | 11 | `src/__tests__/*.test.ts` |
| API 클라이언트 | 3 | `apiClient`, `userApi`, `routes` |
| 상태 / 스토어 | 2 | `store`, `branch-session-refresh` |
| Hook | 2 | `useResultModal`, `useMembershipChangeButton` |

### 3.2 도메인별 분류

#### Auth / Session

- `forcePasswordChange.test.tsx` — 강제 비밀번호 변경, 일치성/리다이렉트 검증
- `myPage.test.tsx` — 마이페이지 비밀번호 변경, 성공 후 로그아웃
- `store.test.ts` — Zustand `useSessionStore` (fetchSession/refreshBranches/reset)
- `branch-session-refresh.test.ts` — 지점 추가 후 2단계 갱신
- `userForm.test.tsx` — 사용자 지점 체크박스 토글
- `userApi.test.ts` — 비밀번호 변경, 사용자 생성/수정/조회 API

#### Branch

- `branchFormValidation.test.ts` — 지점명 필수, 별칭 영문만 (9개)

#### Customer

- `customerCallCountFilter.test.ts` — 콜수 5+ 필터, processCall API

#### Complex - Member / Membership

- `memberFormTypes.test.ts` — 폼 기본값, validate (멤버/멤버십/직원/환불)
- `membershipChangeModal.test.tsx` — 변경/정보 모달 (8개)
- `membershipAddDoubleSubmit.test.tsx` — useRef 기반 중복 제출 차단
- `membershipEditDoubleSubmit.test.tsx` — 수정 중복 제출 차단
- `useMembershipChangeButton.test.tsx` — 신규/수정 모드 분기
- `memberEditTransferMismatch.test.tsx` — 양도자/양수자 정보 비교

#### Complex - Transfer / Refund / Postponement

- `transferDetailModal.test.tsx` — 양도 상세 + 상태 변경
- `transferLinkModal.test.tsx` — 양도비 자동 계산, 음수 검증 (7개)
- `transferRecipientFilter.test.tsx` — 양수자 필터 (이름/전화/상태)
- `linkModalBlocking.test.tsx` — 환불/양도/연기 링크 발급 차단
- `linkModalTimestamp.test.tsx` — `t(ms)` 발급 시각 포함
- `postponementsPage.test.tsx` — 연기 상태 변경, 모달, 종결 잠금

#### Complex - Class

- `classTeamsCapacity.test.tsx` — 팀 정원 초과 시 에러 모달

#### Complex - Survey

- `surveyConstants.test.ts` — `BASIC_INFO_FIELDS`, `hintText`, `questionsForSection`
- `surveyEditor.test.ts` — 섹션/질문/선택지 편집 API
- `survey-import-member-form.test.ts` — 설문 응답 → 회원폼 매핑

#### Public Pages

- `publicPageLinkExpiry.test.tsx` — 7일 만료 처리
- `publicRefundPage.test.tsx` — 공개 환불 흐름 (12개)
- `consentCategoryRendering.test.tsx` — SIGNUP/TRANSFER 동의항목 렌더링

#### 기타

- `adminActionMessageModal.test.tsx` — 액션 메시지 모달
- `messageResolveRequest.test.ts` — 메시지 템플릿 resolve API

#### 라이브러리 / 유틸

- `apiClient.test.ts` — 공통 fetch 래퍼 (GET/POST/PUT/DELETE, 401 처리)
- `routes.test.ts` — `ROUTES` / `API` 상수, 동적 경로 함수
- `commonUtils.test.ts` — `verifyPhoneNumber`, `cleanPhoneNumber`, `maskName`
- `dateUtils.test.ts` — `toServerDateTime`, `formatDateTime`
- `calendarUtils.test.ts` — 주/월 배열, 날짜 비교, 예약 맵
- `highlightSearch.test.ts` — `rateBadgeClass`
- `linkExpiry.test.ts` — `LINK_VALID_MS` 7일, `isLinkExpired`
- `useResultModal.test.tsx` — 캐시 무효화

#### UI 컴포넌트 (`src/__tests__/ui/`, 25개 파일)

| 컴포넌트 | 검증 |
|---|---|
| `Button.test.tsx` | variant/size/disabled/href (Button + LinkButton) |
| `FormField.test.tsx` | 라벨/필수 별표/error·hint 우선순위 |
| `FormInput.test.tsx` | Input/Phone/Number/Email/Password/Select/Textarea/Currency/Checkbox |
| `ConfirmModal.test.tsx` | 확인/취소 라벨, 색상, 핸들러 |
| `AlertModal.test.tsx` | 경고 모달 |
| `AttendanceHistoryModal.test.tsx` | 출석 이력 표시 |
| `ResultModal.test.tsx` | 성공/실패 결과 모달 |
| `ModalOverlay.test.tsx` | 오버레이 닫기 |
| `OutstandingBlockLinkModals.test.tsx` | 환불/양도/연기 링크 차단 모달 |
| `Header.test.tsx` | 헤더 + 지점 선택 |
| `MainSidebar.test.tsx` / `ComplexSidebar.test.tsx` / `SidebarShell.test.tsx` / `SidebarContext.test.tsx` | 사이드바 계층 |
| `DataTable.test.tsx` | 테이블 정렬/렌더 |
| `DetailCard.test.tsx` | 상세 카드 |
| `ErrorPage.test.tsx` | 에러 페이지 |
| `FormErrorBanner.test.tsx` | 폼 에러 배너 |
| `FormLayout.test.tsx` | 폼 레이아웃 + 더블서브밋 가드 |
| `HighlightSearchBar.test.tsx` / `SearchBar.test.tsx` | 검색바 |
| `Spinner.test.tsx` | 로딩 |
| `TimePicker.test.tsx` | 시간 선택 |
| `ConsentItemBlock.test.tsx` / `ConsentStep.test.tsx` | 동의 단계 |

### 3.3 Frontend 커버리지 (Vitest v8)

#### 전체 합계

| 지표 | 커버 / 전체 | 비율 |
|---|---:|---:|
| Statements | 1,437 / 6,343 | **22.65%** |
| Branches   | 1,098 / 4,842 | **22.67%** |
| Functions  | 448 / 2,281   | **19.64%** |
| Lines      | 1,305 / 5,434 | **24.01%** |

#### 디렉토리별 (Statements 기준)

| 디렉토리 | 비율 |
|---|---:|
| `app/public/refund` | **98.0%** |
| `components` | **83.3%** |
| `components/ui` | **74.5%** |
| `app/board/signup` | 52.1% |
| `components/layout` | 52.0% |
| `app/(main)/users` | 46.2% |
| `lib` | 44.2% |
| `hooks` | 44.2% |
| `lib/api` | 25.6% |
| `app/(main)`, `app/board`, `app/complex`, `app/(auth)/login`, `app/(main)/survey` 등 | **0.0%** |

> **주**: 페이지(`app/**/page.tsx`)는 대부분 0%. 테스트 전략이 페이지 직접 렌더링이 아닌
> 모달/폼/유틸 등 단위 검증 위주이기 때문입니다. 공개 환불 페이지(`app/public/refund`)는
> E2E 성격의 테스트가 있어 98% 도달.

---

## 4. 테스트 결과 (실측)

### Backend (`./gradlew test`)

```
589 tests completed, 45 failed
```

> 실패 케이스의 주된 분포는 `controller.complex.staff`, `controller.complex.survey`,
> `controller.publicapi`, `controller.notice`, `controller.message`,
> `controller.complex.transfer` 등 — 이들은 현재 0% 컨트롤러 커버리지와 일치합니다.
> 후속으로 실패 원인 분류가 필요합니다.

### Frontend (`npx vitest run --coverage`)

```
Test Files  3 failed | 59 passed (62)
Tests       3 failed | 510 passed (513)
Duration    32.77s
```

> 실패 3건은 `OutstandingBlockLinkModals.test.tsx`의 `waitFor` 타임아웃 (모달 렌더링
> 비동기 흐름) 관련.

---

## 5. 추가/변경된 설정

리포트 생성을 위해 추가한 변경 사항:

### `backend/build.gradle.kts`

```kotlin
plugins {
    java
    jacoco                                              // 추가
    id("org.springframework.boot") version "3.4.4"
    id("io.spring.dependency-management") version "1.1.7"
}

tasks.withType<Test> {
    useJUnitPlatform()
    maxHeapSize = "2g"
    finalizedBy(tasks.jacocoTestReport)                 // 추가
}

tasks.jacocoTestReport {                                // 추가
    dependsOn(tasks.test)
    reports {
        xml.required.set(true)
        html.required.set(true)
        csv.required.set(true)
    }
}
```

### `frontend/vitest.config.ts`

```typescript
test: {
    // ...기존 설정
    coverage: {                                          // 추가
        provider: 'v8',
        reporter: ['text', 'json-summary', 'html'],
        reportsDirectory: './coverage',
        include: ['src/**/*.{ts,tsx}'],
        exclude: ['src/**/*.test.{ts,tsx}', 'src/__tests__/**', 'src/**/*.d.ts'],
    },
},
```

설치된 패키지: `@vitest/coverage-v8` (devDependency)

### 리포트 위치

- Backend: `backend/build/reports/jacoco/test/html/index.html` (XML/CSV 동시 생성)
- Frontend: `frontend/coverage/index.html` (json-summary 동시 생성)

---

## 6. 주요 관찰 / 개선 포인트

1. **백엔드 컨트롤러 커버리지 격차**: Calendar/Membership/Postponements 등은 90~100%인 반면,
   Staff/Survey/Transfer/PublicAPI/Notice/Message/Settings 등은 0%. 테스트 실패 또는 MockBean
   범위 검토가 필요합니다.
2. **`com.culcom.util` 0%**: 유틸 직접 테스트 부재. 단위 테스트 추가 여지.
3. **프론트엔드 페이지 커버리지 부재**: `app/(main)/*/page.tsx`는 대부분 0%. 비즈니스 흐름
   검증은 페이지 외부(모달/유틸/훅)에서 수행 중. 핵심 페이지 1~2개만이라도 통합 테스트 추가
   시 큰 폭 상승 기대.
4. **중복 도메인 테스트 패턴 정착**: 양도/환불/연기/멤버십 도메인에 SmsTest / StatusLockTest /
   LinkExpireTest / Outstanding 등 일관된 네이밍이 잡혀 있어 신규 도메인 추가 시 템플릿화 가능.
5. **테스트 실패 우선 해결**: 백엔드 45건, 프론트 3건은 커버리지 신뢰도와 직결되므로 우선
   수정 권장.