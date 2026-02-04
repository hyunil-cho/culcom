package customers

import (
	"backoffice/database"
	"backoffice/middleware"
	"backoffice/utils"
	"html/template"
	"log"
	"net/http"
	"strconv"
)

var Templates *template.Template

// Handler - 고객 관리 페이지 핸들러 (SSR)
func Handler(w http.ResponseWriter, r *http.Request) {
	// 페이지 파라미터 가져오기
	currentPage := utils.GetCurrentPageFromRequest(r)

	// 검색 파라미터 가져오기
	searchParams := utils.GetSearchParams(r)
	filter := utils.GetQueryParam(r, "filter", "new")

	// 세션에서 선택된 지점 정보 가져오기
	branchCode := middleware.GetSelectedBranch(r)

	// 페이징을 위한 전체 고객 수 조회
	itemsPerPage := 10
	totalItems, err := database.GetCustomersCountByBranch(branchCode, filter, searchParams.SearchType, searchParams.SearchKeyword)
	if err != nil {
		log.Printf("고객 수 조회 오류: %v", err)
		http.Error(w, "고객 수 조회 실패", http.StatusInternalServerError)
		return
	}

	// 페이징 정보 계산
	pagination := utils.CalculatePagination(currentPage, totalItems, itemsPerPage)

	// DB에서 현재 페이지의 고객 목록만 조회
	dbCustomers, err := database.GetCustomersByBranch(branchCode, filter, searchParams.SearchType, searchParams.SearchKeyword, currentPage, itemsPerPage)
	if err != nil {
		log.Printf("고객 목록 조회 오류: %v", err)
		http.Error(w, "고객 목록 조회 실패", http.StatusInternalServerError)
		return
	}

	// DB 고객을 핸들러 모델로 변환
	var customers []Customer
	for _, dbCust := range dbCustomers {
		LastContactDate := "-"
		if dbCust.LastUpdateDate != nil {
			LastContactDate = *dbCust.LastUpdateDate
		}

		adName := ""
		if dbCust.CommercialName != nil {
			adName = *dbCust.CommercialName
		}

		adSource := ""
		if dbCust.AdSource != nil {
			adSource = *dbCust.AdSource
		}

		comment := ""
		if dbCust.Comment != nil {
			comment = *dbCust.Comment
		}

		customer := Customer{
			ID:              strconv.Itoa(dbCust.Seq),
			Name:            dbCust.Name,
			Phone:           dbCust.PhoneNumber,
			CallCount:       dbCust.CallCount,
			RegisterDate:    dbCust.CreatedDate,
			LastContactDate: LastContactDate,
			AdName:          adName,
			AdSource:        adSource,
			Comment:         comment,
		}
		customers = append(customers, customer)
	}

	// 메시지 템플릿 조회
	messageTemplates, err := database.GetMessageTemplates(branchCode)
	if err != nil {
		log.Printf("메시지 템플릿 조회 오류: %v", err)
		// 에러가 발생해도 빈 배열로 처리하여 계속 진행
		messageTemplates = []database.MessageTemplate{}
	}

	// 기본 템플릿 찾기
	defaultTemplate := ""
	for _, tmpl := range messageTemplates {
		if tmpl.IsDefault {
			defaultTemplate = tmpl.Content
			break
		}
	}

	data := PageData{
		BasePageData:     middleware.GetBasePageData(r),
		Title:            "지원자 회신 관리",
		ActiveMenu:       "customers",
		Customers:        customers,
		DefaultTemplate:  defaultTemplate,
		MessageTemplates: messageTemplates,
		Pagination:       pagination,
		CurrentFilter:    filter,
		SearchType:       searchParams.SearchType,
		SearchKeyword:    searchParams.SearchKeyword,
		TotalCount:       totalItems,
	}

	if err := Templates.ExecuteTemplate(w, "customers/list.html", data); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		log.Println("Template error:", err)
	}
}

// AddHandler - 워크인 고객 추가 페이지 핸들러
func AddHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method == http.MethodGet {
		data := PageData{
			BasePageData: middleware.GetBasePageData(r),
			Title:        "워크인 고객 추가",
			ActiveMenu:   "customers",
		}

		if err := Templates.ExecuteTemplate(w, "customers/add.html", data); err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			log.Println("Template error:", err)
		}
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
		phoneNumber := r.FormValue("phone_number")
		comment := r.FormValue("comment")

		// 유효성 검사
		err = ValidateAddCustomerForm(name, phoneNumber)
		if err != nil {
			log.Printf("고객 추가 실패: %v", err)
			http.Redirect(w, r, "/customers?error=add", http.StatusSeeOther)
			return
		}

		// DB에 저장
		_, err = database.InsertCustomer(branchCode, name, phoneNumber, comment)
		if err != nil {
			log.Printf("고객 저장 오류: %v", err)
			http.Redirect(w, r, "/customers?error=add", http.StatusSeeOther)
			return
		}

		log.Printf("고객 추가 성공 - Name: %s, Phone: %s", name, phoneNumber)
		http.Redirect(w, r, "/customers?success=add", http.StatusSeeOther)
		return
	}

	http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
}
