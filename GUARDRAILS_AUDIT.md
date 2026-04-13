# 방어 로직 감사 체크리스트

이 세션에서 발견된 도메인 무결성 구멍과 수정 진행 상태를 추적합니다.
각 항목은 **우선순위 → 상태 → 원인 → 해결책 → 관련 테스트** 순으로 정리되어 있습니다.

최종 업데이트: 2026-04-11

---

## 📊 진행 상태 대시보드

| 우선순위 | 항목 | 상태 | 실패 → 통과 테스트 | 관련 파일 |
|---|---|---|---|---|
| P0-1 | TransferService.create — isActive 가드 | ✅ 완료 | 7/7 | `TransferService.java`, `TransferServiceGapTest.java` |
| P0-2 | Cross-branch (addMember/setLeader) | ⬜ 미진행 | 0/2 | `ComplexClassService.java`, `ComplexClassServiceCrossBranchTest.java` |
| P0-3 | 연기 기간 Overlap 검증 | ⬜ 미진행 | 0/4 | `PostponementService.java`, `PostponementServiceOverlapTest.java` |
| P1-1 | completeTransfer — 경쟁 조건 (stale state) | ⬜ 미진행 | 0/1 | `TransferService.java`, `TransferServiceGapTest.java::B1` |
| P1-2 | completeTransfer — 자기 자신에게 양도 | ⬜ 미진행 | 0/1 | `TransferService.java`, `TransferServiceGapTest.java::C1` |
| P1-3 | 수업 정원 초과 | ⬜ 정책 확인 필요 | 0/2 | `ComplexClassService.java`, `ComplexClassServiceCapacityTest.java` |
| P2 | SMS 이벤트 확장 (연기/환불/양도) | ⬜ 별도 스프린트 | 0/6 | `SmsEventType.java`, 3개 서비스, `SmsEventDispatchTest.java` |

**체크박스 가이드:** ✅ 완료 / 🟡 진행중 / ⬜ 미진행 / ⛔ 블록됨

---

## 🔴 P0 — 즉시 처리 (데이터 무결성 크리티컬)

### [x] P0-1. `TransferService.create` — 비활성 멤버십 양도 요청 차단

**상태:** ✅ **완료 (2026-04-11)**

#### 원인
`TransferService.create()`는 `transferable`, `transferred`, 미수금만 검증하고 `mm.isActive()`를 보지 않았음. 이미 환불/만료/정지된 멤버십에도 양도 요청 row가 생성되어, 이후 `completeTransfer`에서 엉뚱한 상태의 멤버십을 양수자에게 복제 전달하는 경로가 열려 있었음. 세션 초기에 `PostponementService`/`RefundService`에 넣은 가드와 동일한 패턴의 누락.

#### 해결책 — 적용됨
`TransferService.java:55-59`에 4줄 추가:

```java
// 사용할 수 없는 멤버십(환불/만료/정지/기간소진/횟수소진)은 양도할 수 없다.
// isActive()가 네 가지 비활성 케이스를 단일 진입점으로 판정한다.
if (!mm.isActive()) {
    throw new IllegalStateException("사용할 수 없는 멤버십은 양도할 수 없습니다.");
}
```

중요 배치 포인트: `transferable`/`transferred`/미수금 체크 **앞**에 배치.
이유 — 꼬인 상태(환불 + 양도불가 + 미납)에서 "isActive가 아닌" 메시지가 나가면 운영자가 원인을 잘못 추적할 수 있음. `A7` 테스트가 이 순서를 고정.

#### 관련 테스트 — 7/7 PASS
`backend/src/test/java/com/culcom/service/TransferServiceGapTest.java`

- [x] `A1_status_환불_멤버십에_양도요청_생성은_거부된다`
- [x] `A2_status_만료_멤버십에_양도요청_생성은_거부된다`
- [x] `A3_status_정지_멤버십에_양도요청_생성은_거부된다`
- [x] `A4_만료일이_과거인_활성_멤버십은_양도요청_생성이_거부된다` — `status=활성`이지만 `expiryDate`가 과거인 파생 비활성 케이스
- [x] `A5_횟수_소진된_활성_멤버십은_양도요청_생성이_거부된다` — `usedCount == totalCount`인 파생 비활성 케이스
- [x] `A6_진짜_활성_멤버십은_양도요청이_정상_생성된다` — 양성 비교, `transfer_requests` row 증가 검증
- [x] `A7_환불_AND_양도불가_AND_미납인_멤버십은_isActive_메시지를_먼저_던진다` — 가드 순서 고정

