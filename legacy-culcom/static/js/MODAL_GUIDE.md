# 모달 사용 가이드 (Modal Usage Guide)

`modal-utils.js`를 사용하여 중복된 모달 HTML 코드를 제거하고 JavaScript로 동적으로 관리할 수 있습니다.

## 📦 설치

HTML 파일의 `<head>` 또는 `<body>` 끝부분에 스크립트를 추가합니다:

```html
<script src="/static/js/modal-utils.js"></script>
```

## 🎯 기본 사용법

### 1. 간단한 확인 모달 (Confirm Modal)

확인/취소 버튼이 있는 기본 모달입니다.

#### JavaScript 예시:
```javascript
// 모달 생성 및 표시
function showDeleteConfirm(customerId, customerName) {
    ModalManager.createConfirm({
        id: 'deleteConfirmModal',
        title: '🗑️ 고객 삭제',
        message: `"${customerName}" 고객을 정말 삭제하시겠습니까?<br><br>이 작업은 되돌릴 수 없습니다.`,
        confirmText: '삭제',
        cancelText: '취소',
        confirmColor: '#e74c3c',
        onConfirm: () => {
            // 삭제 로직 실행
            deleteCustomer(customerId);
        },
        onCancel: () => {
            console.log('취소됨');
        }
    });
    
    ModalManager.show('deleteConfirmModal');
}
```

### 2. 알림 모달 (Alert Modal)

확인 버튼만 있는 단순 알림 모달입니다.

```javascript
function showSuccessAlert(message) {
    ModalManager.createAlert({
        id: 'successAlert',
        title: '✅ 성공',
        message: message,
        confirmText: '확인',
        confirmColor: '#10b981',
        onConfirm: () => {
            console.log('확인 클릭');
        }
    });
    
    ModalManager.show('successAlert');
}
```

### 3. 커스텀 모달 (Custom Modal)

복잡한 컨텐츠와 여러 버튼이 필요한 경우:

```javascript
function showCustomModal() {
    ModalManager.createCustom({
        id: 'myCustomModal',
        title: '📝 사용자 정의 모달',
        maxWidth: '600px',
        headerColor: '#667eea',
        showCloseButton: true,
        contentBuilder: () => {
            // HTML 문자열로 반환
            return `
                <div style="padding: 1rem;">
                    <input type="text" id="inputField" placeholder="입력하세요..." style="width: 100%; padding: 0.5rem;">
                    <textarea id="textArea" style="width: 100%; margin-top: 1rem; padding: 0.5rem;"></textarea>
                </div>
            `;
        },
        buttons: [
            {
                text: '취소',
                class: 'btn-secondary',
                onClick: () => console.log('취소')
            },
            {
                text: '저장',
                class: 'btn-primary',
                style: { background: '#10b981' },
                onClick: () => {
                    const value = document.getElementById('inputField').value;
                    console.log('저장:', value);
                }
            }
        ]
    });
    
    ModalManager.show('myCustomModal');
}
```

### 4. 기본 모달 생성 (Full Control)

모든 옵션을 직접 제어하려면:

```javascript
ModalManager.create({
    id: 'myModal',
    title: '모달 제목',
    content: '<div>HTML 컨텐츠</div>',
    buttons: [
        {
            text: '버튼1',
            class: 'btn-secondary',
            onClick: (e, manager) => {
                console.log('버튼1 클릭');
                // manager를 통해 다른 모달 제어 가능
            },
            closeOnClick: false // 클릭 후 모달 닫지 않기
        },
        {
            text: '버튼2',
            class: 'btn-primary',
            style: { background: '#4a90e2' },
            onClick: () => console.log('버튼2 클릭'),
            closeOnClick: true // 클릭 후 모달 닫기 (기본값)
        }
    ],
    maxWidth: '500px',
    headerColor: '#4a90e2',
    closeOnOverlay: true, // 배경 클릭시 닫기
    showCloseButton: false // X 닫기 버튼 표시 여부
});
```

## 🔧 유틸리티 함수

### 모달 제어

