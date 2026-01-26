package customers

import (
	"backoffice/handlers/errorhandler"
	"backoffice/utils"
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

	// URL에서 지점 파라미터 가져오기
	branchFilter := r.URL.Query().Get("branch")

	// 지점별 필터링
	var filteredCustomers []Customer
	if branchFilter == "" {
		// 전체 고객 (필터 없음)
		filteredCustomers = dummyCustomers
	} else {
		// 선택된 지점의 고객만 필터링
		for _, customer := range dummyCustomers {
			if customer.Branch == branchFilter {
				filteredCustomers = append(filteredCustomers, customer)
			}
		}
	}

	// ID가 972337인 고객의 LastVisit를 현재시간 - 30분으로 동적 설정
	now := time.Now()
	thirtyMinutesAgo := now.Add(-30 * time.Minute)
	lastVisitStr := thirtyMinutesAgo.Format("2006-01-02 15:04")

	for i := range filteredCustomers {
		if filteredCustomers[i].ID == "972337" {
			filteredCustomers[i].LastVisit = lastVisitStr
			break
		}
	}

	// 페이징 처리
	itemsPerPage := 10
	totalItems := len(filteredCustomers)
	pagination := utils.CalculatePagination(currentPage, totalItems, itemsPerPage)

	// 페이징에 따른 슬라이스 범위 계산
	startIdx, endIdx := utils.GetSliceRange(pagination.CurrentPage, itemsPerPage, totalItems)

	var customers []Customer
	if startIdx < totalItems {
		customers = filteredCustomers[startIdx:endIdx]
	}

	// TODO: 실제로는 DB에서 기본 템플릿을 조회해야 함
	// 현재는 더미 데이터 사용
	defaultTemplate := "[{고객명}]님, 안녕하세요.\n\n{날짜} {시간}에 방문 예약이 확정되었습니다.\n\n주소: {주소}\n담당자: {담당자}\n\n기타 문의사항이 있으시면 연락 주세요.\n감사합니다."

	data := PageData{
		Title:           "고객 관리",
		ActiveMenu:      "customers",
		Customers:       customers,
		DefaultTemplate: defaultTemplate,
		Pagination:      pagination,
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
		Title:      "고객 수정",
		ActiveMenu: "customers",
		Customer:   *customer,
	}

	if err := Templates.ExecuteTemplate(w, "customers/edit.html", data); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		log.Println("Template error:", err)
	}
}

// AddHandler - 고객 추가 페이지 핸들러
func AddHandler(w http.ResponseWriter, r *http.Request) {
	data := PageData{
		Title:      "고객 추가",
		ActiveMenu: "customers",
	}

	if err := Templates.ExecuteTemplate(w, "customers/add.html", data); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		log.Println("Template error:", err)
	}
}
