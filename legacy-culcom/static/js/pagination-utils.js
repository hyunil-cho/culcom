/**
 * Pagination Utils
 * 페이지네이션 관련 공통 유틸리티 함수
 */

/**
 * 페이지 이동 (URL 파라미터 유지)
 * @param {number} page - 이동할 페이지 번호
 * @param {Object} options - 옵션 설정
 * @param {string[]} options.keepParams - 유지할 파라미터 이름 배열 (기본값: 모든 파라미터 유지)
 * @param {string[]} options.removeParams - 제거할 파라미터 이름 배열
 * @param {string} options.basePath - 기본 경로 (기본값: 현재 pathname)
 */
function goToPage(page, options = {}) {
    const {
        keepParams = null,  // null이면 모든 파라미터 유지
        removeParams = [],
        basePath = window.location.pathname
    } = options;

    const urlParams = new URLSearchParams(window.location.search);
    const newParams = new URLSearchParams();

    // 페이지 번호 설정
    newParams.set('page', page);

    // 기존 파라미터 처리
    if (keepParams === null) {
        // 모든 파라미터 유지 (removeParams 제외)
        for (const [key, value] of urlParams.entries()) {
            if (key !== 'page' && !removeParams.includes(key)) {
                newParams.set(key, value);
            }
        }
    } else {
        // 지정된 파라미터만 유지
        for (const param of keepParams) {
            const value = urlParams.get(param);
            if (value !== null) {
                newParams.set(param, value);
            }
        }
    }

    // URL 생성 및 이동
    const queryString = newParams.toString();
    const newUrl = queryString ? `${basePath}?${queryString}` : basePath;
    window.location.href = newUrl;
}

/**
 * 페이지네이션 버튼 이벤트 리스너 자동 설정
 * HTML에 data-page 속성을 가진 버튼에 자동으로 이벤트 리스너를 설정합니다.
 * 
 * 사용 예시:
 * <button class="page-btn" data-page="1">1</button>
 * <button class="page-btn" data-page="2">2</button>
 * 
 * @param {Object} options - goToPage 함수에 전달할 옵션
 */
function initPagination(options = {}) {
    // data-page 속성을 가진 모든 요소에 이벤트 리스너 추가
    document.querySelectorAll('[data-page]').forEach(element => {
        element.addEventListener('click', function(e) {
            e.preventDefault();
            const page = parseInt(this.getAttribute('data-page'));
            if (!isNaN(page)) {
                goToPage(page, options);
            }
        });
    });
}

/**
 * 현재 URL의 쿼리 파라미터를 쿼리스트링으로 반환
 * @param {string[]} excludeParams - 제외할 파라미터 이름 배열
 * @returns {string} 쿼리스트링 (앞에 & 포함, 파라미터가 없으면 빈 문자열)
 */
function getQueryString(excludeParams = ['page']) {
    const urlParams = new URLSearchParams(window.location.search);
    const params = [];

    for (const [key, value] of urlParams.entries()) {
        if (!excludeParams.includes(key)) {
            params.push(`${encodeURIComponent(key)}=${encodeURIComponent(value)}`);
        }
    }

    return params.length > 0 ? '&' + params.join('&') : '';
}

/**
 * 페이지네이션 HTML 동적 생성
 * @param {Object} paginationData - 페이지네이션 데이터
 * @param {number} paginationData.currentPage - 현재 페이지
 * @param {number} paginationData.totalPages - 전체 페이지 수
 * @param {number} paginationData.totalItems - 전체 아이템 수
 * @param {number[]} paginationData.pages - 표시할 페이지 번호 배열
 * @param {boolean} paginationData.hasPrev - 이전 페이지 존재 여부
 * @param {boolean} paginationData.hasNext - 다음 페이지 존재 여부
 * @param {Object} options - 옵션
 * @param {Function} options.onPageClick - 페이지 클릭 시 호출될 콜백 함수
 * @returns {HTMLElement} 페이지네이션 컨테이너 엘리먼트
 */
