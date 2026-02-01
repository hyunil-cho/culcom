package customers

import (
	"backoffice/config"
	"backoffice/database"
	"backoffice/handlers/integrations"
	"backoffice/middleware"
	"backoffice/utils"
	"encoding/json"
	"html/template"
	"log"
	"net/http"
	"strconv"
	"time"
)

var Templates *template.Template

// Handler - 고객 관리 페이지 핸들러
func Handler(w http.ResponseWriter, r *http.Request) {
	// 페이지 파라미터 가져오기
	pageStr := r.URL.Query().Get("page")
	currentPage := 1
	if pageStr != "" {
		if p, err := strconv.Atoi(pageStr); err == nil && p > 0 {
			currentPage = p
		}
	}

	// 필터 파라미터 가져오기 (기본값: "new")
	filter := r.URL.Query().Get("filter")
	if filter == "" {
		filter = "new"
	}

	// 검색 파라미터 가져오기
	searchType := r.URL.Query().Get("searchType")
	if searchType == "" {
		searchType = "name"
	}
	searchKeyword := r.URL.Query().Get("searchKeyword")

	// 세션에서 선택된 지점 정보 가져오기
	branchCode := middleware.GetSelectedBranch(r)

	// 페이징을 위한 전체 고객 수 조회
	itemsPerPage := 10
	totalItems, err := database.GetCustomersCountByBranch(branchCode, filter, searchType, searchKeyword)
	if err != nil {
		log.Printf("고객 수 조회 오류: %v", err)
		http.Error(w, "고객 수 조회 실패", http.StatusInternalServerError)
		return
	}

	// 페이징 정보 계산
	pagination := utils.CalculatePagination(currentPage, totalItems, itemsPerPage)

	// DB에서 현재 페이지의 고객 목록만 조회
	dbCustomers, err := database.GetCustomersByBranch(branchCode, filter, searchType, searchKeyword, currentPage, itemsPerPage)
	if err != nil {
		log.Printf("고객 목록 조회 오류: %v", err)
		http.Error(w, "고객 목록 조회 실패", http.StatusInternalServerError)
		return
	}

	// DB 고객을 핸들러 모델로 변환
	var customers []Customer
	for _, dbCust := range dbCustomers {
		lastVisit := "-"
		if dbCust.LastUpdateDate != nil {
			lastVisit = *dbCust.LastUpdateDate
		}

		customer := Customer{
			ID:           strconv.Itoa(dbCust.Seq),
			Name:         dbCust.Name,
			Phone:        dbCust.PhoneNumber,
			CallCount:    dbCust.CallCount,
			RegisterDate: dbCust.CreatedDate,
			LastVisit:    lastVisit,
			Status:       "신규", // TODO: 상태 로직 추가 필요
			Email:        "-",
			AdName:       "-",
			Comment:      "",
		}
		if dbCust.Comment != nil {
			customer.Comment = *dbCust.Comment
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
		Title:            "고객 관리",
		ActiveMenu:       "customers",
		Customers:        customers,
		DefaultTemplate:  defaultTemplate,
		MessageTemplates: messageTemplates,
		Pagination:       pagination,
		CurrentFilter:    filter,
		SearchType:       searchType,
		SearchKeyword:    searchKeyword,
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
		if name == "" || phoneNumber == "" {
			log.Println("고객 추가 실패: 필수 필드 누락")
			http.Redirect(w, r, "/customers?error=add", http.StatusSeeOther)
			return
		}

		// 전화번호 형식 검증 (010으로 시작하는 11자리 숫자)
		if !utils.IsValidPhoneNumber(phoneNumber) {
			log.Printf("고객 추가 실패: 잘못된 전화번호 형식 - %s", phoneNumber)
			http.Redirect(w, r, "/customers?error=invalid_phone", http.StatusSeeOther)
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

// UpdateCommentHandler - 고객 코멘트 업데이트 핸들러
func UpdateCommentHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// 요청 파라미터 가져오기
	customerSeqStr := r.FormValue("customer_seq")
	comment := r.FormValue("comment")

	// 파라미터 검증
	customerSeq, err := strconv.Atoi(customerSeqStr)
	if err != nil || customerSeq <= 0 {
		log.Printf("잘못된 customer_seq: %s", customerSeqStr)
		http.Error(w, "Invalid customer ID", http.StatusBadRequest)
		return
	}

	// 코멘트 업데이트
	err = database.UpdateCustomerComment(customerSeq, comment)
	if err != nil {
		log.Printf("코멘트 업데이트 오류: %v", err)
		http.Error(w, "Failed to update comment", http.StatusInternalServerError)
		return
	}

	// 성공 응답
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	w.Write([]byte(`{"success": true, "comment": "` + comment + `"}`))
}

// IncrementCallCountHandler - 고객 통화 횟수 증가 핸들러
func IncrementCallCountHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// 요청 파라미터 가져오기
	customerSeqStr := r.FormValue("customer_seq")

	// 파라미터 검증
	customerSeq, err := strconv.Atoi(customerSeqStr)
	if err != nil || customerSeq <= 0 {
		log.Printf("잘못된 customer_seq: %s", customerSeqStr)
		http.Error(w, "Invalid customer ID", http.StatusBadRequest)
		return
	}

	// 통화 횟수 증가
	callCount, lastUpdateDate, err := database.IncrementCallCount(customerSeq)
	if err != nil {
		log.Printf("통화 횟수 증가 오류: %v", err)
		http.Error(w, "Failed to increment call count", http.StatusInternalServerError)
		return
	}

	// 성공 응답
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	w.Write([]byte(`{"success": true, "call_count": ` + strconv.Itoa(callCount) + `, "last_update_date": "` + lastUpdateDate + `"}`))
}

// CreateReservationHandler - 예약 정보 생성 핸들러
func CreateReservationHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// 세션에서 선택된 지점 정보 가져오기
	branchCode := middleware.GetSelectedBranch(r)

	// 요청 파라미터 가져오기
	customerSeqStr := r.FormValue("customer_seq")
	caller := r.FormValue("caller")
	interviewDateStr := r.FormValue("interview_date")

	// 파라미터 검증
	customerSeq, err := strconv.Atoi(customerSeqStr)
	if err != nil || customerSeq <= 0 {
		log.Printf("잘못된 customer_seq: %s", customerSeqStr)
		http.Error(w, "Invalid customer ID", http.StatusBadRequest)
		return
	}

	if caller == "" {
		log.Println("caller가 비어있음")
		http.Error(w, "Caller is required", http.StatusBadRequest)
		return
	}

	// 날짜 파싱 (클라이언트에서 ISO 8601 형식으로 보낼 예정: 2026-01-29T14:30:00)
	interviewDate, err := time.Parse("2006-01-02T15:04:05", interviewDateStr)
	if err != nil {
		log.Printf("날짜 파싱 오류: %v, 입력값: %s", err, interviewDateStr)
		http.Error(w, "Invalid date format", http.StatusBadRequest)
		return
	}

	// 세션에서 사용자 정보 가져오기
	session, err := config.SessionStore.Get(r, "user-session")
	if err != nil {
		log.Printf("세션 조회 오류: %v", err)
		http.Error(w, "Session error", http.StatusInternalServerError)
		return
	}

	userSeq, ok := session.Values["user_seq"].(int)
	if !ok || userSeq <= 0 {
		log.Println("세션에서 user_seq를 찾을 수 없음")
		http.Error(w, "User not found in session", http.StatusUnauthorized)
		return
	}

	// branchCode로 branchSeq 조회
	var branchSeq int
	branchQuery := `SELECT seq FROM branches WHERE alias = ?`
	err = database.DB.QueryRow(branchQuery, branchCode).Scan(&branchSeq)
	if err != nil {
		log.Printf("지점 조회 오류: %v", err)
		http.Error(w, "Branch not found", http.StatusInternalServerError)
		return
	}

	// 예약 정보 저장
	reservationID, err := database.CreateReservation(branchSeq, customerSeq, userSeq, caller, interviewDate)
	if err != nil {
		log.Printf("예약 생성 오류: %v", err)
		http.Error(w, "Failed to create reservation", http.StatusInternalServerError)
		return
	}

	// 고객 정보 조회 (캘린더 이벤트 생성용)
	var customerName, phoneNumber, comment string
	customerQuery := `SELECT name, phone_number, COALESCE(comment, '') FROM customers WHERE seq = ?`
	err = database.DB.QueryRow(customerQuery, customerSeq).Scan(&customerName, &phoneNumber, &comment)
	if err != nil {
		log.Printf("고객 정보 조회 오류: %v", err)
		// 고객 정보 조회 실패해도 예약은 생성되었으므로 계속 진행
	}

	// 구글 캘린더 이벤트 생성 시도
	var calendarLink string
	calendarService, err := integrations.GetCalendarService(branchCode)
	if err == nil && calendarService != nil {
		// 캘린더가 연동되어 있으면 이벤트 생성
		eventReq := integrations.CreateCalendarEventRequest{
			CustomerName:  customerName,
			PhoneNumber:   phoneNumber,
			InterviewDate: interviewDate.Format("2006-01-02 15:04:05"),
			Comment:       comment,
			Duration:      60, // 기본 60분
		}

		// 캘린더 이벤트 생성
		link, eventErr := integrations.CreateCalendarEvent(branchCode, eventReq)
		if eventErr != nil {
			log.Printf("캘린더 이벤트 생성 실패: %v", eventErr)
			// 캘린더 생성 실패해도 예약은 성공으로 처리
		} else {
			calendarLink = link
			log.Printf("캘린더 이벤트 생성 완료: %s", link)
		}
	} else {
		log.Printf("캘린더 연동 안됨 또는 오류: %v", err)
	}

	// 성공 응답
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	response := map[string]interface{}{
		"success":        true,
		"reservation_id": reservationID,
	}
	if calendarLink != "" {
		response["calendar_link"] = calendarLink
		response["message"] = "예약이 생성되고 구글 캘린더에 추가되었습니다"
	} else {
		response["message"] = "예약이 생성되었습니다"
	}
	json.NewEncoder(w).Encode(response)
}

// UpdateCustomerNameHandler - 고객 이름 업데이트 핸들러
func UpdateCustomerNameHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// 요청 파라미터 가져오기
	customerSeqStr := r.FormValue("customer_seq")
	name := r.FormValue("name")

	// 파라미터 검증
	customerSeq, err := strconv.Atoi(customerSeqStr)
	if err != nil || customerSeq <= 0 {
		log.Printf("잘못된 customer_seq: %s", customerSeqStr)
		http.Error(w, "Invalid customer ID", http.StatusBadRequest)
		return
	}

	if name == "" {
		log.Println("이름이 비어있음")
		http.Error(w, "Name is required", http.StatusBadRequest)
		return
	}

	// 이름 업데이트
	err = database.UpdateCustomerName(customerSeq, name)
	if err != nil {
		log.Printf("이름 업데이트 오류: %v", err)
		http.Error(w, "Failed to update name", http.StatusInternalServerError)
		return
	}

	// 성공 응답
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	w.Write([]byte(`{"success": true}`))
}

