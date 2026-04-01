# 변경사항 정리

## 2026-02-16 — AppState 리팩터링 (2차)

### 목표
AppState를 Single Source of Truth로 강화하고, DOM 직접 조작 및 중복 코드를 제거

---

### 1. `AppState.updateDisplay()` 공통 헬퍼 추가

**파일:** `templates/customers/list.html` (AppState 객체 내부)

- display 영역 업데이트 + AppState 동기화를 하나의 메서드로 통합
- `{field}-display-{customerId}` 패턴의 DOM 요소를 찾아 span 텍스트 업데이트
- 값이 있으면 `display: block` 처리 (코멘트처럼 초기에 숨겨진 요소 대응)
- `this.updateCustomer()`를 내부에서 호출하여 AppState도 동시 동기화

```javascript
updateDisplay(customerId, field, value) {
    const displayEl = document.getElementById(`${field}-display-${customerId}`);
    if (displayEl) {
        displayEl.querySelector('span').textContent = value;
        if (value) {
            displayEl.style.display = 'block';
        }
    }
    this.updateCustomer(customerId, { [field]: value });
}
```

---

### 2. `performNameChange()` 간소화

**변경 전 (6줄):**
```javascript
const displayEl = document.getElementById(`name-display-${customerId}`);
if (displayEl) {
    displayEl.querySelector('span').textContent = newName;
}
AppState.updateCustomer(customerId, { name: newName });

const interviewInput = document.getElementById(`interview-${customerId}`);
if (interviewInput) {
    interviewInput.setAttribute('data-customer-name', newName);
}
```

**변경 후 (1줄):**
```javascript
AppState.updateDisplay(customerId, 'name', newName);
```

- display 영역 업데이트 + AppState 동기화를 공통 헬퍼로 대체
- `data-customer-name` DOM 속성 업데이트 코드 제거 (아래 항목 참조)

---

### 3. `saveComment()` 간소화

**변경 전 (4줄):**
```javascript
commentDisplay.querySelector('span').textContent = comment;
commentDisplay.style.display = 'block';
commentInput.value = '';
AppState.updateCustomer(customerId, { comment: comment });
```

**변경 후 (2줄):**
```javascript
AppState.updateDisplay(customerId, 'comment', comment);
commentInput.value = '';
```

- 미사용 변수 `commentDisplay` 선언부도 함께 제거

---

### 4. `data-customer-name` 속성 완전 제거

**이유:** 이 속성은 어디서도 읽히지 않는 사용되지 않는 속성이었음. 고객 이름은 `AppState.getCustomer(id).name`에서 가져오므로 DOM 속성으로 유지할 필요 없음.

**변경 내용:**
- HTML 템플릿: `<input>` 태그에서 `data-customer-name="{{.Name}}"` 속성 제거
- `performNameChange()`: `interviewInput.setAttribute('data-customer-name', newName)` 코드 블록 제거

---

### 5. `selectCaller()` — contentBuilder에서 AppState 직접 참조

**변경 전:**
```javascript
contentBuilder: () => `
    ...${customerName}님의
    ...${letter}...
`
```

**변경 후:**
```javascript
contentBuilder: () => `
    ...${AppState.caller.pending.customerName}님의
    ...${AppState.caller.pending.letter}...
`
```

- 로컬 변수 대신 AppState에서 직접 참조하여 Single Source of Truth 원칙 준수
- `contentBuilder`는 화살표 함수이므로 렌더링 시점에 AppState의 최신 값을 읽음
