# Pagination Utils 사용 가이드

페이지네이션 기능을 공통화한 JavaScript 유틸리티입니다.

## 파일 위치
`/static/js/pagination-utils.js`

## 기능 개요

1. **goToPage()** - 페이지 이동 시 URL 파라미터 자동 유지
2. **renderPagination()** - 페이지네이션을 DOM에 렌더링 ⭐ 추천
3. **initPaginationFromTemplate()** - Go 템플릿에서 쉽게 사용 ⭐ 추천
4. **createPaginationHTML()** - 페이지네이션 HTML 동적 생성
5. **getQueryString()** - 현재 URL 파라미터를 쿼리스트링으로 변환

---

## 🚀 빠른 시작 (3단계)

### 1단계: HTML에서 스크립트 로드

```html
<!-- Pagination Utils -->
<script src="/static/js/pagination-utils.js"></script>
```

### 2단계: 페이지네이션 렌더링할 위치 지정

```html
<!-- 기존 복잡한 Go template 코드 대신 -->
<div id="pagination-root"></div>
```

### 3단계: JavaScript에서 자동 렌더링

```html
<script>
{{if .Pagination}}
initPaginationFromTemplate('#pagination-root', {
    currentPage: {{.Pagination.CurrentPage}},
    totalPages: {{.Pagination.TotalPages}},
    totalItems: {{.Pagination.TotalItems}},
    pages: [{{range $i, $p := .Pagination.Pages}}{{if $i}},{{end}}{{$p}}{{end}}],
    hasPrev: {{.Pagination.HasPrev}},
    hasNext: {{.Pagination.HasNext}}
});
{{end}}
</script>
```

**끝!** 이제 페이지네이션이 자동으로 렌더링되고, 모든 URL 파라미터가 유지됩니다.

---

## API 상세 설명

## 1. initPaginationFromTemplate() ⭐ 가장 많이 사용

Go 템플릿에서 전달받은 페이지네이션 데이터를 렌더링합니다.

### 사용법

```html
<!-- HTML: 렌더링될 위치 -->
<div id="pagination-root"></div>

<!-- JavaScript: 자동 렌더링 -->
<script>
{{if .Pagination}}
initPaginationFromTemplate('#pagination-root', {
    currentPage: {{.Pagination.CurrentPage}},
    totalPages: {{.Pagination.TotalPages}},
    totalItems: {{.Pagination.TotalItems}},
    pages: [{{range $i, $p := .Pagination.Pages}}{{if $i}},{{end}}{{$p}}{{end}}],
    hasPrev: {{.Pagination.HasPrev}},
    hasNext: {{.Pagination.HasNext}}
});
{{end}}
</script>
```

### 특징

- DOM 로드 완료를 자동으로 기다림
- 페이지가 1개 이하면 자동으로 숨김
- 모든 URL 파라미터를 자동으로 유지

---

## 2. renderPagination()

페이지네이션을 특정 DOM 요소에 렌더링합니다.

### 기본 사용

```javascript
const paginationData = {
    currentPage: 2,
    totalPages: 10,
    totalItems: 95,
    pages: [1, 2, 3, 4, 5],
    hasPrev: true,
    hasNext: true
};

renderPagination('#pagination-root', paginationData);
```

### 옵션 사용

```javascript
renderPagination('#pagination-root', paginationData, {
    // 커스텀 페이지 클릭 핸들러
    onPageClick: (page) => {
        console.log(`페이지 ${page} 클릭`);
        goToPage(page);
    },
    
    // 여러 페이지가 있을 때만 표시 (기본값: true)
    showOnlyIfMultiplePages: false
});
```

---

## 3. goToPage()

현재 페이지의 모든 URL 파라미터를 유지하면서 페이지만 변경합니다.

### 기본 사용

```javascript
// 모든 URL 파라미터를 유지하면서 3페이지로 이동
goToPage(3);
```

**예시:**
- 현재 URL: `/customers?filter=new&searchType=name&searchKeyword=홍길동`
- `goToPage(2)` 호출
- 이동 URL: `/customers?page=2&filter=new&searchType=name&searchKeyword=홍길동`

### 옵션 사용

```javascript
// 특정 파라미터만 유지
goToPage(2, {
    keepParams: ['filter', 'searchType']  // filter와 searchType만 유지
});

// 특정 파라미터 제거
goToPage(2, {
    removeParams: ['tempParam']  // tempParam 제외하고 모두 유지
});

// 기본 경로 변경
goToPage(2, {
    basePath: '/other-page'
});
```