// CheckSMSIntegrationHandler - SMS 연동 상태 확인 핸들러
func CheckSMSIntegrationHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// 세션에서 선택된 지점 정보 가져오기
	branchCode := middleware.GetSelectedBranch(r)
	if branchCode == "" {
		log.Println("지점 정보 없음")
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		w.Write([]byte(`{"success": false, "error": "지점 정보가 없습니다."}`))
		return
	}

	// SMS 연동 상태 조회
	status, err := database.GetIntegrationStatus(branchCode, "sms")
	if err != nil {
		log.Printf("SMS 연동 상태 조회 오류: %v", err)
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		w.Write([]byte(`{"success": false, "error": "SMS 연동 정보를 확인할 수 없습니다."}`))
		return
	}

	// 연동 상태 확인
	if !status.HasConfig {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		w.Write([]byte(`{"success": false, "error": "SMS 연동이 설정되지 않았습니다.\n연동 관리 페이지에서 마이문자 서비스를 먼저 연동해주세요."}`))
		return
	}

	if !status.IsConnected {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		w.Write([]byte(`{"success": false, "error": "마이문자 연동이 비활성화 상태입니다.\n연동 관리 페이지에서 마이문자를 활성화해주세요."}`))
		return
	}

	// 연동 상태 정상
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	w.Write([]byte(`{"success": true, "message": "SMS 연동이 정상적으로 설정되어 있습니다."}`))
}

