# Legacy (Go) → New (Spring Boot + Next.js) 마이그레이션 호환성 분석

> 분석일: 2026-04-05 (업데이트)

## 종합 호환률

| 항목 | 호환률 |
|------|--------|
| API 엔드포인트 | **~99%** |
| DB 스키마 | **~100%** |
| 비즈니스 로직 | **~99%** |
| **종합** | **~99%** |

---

## API 엔드포인트 호환성

| 도메인 | Legacy (Go) | Backend (Spring) | Frontend | 상태 |
|--------|------------|-------------------|----------|------|
| 인증 (login/logout/me) | 3 | 4 | O | **완료** |
| 지점 관리 | 5 | 5 | O | **완료** |
| 고객 관리 | 8 | 10 | O | **완료** |
| 대시보드 | 2 | 2 | O | **완료** |
| 수업 관리 | 5 | 5 | O | **완료** |
| 시간대 | 4 | 4 | O | **완료** |
| 회원 관리 | 7 | 10 | O | **완료** |
| 멤버십 | 5 | 5 | O | **완료** |
| 스태프 관리 | 5 | 8 | O | **완료** (+환급정보) |
| 출석 관리 | 4 | 8 | O | **완료** (+히스토리) |
| 연기 요청 | 6 | 8 | O | **완료** |
| 환불 요청 | 3 | 3 | O | **완료** |
| 공지사항 | 5 | 5 | O | **완료** |
| 메시지 템플릿 | 6 | 7 | O | **완료** |
| 연동 관리 (SMS) | 6 | 3 | O | **완료** |
| 설정 | 3 | 4 | O | **완료** |
| 캘린더 | 2 | 2 | O | **완료** |
| 설문 관리 | 12 | 19 | O | **완료** (섹션/질문/옵션 분리) |
| 웹훅 | 0 | 6 | O | **신규 기능** |
| 카카오싱크 | 3 | 2 | O | **완료** |
| 공개 연기 요청 | 3 | 3 | O | **완료** |
| 공개 게시판 | 6 | 6 | O | **완료** |
| 외부 서비스 (SMS) | 2 | 2 | O | **완료** |
| 설문 제출 (공개) | 2 | 1 | O | **완료** (DB 기반, Legacy는 Mock) |
| 공개 환불 요청 | 2 | 2 | O | **완료** |
| 공개 멤버십 조회 | 2 | 1 | O | **완료** (실제 출석 데이터, Legacy는 Mock) |

---

## DB 테이블 호환성

| Legacy 테이블 | Spring Entity | 상태 |
|--------------|--------------|------|
| branches | Branch | O |
| user_info | UserInfo | O |
| customers | Customer | O |
| reservation_info | ReservationInfo | O |
| caller_selection_history | CallerSelectionHistory | O |
| message_templates | MessageTemplate | O |
| reservation_sms_config | ReservationSmsConfig | O |
| placeholders | Placeholder | O |
| notices | Notice | O |
| third_party_services | ThirdPartyService | O |
| branch_third_party_mapping | BranchThirdPartyMapping | O |
| mymunja_config_info | MymunjaConfigInfo | O |
| class_time_slots | ClassTimeSlot | O |
| complex_classes | ComplexClass | O |
| complex_staffs | ComplexStaff | O |
| complex_staff_attendance | ComplexStaffAttendance | O |
| complex_staff_class_mapping | ComplexStaffClassMapping | O |
| complex_staff_refund_info | ComplexStaffRefundInfo | O |
| complex_members | ComplexMember | O |
| complex_member_attendance | ComplexMemberAttendance | O |
| complex_member_class_mapping | ComplexMemberClassMapping | O |
| complex_member_memberships | ComplexMemberMembership | O |
| membership_activity_log | MembershipActivityLog | O |
| memberships | Membership | O |
| complex_postponement_requests | ComplexPostponementRequest | O |
| complex_postponement_reasons | ComplexPostponementReason | O |
| complex_postponement_status_history | ComplexPostponementStatusHistory | O |
| complex_refund_requests | ComplexRefundRequest | O |
| survey_templates | SurveyTemplate | O |
| survey_template_questions | SurveyTemplateQuestion | O (+Section 분리) |
| survey_template_options | SurveyTemplateOption | O |
| survey_template_settings | SurveyTemplateSettings | O |
| external_service_type | ExternalServiceType | O |
| - | SurveySubmission | **신규** (설문 제출 저장, Legacy는 Mock) |
| - | WebhookConfig | **신규** |
| - | WebhookLog | **신규** |

---

## 신규 기능 (New에만 있는 것)

| 기능 | 비고 |
|------|------|
| **웹훅 시스템** | 외부 서비스 연동용 webhook config + log |
| **출석 히스토리 API** | 회원/스태프별 개인 출석 기록 페이징 조회 |
| **설문 섹션 분리** | Legacy는 질문에 section 필드, New는 별도 SurveyTemplateSection 엔티티 |
| **설문 제출 DB 저장** | Legacy는 메모리 Mock 저장, New는 survey_submissions 테이블에 영구 저장 |
| **멤버십 조회 실제 데이터** | Legacy는 Mock 출석 데이터, New는 실제 출석 기록 기반 |
| **스태프 환급정보** | 별도 CRUD |
| **CQRS 패턴** | 읽기/쓰기 컨트롤러 분리, MyBatis 조회 최적화 |

---

## Legacy에서 의도적으로 제외한 항목

| 항목 | 사유 |
|------|------|
| entity_labels 테이블 | 범용 메타데이터, 실제 사용처 없음 |

---

## 아키텍처 비교

| 항목 | Legacy (Go) | New (Spring Boot + Next.js) |
|------|------------|---------------------------|
| 언어 | Go | Java 17 + TypeScript |
| 프레임워크 | Gin/http.ServeMux | Spring Boot 3.4 + Next.js 14 |
| 렌더링 | 서버사이드 (Go 템플릿) | SPA (Next.js App Router) |
| DB 접근 | 직접 SQL | JPA + MyBatis (CQRS) |
| 인증 | 세션 기반 | Spring Security 세션 기반 |
| DB | MySQL | local: H2 / stg,prod: MySQL |
| API 문서 | Swagger | Swagger UI |
| API 스타일 | 혼합 (페이지+API) | REST API 전용 |
