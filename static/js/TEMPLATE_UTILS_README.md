# 템플릿 유틸리티 사용 가이드

## 개요
`template-utils.js`는 메시지 템플릿의 변수 치환 기능을 제공하는 공통 유틸리티입니다.

## 설치 방법

HTML 파일의 `<head>` 섹션에 다음 스크립트를 추가합니다:

```html
<script src="/static/js/template-utils.js"></script>
```

## 지원 변수

### 고객 정보
- `{{고객명}}` - 고객 이름
- `{{전화번호}}` - 고객 전화번호

### 예약 정보
- `{{예약일시}}` - 예약 날짜 및 시간
- `{{예약날짜}}` - 예약 날짜만
- `{{예약시간}}` - 예약 시간만

### 지점 정보
- `{{지점명}}` - 지점 이름
- `{{지점주소}}` - 지점 주소
- `{{지점담당자}}` - 지점 담당자 이름
- `{{오시는길}}` - 지점 오시는 길 안내

### 날짜/시간
- `{{현재날짜시간}}` - 현재 날짜와 시간 (YYYY-MM-DD HH:mm)
- `{{현재날짜}}` - 현재 날짜 (YYYY-MM-DD)
- `{{현재시간}}` - 현재 시간 (HH:mm)

### 기타
- `{{담당자}}` - 담당자 이름
- `{{메모}}` - 메모 내용

## 함수 사용법

### 1. replaceTemplateVariables()

템플릿 문자열의 변수를 실제 값으로 치환합니다.

```javascript
const result = replaceTemplateVariables(template, {
    customerName: '홍길동',
    phoneNumber: '010-1234-5678',
    reservationDate: '2026-02-01T14:00:00',
    branchName: '강남점',
    assignedTo: '김영업'
});
```

**파라미터:**
- `template` (string): 치환할 템플릿 문자열
- `variables` (object): 치환할 변수 객체
  - `customerName`: 고객명
  - `phoneNumber`: 전화번호
  - `reservationDate`: 예약일시 (Date 객체 또는 ISO 문자열)
  - `reservationTime`: 예약 시간
  - `branchName`: 지점명
  - `address`: 주소
  - `assignedTo`: 담당자
  - `memo`: 메모

**반환값:** 치환된 문자열

**예제:**
```javascript
const template = "안녕하세요 {{고객명}}님, {{예약일시}}에 {{지점명}} 방문 예정입니다.";
const result = replaceTemplateVariables(template, {
    customerName: '홍길동',
    reservationDate: '2026-02-01T14:00:00',
    branchName: '강남점'
});
// 결과: "안녕하세요 홍길동님, 2026년 2월 1일 14:00에 강남점 방문 예정입니다."
```

### 2. replaceTemplateVariablesForPreview()

미리보기용으로 템플릿 변수를 샘플 값으로 치환합니다.

```javascript
const preview = replaceTemplateVariablesForPreview(template);
```

**파라미터:**
- `template` (string): 치환할 템플릿 문자열

**반환값:** 샘플 값으로 치환된 문자열

**예제:**
```javascript
const template = "{{고객명}}님께 {{현재날짜}}에 연락드립니다.";
const preview = replaceTemplateVariablesForPreview(template);
// 결과: "홍길동님께 2026-02-01에 연락드립니다."
```

### 3. formatDateKorean()

날짜를 한국어 형식으로 포맷팅합니다.

```javascript
const formatted = formatDateKorean(date, includeTime);
```

**파라미터:**
- `date` (Date | string): Date 객체 또는 ISO 날짜 문자열
- `includeTime` (boolean): 시간 포함 여부 (기본값: true)

**반환값:** 포맷된 날짜 문자열

**예제:**
```javascript
const date = new Date('2026-02-01T14:30:00');
const withTime = formatDateKorean(date, true);
// 결과: "2026년 2월 1일 오후 02:30"

const dateOnly = formatDateKorean(date, false);
// 결과: "2026년 2월 1일"
```

### 4. replaceTemplateLegacy() (구버전 호환)

구버전 플레이스홀더 `{변수명}` 형식을 치환합니다.

```javascript
const result = replaceTemplateLegacy(template, variables);
```

**예제:**
```javascript
const template = "{고객명}님께 {날짜}에 연락드립니다.";
const result = replaceTemplateLegacy(template, {
    customerName: '홍길동',
    date: '2026-02-01'
});
// 결과: "홍길동님께 2026-02-01에 연락드립니다."
```

## 적용 파일 목록

### 현재 적용된 파일:
1. `templates/customers/list.html` - 고객 목록 페이지
   - TEXT 모달의 템플릿 로드 (`loadTextTemplate`)
   - 예약 확정 SMS 발송 (`confirmInterviewDateTime`)
   - 응대 모달의 템플릿 로드 (`loadTemplate`)

2. `templates/message-templates/form.html` - 메시지 템플릿 작성/수정 페이지
   - 미리보기 기능 (`updatePreview`)

### 적용 가능한 파일:
- `templates/settings/reservation-sms-config.html` - 예약 SMS 설정 페이지
- 기타 SMS 발송 기능이 있는 모든 페이지

## 마이그레이션 가이드

### 기존 코드:
```javascript
let content = template.content
    .replace(/{{고객명}}/g, customerName)
    .replace(/{{전화번호}}/g, phoneNumber)
    .replace(/{{예약일시}}/g, reservationDate);
```

### 변경 후:
```javascript
const content = replaceTemplateVariables(template.content, {
    customerName: customerName,
    phoneNumber: phoneNumber,
    reservationDate: reservationDate
});
```

## 주의사항

1. **이중 중괄호 사용**: 새로운 변수는 `{{변수명}}` 형식을 사용합니다.
2. **구버전 호환**: `{변수명}` 형식은 `replaceTemplateLegacy()` 함수를 사용하세요.
3. **날짜 형식**: `reservationDate`에 Date 객체 또는 ISO 문자열을 전달하면 자동으로 한국어 형식으로 변환됩니다.
4. **지점명 자동 추출**: `branchName`을 전달하지 않으면 헤더의 선택된 지점명을 자동으로 사용합니다.

## 확장 가이드

새로운 변수를 추가하려면 `template-utils.js`의 `replaceTemplateVariables` 함수에서 `defaultVariables` 객체에 추가하세요:

```javascript
const defaultVariables = {
    // ... 기존 변수들
    '{{새변수}}': variables.newVariable || '기본값',
};
```

## 라이선스

이 파일은 프로젝트의 일부로 제공됩니다.