```javascript
// 모달 표시
ModalManager.show('modalId');
showModal('modalId'); // 단축 함수

// 모달 숨김
ModalManager.hide('modalId');
hideModal('modalId'); // 단축 함수

// 모달 제거 (DOM에서 완전 삭제)
ModalManager.destroy('modalId');

// 모든 모달 닫기
ModalManager.hideAll();
```

### 단축 함수

```javascript
// 확인 모달 생성
createConfirmModal(options);

// 알림 모달 생성
createAlertModal(options);

// 커스텀 모달 생성
createCustomModal(options);
```

## 📝 실전 예제

### 예제 1: 기존 코드 리팩터링 (CALLER 선택 모달)

#### Before (기존 HTML + JavaScript):
```html
<!-- HTML에 정적으로 작성 -->
<div id="callerConfirmModal" class="modal">
    <div class="modal-content" style="max-width: 400px;">
        <div class="modal-header" style="border-bottom: 2px solid #667eea;">
            <h3>🔤 CALLER 선택 확인</h3>
        </div>
        <div class="modal-body" style="padding: 2rem;">
            <div style="text-align: center; margin-bottom: 1.5rem;">
                <div style="font-size: 1.1rem; color: #333; margin-bottom: 1rem;">
                    <strong id="callerCustomerName" style="color: #667eea; font-size: 1.3rem;"></strong>님의
                </div>
                <div style="font-size: 0.95rem; color: #666; margin-bottom: 0.5rem;">선택한 CALLER</div>
                <div style="background: #f5f3ff; padding: 1.5rem; border-radius: 8px; border: 2px solid #667eea; margin-top: 1rem;">
                    <div id="callerLetter" style="font-size: 2rem; font-weight: 700; color: #667eea;"></div>
                </div>
            </div>
            <div style="text-align: center; color: #666; font-size: 0.95rem;">
                이 CALLER로 선택하시겠습니까?
            </div>
        </div>
        <div style="padding: 1rem 2rem; border-top: 1px solid #e0e0e0; display: flex; gap: 0.75rem;">
            <button class="btn-secondary" onclick="cancelCallerConfirm()">취소</button>
            <button class="btn-primary" onclick="confirmCallerSelection()">확인</button>
        </div>
    </div>
</div>

<script>
function selectCaller(customerId, letter) {
    const customerRow = document.querySelector(`tr[data-customer-id="${customerId}"]`);
    const customerName = customerRow ? customerRow.querySelector('td strong').textContent : '';
    
    // DOM 요소에 직접 값 설정
    document.getElementById('callerCustomerName').textContent = customerName;
    document.getElementById('callerLetter').textContent = letter;
    document.getElementById('callerConfirmModal').style.display = 'flex';
}

function cancelCallerConfirm() {
    document.getElementById('callerConfirmModal').style.display = 'none';
}
</script>
```

#### After (modal-utils.js 사용):
```html
<!-- HTML에서 모달 제거 -->

<script>
let pendingCallerSelection = null;

function selectCaller(customerId, letter) {
    const customerRow = document.querySelector(`tr[data-customer-id="${customerId}"]`);
    const customerName = customerRow ? customerRow.querySelector('td strong').textContent : '';
    
    // 선택 정보 저장
    pendingCallerSelection = {
        customerId: customerId,
        customerName: customerName,
        letter: letter,
        buttonElement: event.target
    };
    
    // 동적으로 모달 생성 및 표시
    ModalManager.createCustom({
        id: 'callerConfirmModal',
        title: '🔤 CALLER 선택 확인',
        maxWidth: '400px',
        headerColor: '#667eea',
        contentBuilder: () => `
            <div style="text-align: center; margin-bottom: 1.5rem;">
                <div style="font-size: 1.1rem; color: #333; margin-bottom: 1rem;">
                    <strong style="color: #667eea; font-size: 1.3rem;">${customerName}</strong>님의
                </div>
                <div style="font-size: 0.95rem; color: #666; margin-bottom: 0.5rem;">선택한 CALLER</div>
                <div style="background: #f5f3ff; padding: 1.5rem; border-radius: 8px; border: 2px solid #667eea; margin-top: 1rem;">
                    <div style="font-size: 2rem; font-weight: 700; color: #667eea;">${letter}</div>
                </div>
            </div>
            <div style="text-align: center; color: #666; font-size: 0.95rem;">
                이 CALLER로 선택하시겠습니까?
            </div>
        `,
        buttons: [
            {
                text: '취소',
                class: 'btn-secondary',
                onClick: () => {
                    pendingCallerSelection = null;
                }
            },
            {
                text: '확인',
                class: 'btn-primary',
                style: { background: '#667eea' },
                onClick: () => {
                    confirmCallerSelection();
                }
            }
        ]
    });
    
    ModalManager.show('callerConfirmModal');
}

function confirmCallerSelection() {
    if (!pendingCallerSelection) return;
    
    const { customerId, letter } = pendingCallerSelection;
    // 처리 로직...
    console.log(`CALLER ${letter} selected for customer ${customerId}`);
    pendingCallerSelection = null;
}
</script>
```

