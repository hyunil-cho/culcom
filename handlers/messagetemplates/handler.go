package messagetemplates

import (
	"log"
	"net/http"
	"strconv"
)

// Handler 메시지 템플릿 목록 페이지
func Handler(w http.ResponseWriter, r *http.Request) {
	// 페이지 파라미터 가져오기
	pageStr := r.URL.Query().Get("page")
	currentPage := 1
	if pageStr != "" {
		if p, err := strconv.Atoi(pageStr); err == nil && p > 0 {
			currentPage = p
		}
	}

	// TODO: 실제로는 DB에서 템플릿 목록 조회
	allTemplates := []MessageTemplate{
		{
			ID:          1,
			Name:        "예약 확인 메시지",
			Category:    "예약",
			Content:     "{이름}님, {날짜} {시간}에 {지점명} 예약이 완료되었습니다.",
			Description: "고객 예약 확인용 메시지",
			IsActive:    true,
			IsDefault:   true,
			CreatedAt:   "2024-01-15 10:00:00",
			UpdatedAt:   "2024-01-15 10:00:00",
		},
		{
			ID:          2,
			Name:        "결제 완료 안내",
			Category:    "결제",
			Content:     "{이름}님, {금액}원 결제가 완료되었습니다. 감사합니다.",
			Description: "결제 완료 시 발송되는 메시지",
			IsActive:    true,
			IsDefault:   false,
			CreatedAt:   "2024-01-16 14:30:00",
			UpdatedAt:   "2024-01-16 14:30:00",
		},
		{
			ID:          3,
			Name:        "이벤트 안내",
			Category:    "마케팅",
			Content:     "[{지점명}] {이름}님께 특별한 혜택을 드립니다. {이벤트내용}",
			Description: "프로모션 및 이벤트 안내용",
			IsActive:    false,
			IsDefault:   false,
			CreatedAt:   "2024-01-10 09:00:00",
			UpdatedAt:   "2024-01-18 16:00:00",
		},
		{
			ID:          4,
			Name:        "예약 리마인더",
			Category:    "예약",
			Content:     "{이름}님, 내일 {시간}에 {지점명} 예약이 있습니다.",
			Description: "예약 하루 전 발송되는 알림",
			IsActive:    true,
			IsDefault:   false,
			CreatedAt:   "2024-01-17 11:00:00",
			UpdatedAt:   "2024-01-17 11:00:00",
		},
		{
			ID:          5,
			Name:        "예약 취소 확인",
			Category:    "예약",
			Content:     "{이름}님, {날짜} {시간} 예약이 취소되었습니다.",
			Description: "예약 취소 시 발송되는 메시지",
			IsActive:    true,
			IsDefault:   false,
			CreatedAt:   "2024-01-18 15:20:00",
			UpdatedAt:   "2024-01-18 15:20:00",
		},
		{
			ID:          6,
			Name:        "신규 회원 환영",
			Category:    "마케팅",
			Content:     "{이름}님, 회원가입을 환영합니다! 첫 구매 시 10% 할인 혜택을 드립니다.",
			Description: "신규 회원 가입 시 환영 메시지",
			IsActive:    true,
			IsDefault:   false,
			CreatedAt:   "2024-01-19 09:30:00",
			UpdatedAt:   "2024-01-19 09:30:00",
		},
		{
			ID:          7,
			Name:        "생일 축하 메시지",
			Category:    "마케팅",
			Content:     "{이름}님, 생일을 진심으로 축하드립니다! 특별한 쿠폰을 선물로 드립니다.",
			Description: "고객 생일 축하 메시지",
			IsActive:    true,
			IsDefault:   false,
			CreatedAt:   "2024-01-20 10:00:00",
			UpdatedAt:   "2024-01-20 10:00:00",
		},
		{
			ID:          8,
			Name:        "결제 실패 안내",
			Category:    "결제",
			Content:     "{이름}님, 결제 처리 중 오류가 발생했습니다. 다시 시도해주세요.",
			Description: "결제 실패 시 안내 메시지",
			IsActive:    true,
			IsDefault:   false,
			CreatedAt:   "2024-01-21 13:45:00",
			UpdatedAt:   "2024-01-21 13:45:00",
		},
	}

	// 페이징 계산
	itemsPerPage := 6
	totalItems := len(allTemplates)
	totalPages := (totalItems + itemsPerPage - 1) / itemsPerPage

	// 현재 페이지가 범위를 벗어나면 조정
	if currentPage > totalPages && totalPages > 0 {
		currentPage = totalPages
	}

	// 현재 페이지에 해당하는 템플릿만 추출
	startIdx := (currentPage - 1) * itemsPerPage
	endIdx := startIdx + itemsPerPage
	if endIdx > totalItems {
		endIdx = totalItems
	}

	var templates []MessageTemplate
	if startIdx < totalItems {
		templates = allTemplates[startIdx:endIdx]
	}

	// 페이지 번호 목록 생성 (최대 5개 표시)
	pages := []int{}
	startPage := currentPage - 2
	if startPage < 1 {
		startPage = 1
	}
	endPage := startPage + 4
	if endPage > totalPages {
		endPage = totalPages
		startPage = endPage - 4
		if startPage < 1 {
			startPage = 1
		}
	}
	for i := startPage; i <= endPage; i++ {
		pages = append(pages, i)
	}

	// 페이징 정보 구성
	pagination := Pagination{
		CurrentPage:  currentPage,
		TotalPages:   totalPages,
		TotalItems:   totalItems,
		ItemsPerPage: itemsPerPage,
		HasPrev:      currentPage > 1,
		HasNext:      currentPage < totalPages,
		Pages:        pages,
	}

	data := TemplateListPageData{
		Title:      "메시지 템플릿 관리",
		ActiveMenu: "message-templates",
		Templates:  templates,
		Categories: []string{"전체", "예약", "결제", "마케팅", "공지"},
		Pagination: pagination,
	}

	log.Println("Executing template: message-templates/list.html")
	err := Templates.ExecuteTemplate(w, "message-templates/list.html", data)
	if err != nil {
		log.Printf("Template execution error: %v", err)
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
}

// AddHandler 메시지 템플릿 추가 페이지
func AddHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method == http.MethodGet {
		// 사용 가능한 플레이스홀더 목록
		placeholders := []Placeholder{
			{Key: "{이름}", Label: "고객 이름", Description: "고객의 이름", Example: "홍길동"},
			{Key: "{날짜}", Label: "날짜", Description: "예약 또는 이벤트 날짜", Example: "2024년 1월 23일"},
			{Key: "{시간}", Label: "시간", Description: "예약 시간", Example: "14:00"},
			{Key: "{지점명}", Label: "지점명", Description: "서비스 제공 지점", Example: "강남점"},
			{Key: "{금액}", Label: "금액", Description: "결제 또는 청구 금액", Example: "50,000"},
			{Key: "{전화번호}", Label: "전화번호", Description: "고객 전화번호", Example: "010-1234-5678"},
			{Key: "{이메일}", Label: "이메일", Description: "고객 이메일", Example: "customer@example.com"},
			{Key: "{주소}", Label: "주소", Description: "고객 주소", Example: "서울시 강남구"},
			{Key: "{이벤트내용}", Label: "이벤트 내용", Description: "이벤트 상세 내용", Example: "20% 할인 쿠폰"},
			{Key: "{담당자}", Label: "담당자", Description: "담당 직원 이름", Example: "김매니저"},
		}

		data := TemplateFormPageData{
			Title:        "메시지 템플릿 추가",
			ActiveMenu:   "message-templates",
			Template:     nil,
			Placeholders: placeholders,
			Categories:   []string{"예약", "결제", "마케팅", "공지", "기타"},
			IsEdit:       false,
		}

		Templates.ExecuteTemplate(w, "message-templates/form.html", data)
		return
	}

	if r.Method == http.MethodPost {
		// 폼 데이터 추출
		err := r.ParseForm()
		if err != nil {
			http.Error(w, "잘못된 요청입니다", http.StatusBadRequest)
			return
		}

		// TODO: 실제로는 DB에 저장
		// template := MessageTemplate{
		// 	Name:        r.FormValue("name"),
		// 	Category:    r.FormValue("category"),
		// 	Content:     r.FormValue("content"),
		// 	Description: r.FormValue("description"),
		// 	IsActive:    r.FormValue("is_active") == "on",
		// }
		// database.SaveMessageTemplate(&template)

		http.Redirect(w, r, "/message-templates?success=add", http.StatusSeeOther)
		return
	}

	http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
}

