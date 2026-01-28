package customers

import (
	"backoffice/database"
	"backoffice/handlers/errorhandler"
	"backoffice/middleware"
	"backoffice/utils"
	"html/template"
	"log"
	"net/http"
	"strconv"
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

	// 세션에서 선택된 지점 정보 가져오기
	branchCode := middleware.GetSelectedBranch(r)

	// 페이징을 위한 전체 고객 수 조회
	itemsPerPage := 10
	totalItems, err := database.GetCustomersCountByBranch(branchCode, filter)
	if err != nil {
		log.Printf("고객 수 조회 오류: %v", err)
		http.Error(w, "고객 수 조회 실패", http.StatusInternalServerError)
		return
	}

	// 페이징 정보 계산
	pagination := utils.CalculatePagination(currentPage, totalItems, itemsPerPage)

	// DB에서 현재 페이지의 고객 목록만 조회
	dbCustomers, err := database.GetCustomersByBranch(branchCode, filter, currentPage, itemsPerPage)
	if err != nil {
		log.Printf("고객 목록 조회 오류: %v", err)
		http.Error(w, "고객 목록 조회 실패", http.StatusInternalServerError)
		return
	}

	// DB 고객을 핸들러 모델로 변환
	var customers []Customer
	for _, dbCust := range dbCustomers {
		customer := Customer{
			ID:           strconv.Itoa(dbCust.Seq),
			Name:         dbCust.Name,
			Phone:        dbCust.PhoneNumber,
			CallCount:    dbCust.CallCount,
			RegisterDate: dbCust.CreatedDate,
			LastVisit:    dbCust.LastUpdateDate,
			Status:       "신규", // TODO: 상태 로직 추가 필요
			Email:        "-",
			AdName:       "-",
		}
		if dbCust.Comment != nil {
			customer.Email = *dbCust.Comment // 임시로 comment를 email 필드에 표시
		}
		customers = append(customers, customer)
	}

	// TODO: 실제로는 DB에서 기본 템플릿을 조회해야 함
	// 현재는 더미 데이터 사용
	defaultTemplate := "[{고객명}]님, 안녕하세요.\n\n{날짜} {시간}에 방문 예약이 확정되었습니다.\n\n주소: {주소}\n담당자: {담당자}\n\n기타 문의사항이 있으시면 연락 주세요.\n감사합니다."

	data := PageData{
		BasePageData:    middleware.GetBasePageData(r),
		Title:           "고객 관리",
		ActiveMenu:      "customers",
		Customers:       customers,
		DefaultTemplate: defaultTemplate,
		Pagination:      pagination,
		CurrentFilter:   filter,
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
