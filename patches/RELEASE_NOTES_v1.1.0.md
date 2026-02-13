# Release Notes v1.1.0

**릴리스 일자:** 2026-02-13  
**타입:** Bug Fix & Refactoring

---

## 📋 변경 사항 요약

고객 정보 관리 시스템의 데이터 일관성 및 UI 반응성 개선

---

## 🐛 버그 수정

### 1. 고객 이름 변경 시 데이터 동기화 문제 해결

**문제:**
- 고객 이름을 변경한 후에도 일부 기능(메시지 전송, 전화상 안함, 인터뷰 확정 등)에서 이전 이름이 표시되는 문제
- HTML의 `data-customer-name` 속성과 버튼의 `onclick` 속성에 하드코딩된 이름이 업데이트되지 않음

**해결:**
- 고객 이름을 화면에 표시되는 `#name-display-{customerId}` 내부의 `<span>` 태그를 **단일 진실의 원천(Single Source of Truth)**으로 사용하도록 리팩토링
- 모든 함수가 필요할 때마다 동적으로 최신 이름을 가져오도록 변경

**영향받는 파일:**
- `templates/customers/list.html`

---

## 🔨 리팩토링

### 1. 고객 정보 조회 로직 개선

**변경 전:**
```javascript
// 이름을 data-original-name 속성에서 가져옴
const oldName = inputEl.getAttribute('data-original-name');

// 버튼에서 하드코딩된 매개변수로 이름 전달
onclick="openTextModal({{.ID}}, '{{.Name}}', '{{.Phone}}')"
onclick="markAsNoPhoneInterview({{.ID}}, '{{.Name}}')"
onclick="deleteCustomer({{.ID}}, '{{.Name}}')"
```

**변경 후:**
```javascript
// 화면에 표시된 span 태그에서 최신 이름을 가져옴
const displayEl = document.getElementById(`name-display-${customerId}`);
const customerName = displayEl ? displayEl.querySelector('span').textContent.trim() : '';

// 버튼에서 customerId만 전달
onclick="openTextModal({{.ID}})"
onclick="markAsNoPhoneInterview({{.ID}})"
onclick="deleteCustomer({{.ID}})"
```

**장점:**
- ✅ 데이터 일관성 보장
- ✅ 중복 데이터 관리 불필요
- ✅ 이름 변경 시 즉시 모든 기능에 반영
- ✅ 유지보수 용이

---

### 2. 수정된 함수 목록

#### `confirmNameChange(customerId)`
- `data-original-name` 대신 `#name-display-{customerId}` span에서 현재 이름 조회

#### `performNameChange(customerId, oldName, newName, inputEl)`
- `data-original-name` 속성 업데이트 코드 제거
- span 태그의 텍스트만 업데이트
- `data-customer-name` 속성은 유지 (서버 렌더링 호환성)

#### `selectCaller(customerId, letter)`
- 잘못된 선택자(`td strong` - call-count 선택) 수정
- `#name-display-{customerId}` span에서 올바르게 이름 조회

#### `openTextModal(customerId)` ⭐ 시그니처 변경
- **변경 전:** `openTextModal(customerId, customerName, customerPhone)`
- **변경 후:** `openTextModal(customerId)` - 내부에서 동적으로 조회
- 전화번호도 `#phone-{customerId}` 요소에서 동적으로 가져오도록 변경

#### `markAsNoPhoneInterview(customerId)` ⭐ 시그니처 변경
- **변경 전:** `markAsNoPhoneInterview(customerId, customerName)`
- **변경 후:** `markAsNoPhoneInterview(customerId)` - 내부에서 동적으로 조회

#### `deleteCustomer(customerId)` ⭐ 시그니처 변경 & 신규 구현
- **변경 전:** `deleteCustomer(customerId, customerName)`
- **변경 후:** `deleteCustomer(customerId)` - 내부에서 동적으로 조회
- ModalManager를 사용한 확인 모달 추가
- `performDeleteCustomer()` 헬퍼 함수로 분리하여 가독성 향상

---

## 🎯 테스트 시나리오

### 1. 이름 변경 후 메시지 전송
1. 고객 이름을 "홍길동"에서 "김철수"로 변경
2. TEXT 버튼 클릭
3. ✅ 메시지 전송 모달에서 "김철수" 표시 확인

### 2. 이름 변경 후 인터뷰 확정
1. 고객 이름을 "홍길동"에서 "김철수"로 변경
2. 인터뷰 일시 입력 후 확정 버튼 클릭
3. ✅ 확인 모달에서 "김철수" 표시 확인
4. ✅ SMS 발송 시 "김철수" 이름 사용 확인

### 3. 이름 변경 후 전화상 안함
1. 고객 이름을 "홍길동"에서 "김철수"로 변경
2. 전화상 안함 버튼 클릭
3. ✅ 확인 모달에서 "김철수" 표시 확인