### 예제 2: 간단한 삭제 확인

```javascript
function deleteCustomer(customerId, customerName) {
    ModalManager.createConfirm({
        id: 'deleteCustomerModal',
        title: '🗑️ 고객 삭제',
        message: `"${customerName}" 고객을 정말 삭제하시겠습니까?<br><br>이 작업은 되돌릴 수 없습니다.`,
        confirmText: '삭제',
        cancelText: '취소',
        confirmColor: '#e74c3c',
        onConfirm: async () => {
            try {
                const response = await fetch(`/api/customers/delete`, {
                    method: 'POST',
                    body: new FormData([[customerId, customerId]])
                });
                
                if (response.ok) {
                    // 성공 알림
                    showSuccessMessage('고객이 삭제되었습니다.');
                    // 행 제거
                    document.querySelector(`tr[data-customer-id="${customerId}"]`).remove();
                } else {
                    throw new Error('삭제 실패');
                }
            } catch (error) {
                showErrorMessage('삭제 중 오류가 발생했습니다.');
            }
        }
    });
    
    ModalManager.show('deleteCustomerModal');
}
```

## 🎨 스타일링

모달 스타일은 `style.css`에 정의되어 있으며, 추가 커스터마이징이 필요한 경우:

```javascript
// 버튼에 커스텀 스타일 적용
{
    text: '특수 버튼',
    class: 'btn-primary',
    style: {
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        border: 'none',
        boxShadow: '0 4px 15px rgba(102, 126, 234, 0.4)'
    }
}

// 모달 컨텐츠에서 인라인 스타일 사용
contentBuilder: () => `
    <div style="
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        padding: 2rem;
        border-radius: 8px;
        color: white;
    ">
        커스텀 스타일링된 컨텐츠
    </div>
`
```

## ✅ 리팩터링 체크리스트

기존 모달을 `modal-utils.js`로 마이그레이션할 때:

- [ ] HTML에서 `<div class="modal">` 제거
- [ ] 모달 열기 함수를 `ModalManager.create*()` + `ModalManager.show()` 로 변경
- [ ] 모달 닫기 함수를 `ModalManager.hide()` 로 변경
- [ ] 동적 컨텐츠는 템플릿 리터럴 사용
- [ ] 버튼 클릭 이벤트를 `onClick` 콜백으로 이동
- [ ] 테스트: 모달 열기/닫기, 버튼 클릭, 배경 클릭 동작 확인

## 🚀 장점

### Before (기존 방식):
- ❌ HTML에 모달 코드 중복
- ❌ 각 페이지마다 동일한 구조 반복
- ❌ 유지보수 어려움 (한 곳 수정 시 모든 곳 수정 필요)
- ❌ 페이지 로드 시 불필요한 DOM 요소

### After (modal-utils.js):
- ✅ 중복 코드 제거
- ✅ 재사용 가능한 컴포넌트
- ✅ 한 곳에서 스타일/로직 관리
- ✅ 필요할 때만 동적 생성 (성능 향상)
- ✅ 일관된 UX

## 📚 추가 Resources

- 기본 CSS: `/static/css/style.css` (`.modal`, `.modal-content` 등)
- 템플릿 유틸: `/static/js/template-utils.js`
- 예제 사용: `/templates/customers/list.html`