---

## 4. createPaginationHTML()

페이지네이션 HTML을 JavaScript로 동적 생성합니다.

```javascript
const paginationData = {
    currentPage: 2,
    totalPages: 10,
    totalItems: 95,
    pages: [1, 2, 3, 4, 5],
    hasPrev: true,
    hasNext: true
};

const element = createPaginationHTML(paginationData, {
    onPageClick: (page) => goToPage(page)
});

// DOM에 추가
document.querySelector('.content').appendChild(element);
```

---

## 5. getQueryString()

현재 URL의 쿼리 파라미터를 쿼리스트링으로 반환합니다.

```javascript
// 현재 URL: /customers?filter=new&searchType=name&page=2

// page를 제외한 파라미터 가져오기
const queryString = getQueryString(['page']);
// 결과: "&filter=new&searchType=name"

// 모든 파라미터 가져오기
const allParams = getQueryString([]);
// 결과: "&filter=new&searchType=name&page=2"
```

**주의:** 반환값은 앞에 `&`가 포함됩니다.

---

## 6. initPagination() (레거시)

`data-page` 속성을 가진 버튼에 자동으로 이벤트 리스너를 설정합니다.

> ⚠️ **권장하지 않음**: 대신 `initPaginationFromTemplate()` 사용을 권장합니다.

---

## 1. 기본 사용법

### HTML에서 스크립트 로드

```html
<!-- Pagination Utils -->
<script src="/static/js/pagination-utils.js"></script>
```

### 페이지네이션 버튼 HTML

```html
<div class="pagination">
    {{if .Pagination.HasPrev}}
        <button class="page-btn page-arrow" onclick="goToPage({{sub .Pagination.CurrentPage 1}})">◀</button>
    {{else}}
        <button class="page-btn page-arrow" disabled style="opacity: 0.3; cursor: not-allowed;">◀</button>
    {{end}}

    {{range .Pagination.Pages}}
        {{if eq . $.Pagination.CurrentPage}}
            <button class="page-btn active">{{.}}</button>
        {{else}}
            <button class="page-btn" onclick="goToPage({{.}})">{{.}}</button>
        {{end}}
    {{end}}

    {{if .Pagination.HasNext}}
        <button class="page-btn page-arrow" onclick="goToPage({{add .Pagination.CurrentPage 1}})">▶</button>
    {{else}}
        <button class="page-btn page-arrow" disabled style="opacity: 0.3; cursor: not-allowed;">▶</button>
    {{end}}
</div>
```

---

## 2. goToPage() 함수

현재 페이지의 모든 URL 파라미터를 유지하면서 페이지만 변경합니다.

### 기본 사용

```javascript
// 모든 URL 파라미터를 유지하면서 3페이지로 이동
goToPage(3);
```

**예시:**
- 현재 URL: `/customers?filter=new&searchType=name&searchKeyword=홍길동`
- `goToPage(2)` 호출
- 이동 URL: `/customers?page=2&filter=new&searchType=name&searchKeyword=홍길동`

### 옵션 사용

```javascript
// 특정 파라미터만 유지
goToPage(2, {
    keepParams: ['filter', 'searchType']  // filter와 searchType만 유지
});

// 특정 파라미터 제거
goToPage(2, {
    removeParams: ['tempParam']  // tempParam 제외하고 모두 유지
});

// 기본 경로 변경
goToPage(2, {
    basePath: '/other-page'
});
```

### 옵션 상세

| 옵션 | 타입 | 기본값 | 설명 |
|------|------|--------|------|
| `keepParams` | `string[]` | `null` | 유지할 파라미터 배열. null이면 모든 파라미터 유지 |
| `removeParams` | `string[]` | `[]` | 제거할 파라미터 배열 |
| `basePath` | `string` | `window.location.pathname` | 기본 경로 |

---

## 3. initPagination() 함수

`data-page` 속성을 가진 버튼에 자동으로 이벤트 리스너를 설정합니다.

### HTML

```html
<div class="pagination">
    <button class="page-btn" data-page="1">1</button>
    <button class="page-btn" data-page="2">2</button>
    <button class="page-btn" data-page="3">3</button>
</div>

<script>
    // 페이지 로드 후 자동 초기화
    initPagination();
    
    // 또는 특정 파라미터만 유지하도록 설정
    initPagination({
        keepParams: ['filter', 'searchType', 'searchKeyword']
    });
</script>
```