### 4. 이름 변경 후 삭제
1. 고객 이름을 "홍길동"에서 "김철수"로 변경
2. 삭제 버튼 클릭
3. ✅ 확인 모달에서 "김철수" 표시 확인

### 5. CALLER 선택 시 이름 표시
1. 고객 이름을 "홍길동"에서 "김철수"로 변경
2. CALLER 버튼(A-P) 중 하나 클릭
3. ✅ 확인 모달에서 "김철수" 표시 확인

---

## 📝 기술 부채 해결

- ❌ **제거:** `data-original-name` 속성 의존성 (이제 사용하지 않음)
- ❌ **제거:** HTML 버튼의 하드코딩된 이름 매개변수
- ✅ **개선:** 단일 데이터 원천 패턴 적용
- ✅ **개선:** 함수 시그니처 단순화

---

## 🎁 새로운 기능

### 버전 관리 시스템 추가

**추가된 파일:**
- `VERSION` - 버전 번호 관리 파일
- `config/version.go` - 버전 정보 관리 구조체 및 함수
- `handlers/opens/version.go` - 버전 API 엔드포인트
- `build.ps1` - PowerShell 빌드 스크립트
- `build.sh` - Bash 빌드 스크립트
- `BUILD.md` - 빌드 및 버전 관리 가이드

**새로운 API 엔드포인트:**

#### `GET /api/version`
```json
{
  "version": "1.1.0",
  "build_time": "2026-02-13 14:30:00",
  "go_version": "go version go1.21.0 windows/amd64",
  "git_commit": "a1b2c3d",
  "environment": "prod"
}
```

#### `GET /health`
```json
{
  "status": "ok",
  "version": "1.1.0",
  "environment": "prod",
  "timestamp": "2026-02-13 14:30:00"
}
```

**실행 시 로그:**
```
===========================================
Version: 1.1.0
Build Time: 2026-02-13 14:30:00
Git Commit: a1b2c3d
Go Version: go version go1.21.0 windows/amd64
Environment: prod
===========================================
```

**빌드 방법:**
```powershell
# PowerShell
.\build.ps1

# 또는 수동 빌드
$VERSION = Get-Content VERSION
go build -ldflags "-X 'backoffice/config.Version=$VERSION' ..." -o culcom.exe
```

자세한 내용은 [BUILD.md](../BUILD.md)를 참고하세요.

---

### 개인정보 처리방침 페이지 추가

**추가된 파일:**
- `handlers/opens/privacy.go` - 개인정보 처리방침 핸들러
- `templates/privacy/policy.html` - 개인정보 처리방침 HTML 템플릿
- `PRIVACY.md` - 개인정보 처리방침 관리 가이드

**새로운 라우트:**

#### `GET /privacy`
- **설명:** 외부 공개용 개인정보 처리방침 페이지
- **인증:** 불필요 (공개 페이지)
- **용도:** 카카오 비즈니스 폼, 메타 리드 광고 등 외부 플랫폼에 제공할 개인정보 처리방침 URL

**주요 내용:**
1. 개인정보의 처리목적 (가입 의사 확인, 서비스 제공 등)
2. 개인정보의 처리 및 보유기간 (서비스 이용계약 해지시까지)
3. 개인정보의 제3자 제공 (각 지점에 상담 신청 정보 전달)
4. 개인정보처리의 위탁 및 외부 플랫폼 이용 (Meta, 카카오, TikTok 등)
5. 정보주체의 권리/의무 및 행사방법
6. 처리하는 개인정보 항목 (성명, 전화번호 등)
7. 개인정보의 파기 (보유기간 경과 또는 고객 요청 시)
8. 개인정보의 안전성 확보조치
9. 개인정보 보호책임자 정보 (박근홍 대표, 010-6679-5754)
10. 개인정보의 국외 이전 (Meta Platforms, Inc. - 미국)

**법적 근거:**
- 개인정보 보호법 제30조 (개인정보 처리방침의 수립 및 공개)
- 정보통신망법 제27조의2 (개인정보의 처리방침 공개)

**외부 플랫폼 연동:**
- 카카오 비즈니스 폼 제출 시 개인정보 처리방침 URL로 제공
- 메타(페이스북/인스타그램) 리드 광고의 개인정보 처리방침 링크
- TikTok 리드 광고의 개인정보 처리방침 링크

자세한 내용은 [PRIVACY.md](../PRIVACY.md)를 참고하세요.

---

## 🔧 데이터베이스 및 성능 개선

### 1. 동시성 제어 개선 (Race Condition 방지)

**문제:**
- SELECT → INSERT/UPDATE 패턴으로 인한 Lost Update 위험
- 동시 요청 시 데이터 정합성 문제 발생 가능

**해결:**
- MySQL `INSERT ... ON DUPLICATE KEY UPDATE` (UPSERT) 패턴 적용
- Atomic 연산으로 트랜잭션 안정성 보장

**적용된 함수:**