// EditHandler 메시지 템플릿 수정 페이지
func EditHandler(w http.ResponseWriter, r *http.Request) {
	_ = r.URL.Query().Get("id") // TODO: DB 조회 시 사용

	if r.Method == http.MethodGet {
		// TODO: 실제로는 DB에서 템플릿 조회
		template := &MessageTemplate{
			ID:          1,
			Name:        "예약 확인 메시지",
			Category:    "예약",
			Content:     "{이름}님, {날짜} {시간}에 {지점명} 예약이 완료되었습니다.",
			Description: "고객 예약 확인용 메시지",
			IsActive:    true,
			CreatedAt:   "2024-01-15 10:00:00",
			UpdatedAt:   "2024-01-15 10:00:00",
		}

		placeholders := []Placeholder{
			{Key: "{이름}", Label: "고객 이름", Description: "고객의 이름", Example: "홍길동"},
			{Key: "{날짜}", Label: "날짜", Description: "예약 또는 이벤트 날짜", Example: "2024년 1월 23일"},
			{Key: "{시간}", Label: "시간", Description: "예약 시간", Example: "14:00"},
			{Key: "{지점명}", Label: "지점명", Description: "서비스 제공 지점", Example: "강남점"},
			{Key: "{금액}", Label: "금액", Description: "결제 또는 청구 금액", Example: "50,000"},
			{Key: "{전화번호}", Label: "전화번호", Description: "고객 전화번호", Example: "010-1234-5678"},
			{Key: "{이메일}", Label: "이메일", Description: "고객 이메일", Example: "customer@example.com"},
			{Key: "{주소}", Label: "주소", Description: "고객 주소", Example: "서울시 강남구"},
			{Key: "{이벤트내용}", Label: "이벤트 내용", Description: "이벤트 상세 내용", Example: "20% 할인 쿠폰"},
			{Key: "{담당자}", Label: "담당자", Description: "담당 직원 이름", Example: "김매니저"},
		}

		data := TemplateFormPageData{
			Title:        "메시지 템플릿 수정",
			ActiveMenu:   "message-templates",
			Template:     template,
			Placeholders: placeholders,
			Categories:   []string{"예약", "결제", "마케팅", "공지", "기타"},
			IsEdit:       true,
		}

		Templates.ExecuteTemplate(w, "message-templates/form.html", data)
		return
	}

	if r.Method == http.MethodPost {
		err := r.ParseForm()
		if err != nil {
			http.Error(w, "잘못된 요청입니다", http.StatusBadRequest)
			return
		}

		// TODO: 실제로는 DB 업데이트
		// database.UpdateMessageTemplate(id, template)

		http.Redirect(w, r, "/message-templates?success=edit", http.StatusSeeOther)
		return
	}

	http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
}

// DeleteHandler 메시지 템플릿 삭제
func DeleteHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	_ = r.URL.Query().Get("id") // TODO: DB 삭제 시 사용

	// TODO: 실제로는 DB에서 삭제
	// database.DeleteMessageTemplate(id)

	http.Redirect(w, r, "/message-templates?success=delete", http.StatusSeeOther)
}

// SetDefaultHandler 메시지 템플릿 기본값 설정
func SetDefaultHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	_ = r.URL.Query().Get("id") // TODO: DB 업데이트 시 사용

	// TODO: 실제로는 DB에서 업데이트
	// 1. 모든 템플릿의 IsDefault를 false로 설정
	// database.ClearAllDefaultTemplates()
	// 2. 선택된 템플릿의 IsDefault를 true로 설정
	// database.SetTemplateAsDefault(id)

	http.Redirect(w, r, "/message-templates?success=default", http.StatusSeeOther)
}