---

## 4. getQueryString() 함수

현재 URL의 쿼리 파라미터를 쿼리스트링으로 반환합니다.

```javascript
// 현재 URL: /customers?filter=new&searchType=name&page=2

// page를 제외한 파라미터 가져오기
const queryString = getQueryString(['page']);
// 결과: "&filter=new&searchType=name"

// 모든 파라미터 가져오기
const allParams = getQueryString([]);
// 결과: "&filter=new&searchType=name&page=2"
```

**주의:** 반환값은 앞에 `&`가 포함됩니다.

---

## 5. createPaginationHTML() 함수

페이지네이션 HTML을 JavaScript로 동적 생성합니다.

```javascript
const paginationData = {
    currentPage: 2,
    totalPages: 10,
    totalItems: 95,
    pages: [1, 2, 3, 4, 5],
    hasPrev: true,
    hasNext: true
};

const container = createPaginationHTML(paginationData, {
    onPageClick: (page) => {
        console.log(`페이지 ${page} 클릭됨`);
        goToPage(page);
    }
});

// DOM에 추가
document.querySelector('.content').appendChild(container);
```

---

## 적용 예시

### Before (복잡한 Go 템플릿)

```html
<div class="pagination">
    {{if .Pagination.HasPrev}}
        <button class="page-btn page-arrow" onclick="goToPage({{sub .Pagination.CurrentPage 1}})">◀</button>
    {{else}}
        <button class="page-btn page-arrow" disabled>◀</button>
    {{end}}

    {{range .Pagination.Pages}}
        {{if eq . $.Pagination.CurrentPage}}
            <button class="page-btn active">{{.}}</button>
        {{else}}
            <button class="page-btn" onclick="goToPage({{.}})">{{.}}</button>
        {{end}}
    {{end}}

    {{if .Pagination.HasNext}}
        <button class="page-btn page-arrow" onclick="goToPage({{add .Pagination.CurrentPage 1}})">▶</button>
    {{else}}
        <button class="page-btn page-arrow" disabled>▶</button>
    {{end}}
</div>
<div style="text-align: center; margin-top: 15px;">
    {{.Pagination.CurrentPage}} / {{.Pagination.TotalPages}} 페이지 (총 {{.Pagination.TotalItems}}개)
</div>

<script>
function goToPage(page) {
    // 매 페이지마다 중복된 코드
    const urlParams = new URLSearchParams(window.location.search);
    const filter = urlParams.get('filter') || '';
    let url = `/customers?page=${page}`;
    if (filter) url += `&filter=${filter}`;
    window.location.href = url;
}
</script>
```

### After (간단한 JavaScript)

```html
<div id="pagination-root"></div>

<script src="/static/js/pagination-utils.js"></script>
<script>
{{if .Pagination}}
initPaginationFromTemplate('#pagination-root', {
    currentPage: {{.Pagination.CurrentPage}},
    totalPages: {{.Pagination.TotalPages}},
    totalItems: {{.Pagination.TotalItems}},
    pages: [{{range $i, $p := .Pagination.Pages}}{{if $i}},{{end}}{{$p}}{{end}}],
    hasPrev: {{.Pagination.HasPrev}},
    hasNext: {{.Pagination.HasNext}}
});
{{end}}
</script>
```

**결과:**
- 30줄 이상의 템플릿 코드 → 단 10줄로 단축
- 중복 코드 제거
- 자동 URL 파라미터 유지

---

## 실제 적용된 페이지

현재 다음 페이지에서 `pagination-utils.js`를 사용 중입니다:

1. ✅ **고객 관리** (`/templates/customers/list.html`)
   - filter, searchType, searchKeyword 파라미터 유지

2. ✅ **지점 관리** (`/templates/branches/list.html`)
   - 모든 URL 파라미터 유지

3. ✅ **메시지 템플릿** (`/templates/message-templates/list.html`)
   - 모든 URL 파라미터 유지

---

## 마이그레이션 가이드

기존 페이지에 페이지네이션을 추가하는 방법:

### 1단계: 스크립트 추가

```html
<!-- 페이지 하단, </body> 위에 추가 -->
<script src="/static/js/pagination-utils.js"></script>
```

### 2단계: HTML 간소화

**기존 코드 제거:**
```html
<!-- 이런 복잡한 템플릿 코드를 제거 -->
{{if .Pagination}}
  <div class="pagination">...</div>
{{end}}
```