#### `SaveCalendarTokens()` (database/integrations.go)
```go
// 변경 전: SELECT 후 INSERT/UPDATE 분기
var existingSeq int
err := DB.QueryRow(checkQuery, branchSeq).Scan(&existingSeq)
if err != nil {
    // INSERT
} else {
    // UPDATE
}

// 변경 후: UPSERT
INSERT INTO calendar_config (...) VALUES (...)
ON DUPLICATE KEY UPDATE 
    access_token = VALUES(access_token),
    ...
```

#### `SaveSMSConfig()` (database/sms.go)
- branch-third-party-mapping 테이블: UPSERT 패턴 적용
- mymunja_config_info 테이블: UPSERT 패턴 적용
- 트랜잭션 내 쿼리 수 감소 (4개 → 2개)

**전제 조건:**
- `calendar_config.branch_seq`: UNIQUE KEY
- `branch-third-party-mapping (branch_id, third_party_id)`: UNIQUE KEY ✅
- `mymunja_config_info.mapping_id`: UNIQUE KEY ✅

---

### 2. N+1 쿼리 문제 해결

**문제:**
`GetAllIntegrationsByBranch()` 함수에서 N+1 쿼리 발생
```go
// 1. 모든 서비스 조회 (1 query)
SELECT * FROM third_party_services

// 2. 각 서비스마다 매핑 조회 (N queries)
for each service {
    SELECT is_active FROM branch-third-party-mapping WHERE ...
}
```

**해결:**
JOIN을 사용해 단일 쿼리로 통합
```sql
SELECT 
    tps.seq, tps.name, tps.description, est.code_name, btpm.is_active
FROM third_party_services tps
LEFT JOIN external_service_type est ON tps.code_seq = est.seq
LEFT JOIN branch-third-party-mapping btpm 
    ON btpm.third_party_id = tps.seq AND btpm.branch_id = ?
```

**성능 개선:**
- 서비스 10개 기준: **11번의 쿼리 → 1번의 쿼리**
- 데이터베이스 왕복(round-trip) 최소화

---

## 🔨 코드 품질 개선

### 1. 구조체 위치 정리

**변경:**
- `CreateCalendarEventRequest` 구조체를 [handlers/integrations/api.go](handlers/integrations/api.go)에서 [handlers/integrations/models.go](handlers/integrations/models.go)로 이동
- API 핸들러와 데이터 모델 분리로 코드 구조 개선

---

### 2. 코드 중복 제거

**제거된 함수:**
- `maskSMSPassword()` (database/sms.go) ❌

**통합:**
- `utils.MaskPassword()` 사용 ✅
- 비밀번호 마스킹 로직 일원화

---

## 📊 사용자 경험 개선

### SMS 오류 메시지 개선

**변경 전:**
```
전송 실패: 인증에러
```

**변경 후:**
```
전송 실패: 인증에러 (Code: 0002)
```

**개선 효과:**
- SMS 발송 실패 시 정확한 오류 코드 제공
- 고객 지원 및 디버깅 효율성 향상
- 마이문자 API 오류 매핑 테이블 활용

**적용 위치:**
- [services/sms/sms.go](services/sms/sms.go) - `Send()` 함수

---

### 메시지 템플릿 데이터 무결성 개선

**문제:**
- 비활성화된 메시지 템플릿을 기본 템플릿으로 설정할 수 있는 상태
- 비활성 템플릿이 기본으로 설정된 경우, 예약 SMS 설정 페이지에서 사용할 수 없어 혼란 발생 가능

**해결:**
1. **데이터베이스 검증 추가** - [database/messagetemplate.go](database/messagetemplate.go)
   - `SetDefaultMessageTemplate()` 함수에 `is_active` 상태 체크 추가
   - 비활성 템플릿 설정 시도 시 에러 반환: "비활성화된 템플릿은 기본 템플릿으로 설정할 수 없습니다"

2. **UI 버튼 조건부 렌더링** - [templates/message-templates/list.html](templates/message-templates/list.html)
   - 비활성 템플릿에는 "기본 설정" 버튼을 표시하지 않음
   - 조건: `{{if and (not .IsDefault) .IsActive}}`

**개선 효과:**
- ✅ 데이터 일관성 보장
- ✅ 비활성 템플릿이 기본으로 설정되는 것을 원천 차단
- ✅ 예약 SMS 설정 페이지에서 항상 유효한 템플릿만 표시
- ✅ 관리자의 실수로 인한 오류 방지

---

## ⚠️ Breaking Changes

**없음** - 하위 호환성 유지

모든 변경사항은 내부 구현에만 영향을 미치며, 외부 API나 데이터 구조에는 영향을 주지 않습니다.

---

## 🔄 마이그레이션 가이드

**필요 없음** - 자동으로 적용됩니다.

---

## 👥 기여자

- 개발팀

---

## 📌 다음 릴리스 예정

- 고객 검색 성능 최적화
- 벌크 작업 기능 추가
- 모바일 반응형 개선