각 거부 테스트는 3가지를 동시에 검증:
1. 예외 타입 + 메시지 내용 (`"사용할 수 없는"`)
2. `transfer_requests` 테이블에 row가 **생성되지 않음** (부작용 없음)
3. 원본 멤버십의 `status`/`usedCount`가 **수정되지 않음** (불변성)

#### 회귀 확인
- `TransferServiceUnpaidBalanceTest`: 4/4 PASS
- `TransferServiceCompleteTest`: 1/1 PASS

---

### [ ] P0-2. `ComplexClassService` — 지점 경계 검증 없음

**상태:** ⬜ 미진행

#### 원인
`addMember`와 `setLeader` 모두 `member.branch.seq == cls.branch.seq` 를 검증하지 않음. 멀티지점 환경에서 관리자가 지점 전환을 잊으면 Branch A 수업에 Branch B 회원이 들어가고, 이후 `branchSeq` 기반 필터링 쿼리들(`AttendanceService`의 배치 프리로드, 대시보드 집계)에서 **"회원 목록에는 안 뜨는데 팀 명단에는 있는"** 유령 데이터 발생.

#### 해결책 — 미적용
**`ComplexClassService.java` addMember (line 108 부근)**
```java
if (!member.getBranch().getSeq().equals(cls.getBranch().getSeq())) {
    throw new IllegalStateException("다른 지점의 회원은 팀에 추가할 수 없습니다.");
}
```

**`ComplexClassService.java` setLeader (line 141 부근, `staffSeq != null` 블록 안)**
```java
if (!newStaff.getBranch().getSeq().equals(cls.getBranch().getSeq())) {
    throw new IllegalStateException("다른 지점의 회원은 리더로 배정할 수 없습니다.");
}
```

두 경우 모두 회원 객체는 이미 로드된 시점이므로 추가 쿼리 없음.

#### 관련 테스트 — 0/2 PASS (현재 모두 실패)
`backend/src/test/java/com/culcom/service/ComplexClassServiceCrossBranchTest.java`

- [ ] `다른_지점_회원을_팀_멤버로_추가할_수_없다`
- [ ] `다른_지점_회원을_팀_리더로_배정할_수_없다`

#### 회귀 리스크
낮음. 기존 `ComplexClassServiceAddMemberTest`/`ComplexClassServiceSetLeaderTest`/`TransferServiceCompleteTest`는 모두 단일 지점에서 fixture를 구성하므로 간섭 없음.

---

### [ ] P0-3. 연기 기간 Overlap 검증 없음

**상태:** ⬜ 미진행

#### 원인
`PostponementService.create`는 postpone 횟수 제한과 멤버십 상태만 검증하고, 이미 승인된 기존 연기 기간과의 **interval overlap**을 보지 않음. 이는 프로젝트 설계 철학과 직접 충돌:

> `ComplexMemberMembership.java:62-65` 주석:
> "오늘 연기 중인지는 `complex_postponement_requests`에서 기간으로 판정한다"

겹친 승인 레코드 2건이 공존하면 이 판정 자체가 모호해짐.

#### 해결책 — 미적용

**① Repository에 overlap 쿼리 추가** (`ComplexPostponementRequestRepository.java`)
```java
@Query("SELECT COUNT(p) > 0 FROM ComplexPostponementRequest p " +
       "WHERE p.memberMembership.seq = :mmSeq " +
       "  AND p.status = com.culcom.entity.enums.RequestStatus.승인 " +
       "  AND p.startDate <= :end " +
       "  AND p.endDate >= :start")
boolean existsApprovedOverlapping(@Param("mmSeq") Long mmSeq,
                                  @Param("start") LocalDate start,
                                  @Param("end") LocalDate end);
```
표준 interval overlap 공식: `A.start <= B.end AND A.end >= B.start`

**② `PostponementService.create`에 검증 추가** (기존 `postponeTotal` 검증 뒤)
```java
if (postponementRepository.existsApprovedOverlapping(
        mm.getSeq(), req.getStartDate(), req.getEndDate())) {
    throw new IllegalStateException("이미 승인된 연기 기간과 겹치는 신청입니다.");
}
```

**③ 일관성을 위해 `PublicPostponementService.submit`에도 동일 가드 권장** (대기 상태로 쌓이기 전에 거절하는 것이 UX에 유리)

#### 관련 테스트 — 2/6 PASS (overlap 4개 실패)
`backend/src/test/java/com/culcom/service/PostponementServiceOverlapTest.java`