**간단한 div로 교체:**
```html
<div id="pagination-root"></div>
```

### 3단계: JavaScript 렌더링 추가

```html
<script>
{{if .Pagination}}
initPaginationFromTemplate('#pagination-root', {
    currentPage: {{.Pagination.CurrentPage}},
    totalPages: {{.Pagination.TotalPages}},
    totalItems: {{.Pagination.TotalItems}},
    pages: [{{range $i, $p := .Pagination.Pages}}{{if $i}},{{end}}{{$p}}{{end}}],
    hasPrev: {{.Pagination.HasPrev}},
    hasNext: {{.Pagination.HasNext}}
});
{{end}}
</script>
```

### 4단계: 기존 goToPage 함수 제거

페이지에 개별적으로 작성된 `goToPage` 함수가 있다면 제거합니다. (이미 공통 함수로 제공됨)

---

## 💡 주요 장점

### 1. 코드 간소화
- **70% 이상 코드 감소**: 30줄의 Go 템플릿 → 10줄의 JavaScript
- **읽기 쉬운 코드**: HTML과 로직 분리

### 2. 중복 제거
- 각 페이지마다 동일한 `goToPage` 함수를 작성할 필요 없음
- 페이지네이션 HTML 구조를 한 곳에서 관리

### 3. 일관성
- 모든 페이지에서 동일한 UI와 동작
- 통일된 사용자 경험 제공

### 4. 유지보수성
- 한 파일(`pagination-utils.js`)만 수정하면 모든 페이지에 반영
- 버그 수정이 용이

### 5. 자동 URL 관리
- 검색, 필터 등 모든 URL 파라미터 자동 유지
- 수동으로 파라미터를 추가할 필요 없음

### 6. 유연성
- 옵션을 통해 다양한 상황에 대응
- 커스텀 동작 추가 가능

---

## 🔧 문제 해결

### `goToPage is not defined` 오류

**원인:** pagination-utils.js가 로드되지 않았습니다.

**해결:**
```html
<script src="/static/js/pagination-utils.js"></script>
```

### 페이지네이션이 표시되지 않음

**원인 1:** JavaScript 오류 확인
```javascript
// 브라우저 콘솔에서 확인
console.log('Pagination data:', paginationData);
```

**원인 2:** 페이지가 1개 이하
- 기본적으로 페이지가 1개 이하면 표시되지 않습니다.
- 강제 표시하려면:
```javascript
initPaginationFromTemplate('#pagination-root', paginationData, {
    showOnlyIfMultiplePages: false
});
```

### URL 파라미터가 유지되지 않음

**원인:** 이미 자동으로 유지됩니다!

`goToPage()` 함수가 현재 URL의 모든 파라미터를 자동으로 유지합니다.

특정 파라미터만 유지하고 싶다면:
```javascript
goToPage(2, {
    keepParams: ['filter', 'searchType']
});
```

### 버튼 스타일이 적용되지 않음

**원인:** CSS 선택자가 잘못되었습니다.

**해결:** `.page-btn` 클래스를 사용하여 button 태그에도 스타일 적용
```css
/* ✅ 올바른 방법 */
.page-btn { ... }

/* ❌ 특정 태그에만 적용 */
a.page-btn { ... }
```

### DOM이 로드되기 전에 렌더링 시도

**원인:** 스크립트가 너무 일찍 실행되었습니다.

**해결:** `initPaginationFromTemplate()` 사용 (자동으로 DOM 로드 대기)
```javascript
// ✅ 권장: 자동으로 DOM 로드 대기
initPaginationFromTemplate('#pagination-root', paginationData);

// ⚠️ 직접 호출 시 DOMContentLoaded 필요
document.addEventListener('DOMContentLoaded', () => {
    renderPagination('#pagination-root', paginationData);
});
```

---

## 📚 추가 리소스

- **Modal Manager**: `/static/js/modal-manager.js` - 모달 공통 유틸리티
- **Template Utils**: `/static/js/template-utils.js` - 템플릿 관련 유틸리티

---

## 📝 버전 이력

### v2.0 (현재)
- ✨ `renderPagination()` 함수 추가
- ✨ `initPaginationFromTemplate()` 함수 추가
- 🎨 HTML을 JavaScript로 동적 생성
- 📦 Go 템플릿 간소화

### v1.0
- 🎉 초기 버전
- `goToPage()`, `initPagination()`, `getQueryString()`, `createPaginationHTML()` 제공
