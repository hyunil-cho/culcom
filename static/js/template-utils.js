/**
 * 메시지 템플릿 유틸리티
 * 템플릿 변수 치환 및 날짜 포맷팅 기능 제공
 */

/**
 * 현재 날짜/시간 정보를 가져옵니다
 * @returns {Object} 날짜/시간 정보 객체
 */
function getDateTimeInfo() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    
    return {
        date: `${year}-${month}-${day}`, // 2026-01-30
        time: `${hours}:${minutes}`, // 14:30
        datetime: `${year}-${month}-${day} ${hours}:${minutes}`, // 2026-01-30 14:30
        dateKorean: `${year}년 ${parseInt(month)}월 ${parseInt(day)}일`, // 2026년 1월 30일
        datetimeKorean: `${year}년 ${parseInt(month)}월 ${parseInt(day)}일 ${hours}:${minutes}` // 2026년 1월 30일 14:30
    };
}

/**
 * Date 객체를 한국어 형식으로 포맷팅합니다
 * @param {Date|string} date - Date 객체 또는 ISO 날짜 문자열
 * @param {boolean} includeTime - 시간 포함 여부 (기본값: true)
 * @returns {string} 포맷된 날짜 문자열
 */
function formatDateKorean(date, includeTime = true) {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    
    if (includeTime) {
        return dateObj.toLocaleString('ko-KR', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    } else {
        return dateObj.toLocaleString('ko-KR', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    }
}

/**
 * 선택된 지점명을 가져옵니다
 * @returns {string} 지점명
 */
function getBranchName() {
    // 전역 변수에서 먼저 가져오기
    if (window.branchInfo && window.branchInfo.name) {
        return window.branchInfo.name;
    }
    // fallback: select에서 가져오기
    const branchSelect = document.getElementById('branchSelect');
    return branchSelect ? branchSelect.options[branchSelect.selectedIndex].text : '지점';
}

/**
 * 선택된 지점 담당자를 가져옵니다
 * @returns {string} 담당자명
 */
function getBranchManager() {
    console.log('📞 getBranchManager called, window.branchInfo:', window.branchInfo);
    if (window.branchInfo && window.branchInfo.manager) {
        console.log('✅ Manager found:', window.branchInfo.manager);
        return window.branchInfo.manager;
    }
    console.log('❌ Manager not found');
    return '';
}

/**
 * 선택된 지점 주소를 가져옵니다
 * @returns {string} 주소
 */
function getBranchAddress() {
    console.log('📍 getBranchAddress called, window.branchInfo:', window.branchInfo);
    if (window.branchInfo && window.branchInfo.address) {
        console.log('✅ Address found:', window.branchInfo.address);
        return window.branchInfo.address;
    }
    console.log('❌ Address not found');
    return '';
}

/**
 * 선택된 지점 오시는 길을 가져옵니다
 * @returns {string} 오시는 길
 */
function getBranchDirections() {
    console.log('🗺️ getBranchDirections called, window.branchInfo:', window.branchInfo);
    if (window.branchInfo && window.branchInfo.directions) {
        console.log('✅ Directions found:', window.branchInfo.directions);
        return window.branchInfo.directions;
    }
    console.log('❌ Directions not found');
    return '';
}

/**
 * 이스케이프 시퀀스를 실제 문자로 변환합니다
 * @param {string} content - 변환할 문자열
 * @returns {string} 변환된 문자열
 */
function unescapeContent(content) {
    return content
        .replace(/\\r\\n/g, '\n')
        .replace(/\\n/g, '\n')
        .replace(/\\r/g, '\r')
        .replace(/\\t/g, '\t');
}

/**
 * 템플릿 변수를 실제 값으로 치환합니다
 * @param {string} template - 템플릿 문자열
 * @param {Object} variables - 치환할 변수 객체
 * @returns {string} 치환된 문자열
 * 
 * @example
 * const result = replaceTemplateVariables(
 *   "안녕하세요 {{고객명}}님, {{예약일시}}에 방문 예정입니다.",
 *   {
 *     customerName: "홍길동",
 *     reservationDate: "2026년 2월 1일 14:00"
 *   }
 * );
 */
function replaceTemplateVariables(template, variables = {}) {
    if (!template) return '';
    
    let content = template;
    
    // 이스케이프 시퀀스 변환
    content = unescapeContent(content);
    
    // 날짜/시간 정보 가져오기
    const dateInfo = getDateTimeInfo();
    
    // 지점 정보 가져오기
    const branchName = getBranchName();
    const branchManager = getBranchManager();
    const branchAddress = getBranchAddress();
    const branchDirections = getBranchDirections();
    
    console.log('🔧 Template Variables Debug:', {
        branchName,
        branchManager,
        branchAddress,
        branchDirections,
        branchInfo: window.branchInfo
    });
    
    // 기본 변수 매핑
    const defaultVariables = {
        // 고객 정보
        '{{고객명}}': variables.customerName || '고객',
        '{{전화번호}}': variables.phoneNumber || '',
        
        // 예약 정보
        '{{예약일시}}': variables.reservationDate || '',
        '{{예약날짜}}': variables.reservationDate ? formatDateKorean(variables.reservationDate, false) : '',
        '{{예약시간}}': variables.reservationTime || '',
        
        // 지점 정보
        '{{지점명}}': variables.branchName || branchName,
        '{{지점주소}}': variables.address || branchAddress,
        '{{지점담당자}}': variables.manager || branchManager,
        '{{오시는길}}': variables.directions || branchDirections,
        
        // 날짜/시간
        '{{현재날짜시간}}': dateInfo.datetime,
        '{{현재날짜}}': dateInfo.date,
        '{{현재시간}}': dateInfo.time,
        
        // 기타
        '{{담당자}}': variables.assignedTo || '',
        '{{메모}}': variables.memo || '',
    };
    
    // 변수 치환
    Object.keys(defaultVariables).forEach(key => {
        const regex = new RegExp(key.replace(/[{}]/g, '\\$&'), 'g');
        content = content.replace(regex, defaultVariables[key]);
    });
    
    // 추가 커스텀 변수 치환 (variables 객체에 직접 전달된 경우)
    if (variables.customVariables) {
        Object.keys(variables.customVariables).forEach(key => {
            const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
            content = content.replace(regex, variables.customVariables[key]);
        });
    }
    
    return content;
}

/**
 * 미리보기용 템플릿 변수를 샘플 값으로 치환합니다
 * @param {string} template - 템플릿 문자열
 * @returns {string} 치환된 문자열
 */
function replaceTemplateVariablesForPreview(template) {
    if (!template) return '';
    
    const dateInfo = getDateTimeInfo();
    
    const sampleVariables = {
        customerName: '홍길동',
        phoneNumber: '010-1234-5678',
        reservationDate: dateInfo.datetimeKorean,
        reservationTime: '14:00',
        branchName: getBranchName() || '강남점',
        address: getBranchAddress() || '서울시 강남구 테헤란로 123',
        manager: getBranchManager() || '홍길동',
        directions: getBranchDirections() || '2호선 강남역 3번 출구 도보 5분',
        assignedTo: '김영업',
        memo: '특이사항 없음'
    };
    
    return replaceTemplateVariables(template, sampleVariables);
}

/**
 * 구버전 호환을 위한 단순 치환 함수 (중괄호 단일)
 * @param {string} template - 템플릿 문자열
 * @param {Object} variables - 치환할 변수 객체
 * @returns {string} 치환된 문자열
 * @deprecated replaceTemplateVariables 사용 권장
 */
function replaceTemplateLegacy(template, variables = {}) {
    if (!template) return '';
    
    let content = template;
    
    // 구버전 플레이스홀더 ({고객명} 형식)
    const legacyMappings = {
        '{고객명}': variables.customerName || '고객',
        '{고객이름}': variables.customerName || '고객',
        '{전화번호}': variables.phoneNumber || '',
        '{지점명}': variables.branchName || getBranchName(),
        '{날짜}': variables.date || getDateTimeInfo().date,
        '{시간}': variables.time || getDateTimeInfo().time,
        '{현재날짜}': getDateTimeInfo().datetimeKorean,
        '{주소}': variables.address || '',
        '{담당자}': variables.assignedTo || ''
    };
    
    Object.keys(legacyMappings).forEach(key => {
        const regex = new RegExp(key.replace(/[{}]/g, '\\$&'), 'g');
        content = content.replace(regex, legacyMappings[key]);
    });
    
    return content;
}