- [ ] `완전_동일_구간은_거부되어야_한다`
- [ ] `앞쪽_걸침_구간은_거부되어야_한다`
- [ ] `뒤쪽_걸침_구간은_거부되어야_한다`
- [ ] `완전_포함_구간은_거부되어야_한다`
- [x] `맞닿은_구간_다음날_시작은_허용된다` — 이미 PASS (우연히 맞음)
- [x] `반려된_기존_연기와_겹쳐도_새_신청은_허용된다` — 이미 PASS (우연히 맞음)

현재 통과 2개는 "가드가 없어서 우연히 기대 동작과 일치"한 것. 가드 추가 후에도 **반드시 유지**되어야 함.

#### 회귀 리스크
낮음. 기존 `PostponementServiceLimitTest`/`PostponementServiceStatusTest`는 단일 연기만 사용.

---

## 🟡 P1 — 수정 권장 (판단에 따라 생략 가능)

### [ ] P1-1. `completeTransfer` — 경쟁 조건 (stale state)

**상태:** ⬜ 미진행

#### 원인
`completeTransfer`는 `tr.getMemberMembership()`의 **현재 상태를 재확인하지 않음.** 시나리오:
1. 관리자 A: 양도 요청 생성 (mm 활성, 완납)
2. 관리자 B: 같은 mm을 환불 승인 → `status=환불`, 수업 매핑 제거
3. 관리자 A: 양도 완료 클릭 → 이미 환불된 mm을 `setStatus(만료)`로 덮어씌우고, 양수자에게 "환불된 원본" 에서 파생된 새 멤버십 생성

드물지만 **데이터 부패 경로**이며, 금전 관련 경로라 후유증이 큼.

#### 해결책 — 미적용
`TransferService.java:114` (original 로드 직후)에 4줄 추가:
```java
if (!original.isActive()) {
    throw new IllegalStateException(
        "양도 요청 생성 후 원본 멤버십이 " + original.getStatus() + " 상태로 변경되어 완료할 수 없습니다.");
}
```

진짜 동시성까지 막으려면 `@Version` 낙관적 락 또는 DB 레벨 `SELECT ... FOR UPDATE`가 필요하지만, 실제 빈도가 낮으므로 이번 수정에선 상태 재확인만으로 충분.

#### 관련 테스트 — 0/1 PASS
- [ ] `TransferServiceGapTest::B1_양도요청_생성후_원본멤버십이_환불되면_완료는_거부되어야_한다`

---

### [ ] P1-2. `completeTransfer` — 자기 자신에게 양도

**상태:** ⬜ 미진행

#### 원인
`completeTransfer(tr, newMemberSeq)` 에서 `newMemberSeq == tr.getFromMember().getSeq()`를 검증하지 않음. 자기 자신에게 양도하면 원본 `만료` + 양수자(=양도자) 새 멤버십 생성 → **동일 회원이 만료된 구 멤버십과 활성 신 멤버십을 동시에 갖는 이상한 상태**.

#### 해결책 — 미적용
`TransferService.java:111` 뒤에 3줄:
```java
if (fromMember.getSeq().equals(newMemberSeq)) {
    throw new IllegalStateException("자기 자신에게는 양도할 수 없습니다.");
}
```
(`fromMember` 변수 선언 위치만 앞으로 당기면 됨.)

#### 관련 테스트 — 0/1 PASS
- [ ] `TransferServiceGapTest::C1_자기_자신에게_양도완료는_거부되어야_한다`

---

### [ ] P1-3. 수업 정원 초과

**상태:** ⬜ 미진행 — **정책 확인 필요** 🚩

#### 원인
`ComplexClass.capacity` 필드는 저장만 되고 `addMember`에서 실제 인원 수와 비교하지 않음.

#### 해결책 — 미적용
`ComplexMemberClassMappingRepository`에 카운트 메서드 추가:
```java
long countByComplexClassSeq(Long classSeq);
```

`addMember`의 가드 뒤:
```java
if (cls.getCapacity() != null && cls.getCapacity() > 0) {
    long current = mappingRepository.countByComplexClassSeq(classSeq);
    if (current >= cls.getCapacity()) {
        throw new IllegalStateException(
            String.format("수업 정원이 가득 찼습니다. (%d/%d)", current, cls.getCapacity()));
    }
}
```

#### 판단 필요 사항
- **`capacity` 필드의 의미**: 정보성 표시인가? 엄격한 상한인가?
- **운영상 "정원 초과 수용" 케이스**가 있는가?
- **프론트 UI**는 정원 초과를 이미 막고 있는가, 아니면 통과시키는가?

이 3가지에 답이 정해진 뒤 진행.

