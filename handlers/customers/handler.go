package customers

import (
	"backoffice/database"
	"backoffice/handlers/errorhandler"
	"backoffice/middleware"
	"backoffice/services/sms"
	"backoffice/utils"
	"fmt"
	"html/template"
	"log"
	"net/http"
	"strconv"
	"time"
)

var Templates *template.Template

// 더미 데이터 (실제로는 데이터베이스에서 가져와야 함)
var dummyCustomers = []Customer{
	{ID: "972337", Name: "이재범", Phone: "01000000000", Email: "example1@email.com", AdName: "네이버 검색광고", Status: "신규", RegisterDate: "2026-01-20 17:34", LastVisit: "2026-01-20 18:37", CallCount: 5, Branch: "gasan"},
	{ID: "972181", Name: "김효은", Phone: "01056565656", Email: "example2@email.com", AdName: "구글 디스플레이", Status: "부재중", RegisterDate: "2026-01-20 20:25", LastVisit: "2026-01-20 18:48", CallCount: 3, Branch: "gasan"},
	{ID: "972138", Name: "엠버", Phone: "01025588255", Email: "example3@email.com", AdName: "카카오 채널", Status: "예약완료", RegisterDate: "2026-01-20 20:15", LastVisit: "2026-01-20 18:39", CallCount: 8, Branch: "gasan"},
	{ID: "971925", Name: "Jimi", Phone: "01085229988", Email: "example4@email.com", AdName: "페이스북 광고", Status: "신규", RegisterDate: "2026-01-20 17:58", LastVisit: "2026-01-26 18:48", CallCount: 2, Branch: "gasan"},
	{ID: "971904", Name: "이선균", Phone: "01054220099", Email: "example5@email.com", AdName: "인스타 광고", Status: "전화상 안함", RegisterDate: "2026-01-19 21:00", LastVisit: "2026-01-20 18:44", CallCount: 12, Branch: "gasan"},
	{ID: "971344", Name: "황성우", Phone: "01005696538", Email: "example6@email.com", AdName: "네이버 브랜드검색", Status: "예약완료", RegisterDate: "2026-01-17 20:14", LastVisit: "2026-01-20 18:50", CallCount: 7, Branch: "sinchon"},
	{ID: "970864", Name: "박성민", Phone: "01094423101", Email: "example7@email.com", AdName: "구글 검색광고", Status: "GG", RegisterDate: "2026-01-19 02:10", LastVisit: "2026-01-20 18:48", CallCount: 15, Branch: "gangnam"},
	{ID: "969802", Name: "김재혁", Phone: "01077709800", Email: "example8@email.com", AdName: "유튜브 광고", Status: "부재중", RegisterDate: "2026-01-19 02:02", LastVisit: "2026-01-20 18:49", CallCount: 4, Branch: "gasan"},
	{ID: "969193", Name: "오정환", Phone: "01098739122", Email: "example9@email.com", AdName: "티빙 광고", Status: "신규", RegisterDate: "2026-01-18 18:27", LastVisit: "2026-01-20 18:48", CallCount: 9, Branch: "hongdae"},
	{ID: "967840", Name: "Jinoo Yu", Phone: "01053025799", Email: "example10@email.com", AdName: "네이버 검색광고", Status: "예약완료", RegisterDate: "2026-01-17 20:14", LastVisit: "2026-01-20 18:50", CallCount: 6, Branch: "sinchon"},
}

// getCustomerByID - ID로 고객 조회
func getCustomerByID(id string) *Customer {
	for _, customer := range dummyCustomers {
		if customer.ID == id {
			return &customer
		}
	}
	return nil
}

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

// DetailHandler - 고객 상세 페이지 핸들러
func DetailHandler(w http.ResponseWriter, r *http.Request) {
	// URL에서 ID 추출 (예: /customers/detail?id=972337)
	id := r.URL.Query().Get("id")
	if id == "" {
		http.Redirect(w, r, "/customers", http.StatusSeeOther)
		return
	}

	customer := getCustomerByID(id)
	if customer == nil {
		errorhandler.Handler404(w, r)
		return
	}

	// 샘플 영업 히스토리 데이터
	sampleHistory := []SalesHistory{
		{
			Date:    "2026-01-24",
			Agent:   "김영업",
			Content: "제품 문의 전화 상담",
			Detail:  "A 제품에 대한 상세 사양 및 가격 문의. 대량 구매 가능성 있음.",
			Comment: "재방문 예정",
		},
		{
			Date:    "2026-01-22",
			Agent:   "박차장",
			Content: "제안서 발표 미팅",
			Detail:  "본사 방문하여 신규 프로젝트 제안서 발표 진행. 긍정적인 반응.",
			Comment: "긍정적 반응, 다음 주 후속 미팅",
		},
		{
			Date:    "2026-01-20",
			Agent:   "김영업",
			Content: "견적서 발송",
			Detail:  "요청하신 제품 견적서 이메일로 발송 완료.",
			Comment: "검토 중",
		},
		{
			Date:    "2026-01-18",
			Agent:   "이대리",
			Content: "고객사 방문 상담",
			Detail:  "제품 데모 시연 및 도입 관련 상담 진행.",
			Comment: "데모 만족, 견적 요청",
		},
		{
			Date:    "2026-01-15",
			Agent:   "최과장",
			Content: "이메일 문의 응대",
			Detail:  "제품 브로슈어 및 기술 스펙 자료 전달.",
			Comment: "자료 검토 후 연락 예정",
		},
	}

	data := DetailPageData{
		BasePageData: middleware.GetBasePageData(r),
		Title:        "고객 상세",
		ActiveMenu:   "customers",
		Customer:     *customer,
		SalesHistory: sampleHistory,
	}

	if err := Templates.ExecuteTemplate(w, "customers/detail.html", data); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		log.Println("Template error:", err)
	}
}