function createPaginationHTML(paginationData, options = {}) {
    const {
        currentPage,
        totalPages,
        totalItems,
        pages,
        hasPrev,
        hasNext
    } = paginationData;

    const { onPageClick = null } = options;

    // 컨테이너 생성
    const container = document.createElement('div');
    container.className = 'pagination-container';

    // 페이지네이션 버튼 영역
    const pagination = document.createElement('div');
    pagination.className = 'pagination';

    // 이전 버튼
    const prevBtn = document.createElement('button');
    prevBtn.className = 'page-btn page-arrow';
    prevBtn.innerHTML = '◀';
    if (hasPrev) {
        prevBtn.setAttribute('data-page', currentPage - 1);
        if (onPageClick) {
            prevBtn.onclick = () => onPageClick(currentPage - 1);
        }
    } else {
        prevBtn.disabled = true;
        prevBtn.style.opacity = '0.3';
        prevBtn.style.cursor = 'not-allowed';
    }
    pagination.appendChild(prevBtn);

    // 페이지 번호 버튼들
    pages.forEach(page => {
        const pageBtn = document.createElement('button');
        pageBtn.className = 'page-btn';
        pageBtn.textContent = page;

        if (page === currentPage) {
            pageBtn.classList.add('active');
        } else {
            pageBtn.setAttribute('data-page', page);
            if (onPageClick) {
                pageBtn.onclick = () => onPageClick(page);
            }
        }
        pagination.appendChild(pageBtn);
    });

    // 다음 버튼
    const nextBtn = document.createElement('button');
    nextBtn.className = 'page-btn page-arrow';
    nextBtn.innerHTML = '▶';
    if (hasNext) {
        nextBtn.setAttribute('data-page', currentPage + 1);
        if (onPageClick) {
            nextBtn.onclick = () => onPageClick(currentPage + 1);
        }
    } else {
        nextBtn.disabled = true;
        nextBtn.style.opacity = '0.3';
        nextBtn.style.cursor = 'not-allowed';
    }
    pagination.appendChild(nextBtn);

    container.appendChild(pagination);

    // 페이지 정보 텍스트
    const infoDiv = document.createElement('div');
    infoDiv.style.textAlign = 'center';
    infoDiv.style.marginTop = '15px';
    infoDiv.style.color = '#666';
    infoDiv.style.fontSize = '14px';
    infoDiv.textContent = `${currentPage} / ${totalPages} 페이지 (총 ${totalItems}개)`;
    container.appendChild(infoDiv);

    return container;
}

/**
 * 페이지네이션 렌더링 (DOM에 자동 추가)
 * @param {string|HTMLElement} target - 렌더링할 대상 (CSS 셀렉터 또는 DOM 엘리먼트)
 * @param {Object} paginationData - 페이지네이션 데이터
 * @param {number} paginationData.currentPage - 현재 페이지
 * @param {number} paginationData.totalPages - 전체 페이지 수
 * @param {number} paginationData.totalItems - 전체 아이템 수
 * @param {number[]} paginationData.pages - 표시할 페이지 번호 배열
 * @param {boolean} paginationData.hasPrev - 이전 페이지 존재 여부
 * @param {boolean} paginationData.hasNext - 다음 페이지 존재 여부
 * @param {Object} options - 옵션
 * @param {Function} options.onPageClick - 페이지 클릭 시 호출될 콜백 함수 (기본: goToPage)
 * @param {boolean} options.showOnlyIfMultiplePages - 여러 페이지가 있을 때만 표시 (기본: true)
 */
function renderPagination(target, paginationData, options = {}) {
    const {
        onPageClick = goToPage,
        showOnlyIfMultiplePages = true
    } = options;

    // 대상 엘리먼트 가져오기
    const targetElement = typeof target === 'string' 
        ? document.querySelector(target) 
        : target;

    if (!targetElement) {
        console.error('Pagination target element not found:', target);
        return;
    }

    // 빈 데이터나 페이지가 1개 이하면 렌더링하지 않음
    if (!paginationData || (showOnlyIfMultiplePages && paginationData.totalPages <= 1)) {
        targetElement.innerHTML = '';
        return;
    }

    // 기존 내용 제거
    targetElement.innerHTML = '';

    // 페이지네이션 HTML 생성
    const paginationHTML = createPaginationHTML(paginationData, { onPageClick });

    // DOM에 추가
    targetElement.appendChild(paginationHTML);
}

/**
 * Go 템플릿에서 쉽게 사용할 수 있는 페이지네이션 초기화 함수
 * 
 * 사용 예시 (Go 템플릿):
 * <div id="pagination-root"></div>
 * <script>
 *   initPaginationFromTemplate('#pagination-root', {
 *     currentPage: {{.Pagination.CurrentPage}},
 *     totalPages: {{.Pagination.TotalPages}},
 *     totalItems: {{.Pagination.TotalItems}},
 *     pages: [{{range $i, $p := .Pagination.Pages}}{{if $i}},{{end}}{{$p}}{{end}}],
 *     hasPrev: {{.Pagination.HasPrev}},
 *     hasNext: {{.Pagination.HasNext}}
 *   });
 * </script>
 * 
 * @param {string|HTMLElement} target - 렌더링할 대상
 * @param {Object} paginationData - 페이지네이션 데이터
 * @param {Object} options - renderPagination 옵션
 */
function initPaginationFromTemplate(target, paginationData, options = {}) {
    // DOM 로드 완료 후 렌더링
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            renderPagination(target, paginationData, options);
        });
    } else {
        renderPagination(target, paginationData, options);
    }
}