#### 관련 테스트 — 1/3 PASS
- [x] `정원_이내_가입은_정상_허용된다`
- [ ] `정원_가득찬_상태에서_추가_가입은_거부되어야_한다`
- [ ] `capacity_1인_수업에는_두번째_회원_가입_거부`

---

## 🟢 P2 — 별도 작업

### [ ] P2. SMS 이벤트 확장 (연기/환불/양도)

**상태:** ⬜ 별도 스프린트 권장

#### 원인 — 단순 버그가 아닌 **기능 미구현**
1. `SmsEventType` enum에 `{예약확정, 고객등록, 회원등록}` 3개뿐. 연기/환불/양도 관련 값 미정의.
2. `PostponementService`, `RefundService`, `TransferService`가 `SmsService`를 주입조차 하지 않음 (grep 매치 0건).
3. 즉, 관리자가 요청을 승인/반려해도 고객은 아무런 알림을 받지 않는 상태.

#### 필요한 작업 (의사결정 선행)
1. **비즈니스 요구사항 확정**: 각 이벤트에서 누가 SMS를 받는가? (양도의 경우 양도자/양수자?)
2. `SmsEventType` enum에 6개 값 추가 (연기승인/연기반려/환불승인/환불반려/양도완료/양도거절)
3. 3개 서비스에 `SmsService` 주입 + 해당 경로에 `sendEventSmsIfConfigured` 호출 추가
4. 템플릿 플레이스홀더 확장 (반려 사유, 양수자 이름 등)
5. 프론트 설정 UI 확장 (이벤트별 템플릿 편집)
6. DB 마이그레이션 (`sms_event_config.event_type` ENUM 확장)

#### 관련 테스트 — 2/8 PASS (구현된 회원 등록만 통과)
`backend/src/test/java/com/culcom/service/SmsEventDispatchTest.java`

- [x] `회원등록_시_회원등록_SMS_이벤트가_발송된다`
- [x] `회원등록_SMS_호출_인자가_정확한지_캡처로_확인`
- [ ] `연기_승인_시_SMS_이벤트가_발송되어야_한다`
- [ ] `연기_반려_시_SMS_이벤트가_발송되어야_한다`
- [ ] `환불_승인_시_SMS_이벤트가_발송되어야_한다`
- [ ] `환불_반려_시_SMS_이벤트가_발송되어야_한다`
- [ ] `양도_승인_확인_시_SMS_이벤트가_발송되어야_한다`
- [ ] `양도_거절_시_SMS_이벤트가_발송되어야_한다`

이 6개 실패 테스트는 **스펙 문서 역할**로 유지하는 것을 권장. 구현 착수 시 바로 green으로 전환되는 기준선이 됨.

---

## 📝 참고 — 이 세션에서 이미 수정 완료된 항목

**이 체크리스트는 아직 진행되지 않은 구멍에 초점**을 두지만, 전체 맥락을 위해 이 세션 이전 작업들도 요약해둡니다:

| 완료 항목 | 관련 파일 | 테스트 |
|---|---|---|
| 연기 신청 — 환불/만료/정지 멤버십 차단 | `PostponementService.java`, `PublicPostponementService.java` | `PostponementServiceStatusTest` (3) |
| 환불 신청 — 환불/만료/정지 멤버십 차단 | `RefundService.java`, `PublicRefundService.java` | `RefundServiceStatusTest` (3) |
| 납부 — 미수금 초과(1원부터) 차단 | `ComplexMemberService.java` addPayment | `ComplexMemberServiceOverpaymentTest` (7) |
| 팀 추가 — 활성 멤버십 없는 회원 차단 | `ComplexClassService.java` addMember | `ComplexClassServiceAddMemberTest` (6) |
| 리더 배정 — 활성 멤버십 없는 회원 차단 | `ComplexClassService.java` setLeader | `ComplexClassServiceSetLeaderTest` (6) |

---

## 🎯 추천 실행 순서

1. **[P0-1]** ✅ 완료
2. **[P0-2]** Cross-branch — 가장 작은 diff, 정책 결정 불필요
3. **[P0-3]** 연기 Overlap — repository 쿼리 1개 + 서비스 가드
4. **[P1-1]** completeTransfer stale — isActive 재확인 1줄
5. **[P1-2]** self-transfer — 1줄
6. **[P1-3]** 정원 초과 — 정책 답변 후
7. **[P2]** SMS 확장 — 별도 스프린트

각 항목 완료 시 이 파일의 해당 체크박스와 상태 대시보드를 업데이트해 주세요.