// EditHandler - 고객 수정 페이지 핸들러
func EditHandler(w http.ResponseWriter, r *http.Request) {
	// URL에서 ID 추출
	id := r.URL.Query().Get("id")
	if id == "" {
		http.Redirect(w, r, "/customers", http.StatusSeeOther)
		return
	}

	customer := getCustomerByID(id)
	if customer == nil {
		errorhandler.Handler404(w, r)
		return
	}

	data := EditPageData{
		BasePageData: middleware.GetBasePageData(r),
		Title:        "고객 수정",
		ActiveMenu:   "customers",
		Customer:     *customer,
	}

	if err := Templates.ExecuteTemplate(w, "customers/edit.html", data); err != nil {
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
		if !isValidPhoneNumber(phoneNumber) {
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

// isValidPhoneNumber - 전화번호 형식 검증 (010으로 시작하는 11자리 숫자)
func isValidPhoneNumber(phone string) bool {
	if len(phone) != 11 {
		return false
	}
	if phone[0:3] != "010" {
		return false
	}
	for _, c := range phone {
		if c < '0' || c > '9' {
			return false
		}
	}
	return true
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

	// 세션에서 사용자 정보 가져오기 (현재는 임시로 1로 설정)
	// TODO: 실제 세션에서 user_seq 가져오기
	userSeq := 1

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

	// 성공 응답
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	w.Write([]byte(`{"success": true, "reservation_id": ` + strconv.FormatInt(reservationID, 10) + `}`))
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

// SendSMSHandler - SMS 메시지 전송 핸들러
func SendSMSHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
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

	// 요청 파라미터 가져오기
	customerSeqStr := r.FormValue("customer_seq")
	senderPhone := r.FormValue("sender_phone")
	receiverPhone := r.FormValue("receiver_phone")
	message := r.FormValue("message")

	// 파라미터 검증
	customerSeq, err := strconv.Atoi(customerSeqStr)
	if err != nil || customerSeq <= 0 {
		log.Printf("잘못된 customer_seq: %s", customerSeqStr)
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		w.Write([]byte(`{"success": false, "error": "잘못된 고객 정보입니다."}`))
		return
	}

	if senderPhone == "" {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		w.Write([]byte(`{"success": false, "error": "발신번호를 입력해주세요."}`))
		return
	}

	if receiverPhone == "" {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		w.Write([]byte(`{"success": false, "error": "수신번호가 없습니다."}`))
		return
	}

	if message == "" {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		w.Write([]byte(`{"success": false, "error": "메시지 내용을 입력해주세요."}`))
		return
	}

	// SMS 설정 조회
	smsConfig, err := database.GetSMSConfig(branchCode)
	if err != nil {
		log.Printf("SMS 설정 조회 오류: %v", err)
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		w.Write([]byte(`{"success": false, "error": "SMS 설정을 조회할 수 없습니다."}`))
		return
	}

	if smsConfig == nil {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		w.Write([]byte(`{"success": false, "error": "SMS 설정이 등록되지 않았습니다."}`))
		return
	}

	// 활성화 상태 확인
	if !smsConfig.IsActive {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		w.Write([]byte(`{"success": false, "error": "마이문자 연동이 비활성화 상태입니다.\n연동 관리 페이지에서 마이문자를 활성화해주세요."}`))
		return
	}

	// SMS 전송
	sendReq := sms.SendRequest{
		AccountID:     smsConfig.AccountID,
		Password:      smsConfig.Password,
		SenderPhone:   senderPhone,
		ReceiverPhone: receiverPhone,
		Message:       message,
	}

	sendResp, err := sms.Send(sendReq)
	if err != nil {
		log.Printf("SMS 전송 오류: %v", err)
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		w.Write([]byte(`{"success": false, "error": "SMS 전송 중 오류가 발생했습니다."}`))
		return
	}

	if !sendResp.Success {
		log.Printf("SMS 전송 실패: %s (코드: %s)", sendResp.Message, sendResp.Code)
		errorMsg := fmt.Sprintf("SMS 전송 실패: %s", sendResp.Message)
		response := fmt.Sprintf(`{"success": false, "error": %q}`, errorMsg)
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		w.Write([]byte(response))
		return
	}

	// 성공 응답
	log.Printf("SMS 전송 성공 - 고객 ID: %d, 수신번호: %s", customerSeq, receiverPhone)
	response := fmt.Sprintf(`{"success": true, "message": "메시지가 성공적으로 전송되었습니다.", "nums": %q, "cols": %q}`, sendResp.Nums, sendResp.Cols)
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	w.Write([]byte(response))
}
