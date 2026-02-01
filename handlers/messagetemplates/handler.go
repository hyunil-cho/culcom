package messagetemplates

import (
	"backoffice/database"
	"backoffice/middleware"
	"backoffice/utils"
	"log"
	"net/http"
	"strconv"
)

// Handler 메시지 템플릿 목록 페이지
func Handler(w http.ResponseWriter, r *http.Request) {
	// 페이지 파라미터 가져오기
	currentPage := utils.GetCurrentPageFromRequest(r)

	// 세션에서 선택된 지점 정보 가져오기
	branchCode := middleware.GetSelectedBranch(r)

	// DB에서 템플릿 목록 조회 (지점별)
	dbTemplates, err := database.GetMessageTemplates(branchCode)
	if err != nil {
		log.Printf("템플릿 조회 오류: %v", err)
		http.Error(w, "템플릿 조회 실패", http.StatusInternalServerError)
		return
	}

	// DB 템플릿을 핸들러 모델로 변환
	allTemplates := make([]MessageTemplate, len(dbTemplates))
	for i, tmpl := range dbTemplates {
		allTemplates[i] = MessageTemplate{
			ID:          tmpl.ID,
			Name:        tmpl.Name,
			Content:     tmpl.Content,
			Description: tmpl.Description,
			IsActive:    tmpl.IsActive,
			IsDefault:   tmpl.IsDefault,
			CreatedAt:   tmpl.CreatedAt.Format("2006-01-02 15:04:05"),
			UpdatedAt:   tmpl.UpdatedAt.Format("2006-01-02 15:04:05"),
		}
	}

	// 페이징 처리
	itemsPerPage := 6
	totalItems := len(allTemplates)
	pagination := utils.CalculatePagination(currentPage, totalItems, itemsPerPage)

	// 페이징에 따른 슬라이스 범위 계산
	startIdx, endIdx := utils.GetSliceRange(pagination.CurrentPage, itemsPerPage, totalItems)

	var templates []MessageTemplate
	if startIdx < totalItems {
		templates = allTemplates[startIdx:endIdx]
	}

	data := TemplateListPageData{
		BasePageData: middleware.GetBasePageData(r),
		Title:        "메시지 템플릿 관리",
		ActiveMenu:   "message-templates",
		Templates:    templates,
		Pagination:   pagination,
	}

	log.Println("Executing template: message-templates/list.html")
	err = Templates.ExecuteTemplate(w, "message-templates/list.html", data)
	if err != nil {
		log.Printf("Template execution error: %v", err)
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
}

// AddHandler 메시지 템플릿 추가 페이지
func AddHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method == http.MethodGet {
		// DB에서 플레이스홀더 목록 조회
		dbPlaceholders, err := database.GetPlaceholders()
		if err != nil {
			log.Printf("플레이스홀더 조회 오류: %v", err)
			http.Error(w, "플레이스홀더 조회 실패", http.StatusInternalServerError)
			return
		}

		// DB 플레이스홀더를 핸들러 모델로 변환
		placeholders := make([]Placeholder, len(dbPlaceholders))
		for i, ph := range dbPlaceholders {
			placeholders[i] = Placeholder{
				Key:         ph.Key,
				Label:       ph.Label,
				Description: ph.Description,
				Example:     ph.Example,
			}
		}

		data := TemplateFormPageData{
			BasePageData: middleware.GetBasePageData(r),
			Title:        "메시지 템플릿 추가",
			ActiveMenu:   "message-templates",
			Template:     nil,
			Placeholders: placeholders,
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

		// 세션에서 선택된 지점 정보 가져오기
		branchCode := middleware.GetSelectedBranch(r)

		// 폼 데이터
		name := r.FormValue("name")
		content := r.FormValue("content")
		description := r.FormValue("description")
		isActive := r.FormValue("is_active") == "on"

		// DB에 저장
		err = database.SaveMessageTemplate(branchCode, name, content, description, isActive)
		if err != nil {
			log.Printf("템플릿 저장 오류: %v", err)
			http.Redirect(w, r, "/message-templates?error=add", http.StatusSeeOther)
			return
		}

		http.Redirect(w, r, "/message-templates?success=add", http.StatusSeeOther)
		return
	}

	http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
}

// EditHandler 메시지 템플릿 수정 페이지
func EditHandler(w http.ResponseWriter, r *http.Request) {
	idStr := r.URL.Query().Get("id")
	id, err := strconv.Atoi(idStr)
	if err != nil {
		http.Redirect(w, r, "/message-templates?error=invalid_id", http.StatusSeeOther)
		return
	}

	if r.Method == http.MethodGet {
		// DB에서 템플릿 조회
		dbTemplate, err := database.GetMessageTemplateByID(id)
		if err != nil {
			log.Printf("템플릿 조회 오류: %v", err)
			http.Redirect(w, r, "/message-templates?error=invalid_id", http.StatusSeeOther)
			return
		}

		// DB 템플릿을 핸들러 모델로 변환
		template := &MessageTemplate{
			ID:          dbTemplate.ID,
			Name:        dbTemplate.Name,
			Content:     dbTemplate.Content,
			Description: dbTemplate.Description,
			IsActive:    dbTemplate.IsActive,
			CreatedAt:   dbTemplate.CreatedAt.Format("2006-01-02 15:04:05"),
			UpdatedAt:   dbTemplate.UpdatedAt.Format("2006-01-02 15:04:05"),
		}

		// DB에서 플레이스홀더 목록 조회
		dbPlaceholders, err := database.GetPlaceholders()
		if err != nil {
			log.Printf("플레이스홀더 조회 오류: %v", err)
			http.Error(w, "플레이스홀더 조회 실패", http.StatusInternalServerError)
			return
		}

		// DB 플레이스홀더를 핸들러 모델로 변환
		placeholders := make([]Placeholder, len(dbPlaceholders))
		for i, ph := range dbPlaceholders {
			placeholders[i] = Placeholder{
				Key:         ph.Key,
				Label:       ph.Label,
				Description: ph.Description,
				Example:     ph.Example,
			}
		}

		data := TemplateFormPageData{
			BasePageData: middleware.GetBasePageData(r),
			Title:        "메시지 템플릿 수정",
			ActiveMenu:   "message-templates",
			Template:     template,
			Placeholders: placeholders,
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

		// 세션에서 선택된 지점 정보 가져오기
		branchCode := middleware.GetSelectedBranch(r)

		// 폼 데이터
		name := r.FormValue("name")
		content := r.FormValue("content")
		description := r.FormValue("description")
		isActive := r.FormValue("is_active") == "on"

		// DB 업데이트
		err = database.UpdateMessageTemplate(branchCode, id, name, content, description, isActive)
		if err != nil {
			log.Printf("템플릿 수정 오류: %v", err)
			http.Redirect(w, r, "/message-templates?error=edit", http.StatusSeeOther)
			return
		}

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

	idStr := r.URL.Query().Get("id")
	if idStr == "" {
		log.Println("템플릿 ID가 제공되지 않음")
		http.Redirect(w, r, "/message-templates?error=invalid_id", http.StatusSeeOther)
		return
	}

	id, err := strconv.Atoi(idStr)
	if err != nil {
		log.Printf("잘못된 템플릿 ID: %s\n", idStr)
		http.Redirect(w, r, "/message-templates?error=invalid_id", http.StatusSeeOther)
		return
	}

	// 세션에서 선택된 지점 정보 가져오기
	branchCode := middleware.GetSelectedBranch(r)

	// DB에서 템플릿 삭제 (지점별)
	err = database.DeleteMessageTemplate(branchCode, id)
	if err != nil {
		log.Printf("템플릿 삭제 실패: %v\n", err)
		http.Redirect(w, r, "/message-templates?error=delete_failed", http.StatusSeeOther)
		return
	}

	log.Printf("템플릿 ID %d 삭제 성공\n", id)
	http.Redirect(w, r, "/message-templates?success=delete", http.StatusSeeOther)
}

// SetDefaultHandler 메시지 템플릿 기본값 설정
func SetDefaultHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	idStr := r.URL.Query().Get("id")
	if idStr == "" {
		log.Println("템플릿 ID가 제공되지 않음")
		http.Redirect(w, r, "/message-templates?error=invalid_id", http.StatusSeeOther)
		return
	}

	id, err := strconv.Atoi(idStr)
	if err != nil {
		log.Printf("잘못된 템플릿 ID: %s\n", idStr)
		http.Redirect(w, r, "/message-templates?error=invalid_id", http.StatusSeeOther)
		return
	}

	// 세션에서 선택된 지점 정보 가져오기
	branchCode := middleware.GetSelectedBranch(r)

	// DB를 통해 기본 템플릿 설정 (지점별)
	err = database.SetDefaultMessageTemplate(branchCode, id)
	if err != nil {
		log.Printf("기본 템플릿 설정 실패: %v\n", err)
		http.Redirect(w, r, "/message-templates?error=set_default_failed", http.StatusSeeOther)
		return
	}

	log.Printf("템플릿 ID %d를 기본값으로 설정 성공\n", id)
	http.Redirect(w, r, "/message-templates?success=default", http.StatusSeeOther)
}