// GetSMSSenderNumbersHandler - SMS 발신번호 목록 조회 핸들러
func GetSMSSenderNumbersHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// 세션에서 선택된 지점 정보 가져오기
	branchCode := middleware.GetSelectedBranch(r)
	if branchCode == "" {
		log.Println("지점 정보 없음")
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		w.Write([]byte(`{"success": false, "error": "지점 정보가 없습니다."}`))
		return
	}

	// SMS 설정 조회
	config, err := database.GetSMSConfig(branchCode)
	if err != nil {
		log.Printf("SMS 설정 조회 오류: %v", err)
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		w.Write([]byte(`{"success": false, "error": "SMS 설정을 조회할 수 없습니다."}`))
		return
	}

	if config == nil || len(config.SenderPhones) == 0 {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		w.Write([]byte(`{"success": false, "error": "등록된 발신번호가 없습니다."}`))
		return
	}

	// JSON 응답 생성 (활성화 상태도 포함)
	isActiveStr := "false"
	if config.IsActive {
		isActiveStr = "true"
	}
	response := `{"success": true, "isActive": ` + isActiveStr + `, "senderPhones": [`
	for i, phone := range config.SenderPhones {
		if i > 0 {
			response += ","
		}
		response += `"` + phone + `"`
	}
	response += `]}`

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	w.Write([]byte(response))
}
