package customers

import (
	"backoffice/handlers/errorhandler"
	"html/template"
	"log"
	"net/http"
)

var Templates *template.Template

// 더미 데이터 (실제로는 데이터베이스에서 가져와야 함)
var dummyCustomers = []Customer{
	{ID: "972337", Name: "이재범", Phone: "010-0000-0000", Email: "example1@email.com", AdName: "네이버 검색광고", Status: "신규", RegisterDate: "2026-01-20", LastVisit: "2026-01-20", CallCount: 5},
	{ID: "972181", Name: "김효은", Phone: "010-5656-5656", Email: "example2@email.com", AdName: "구글 디스플레이", Status: "부재중", RegisterDate: "2026-01-20", LastVisit: "2026-01-20", CallCount: 3},
	{ID: "972138", Name: "엠버", Phone: "010-2558-8255", Email: "example3@email.com", AdName: "카카오 채널", Status: "예약완료", RegisterDate: "2026-01-20", LastVisit: "2026-01-20", CallCount: 8},
	{ID: "971925", Name: "Jimi", Phone: "010-8522-9988", Email: "example4@email.com", AdName: "페이스북 광고", Status: "신규", RegisterDate: "2026-01-20", LastVisit: "2026-01-20", CallCount: 2},
	{ID: "971904", Name: "이선균", Phone: "010-5422-0099", Email: "example5@email.com", AdName: "인스타 광고", Status: "전화상 안함", RegisterDate: "2026-01-20", LastVisit: "2026-01-20", CallCount: 12},
	{ID: "971344", Name: "황성우", Phone: "010-0569-6538", Email: "example6@email.com", AdName: "네이버 브랜드검색", Status: "예약완료", RegisterDate: "2026-01-20", LastVisit: "2026-01-20", CallCount: 7},
	{ID: "970864", Name: "박성민", Phone: "010-9442-3101", Email: "example7@email.com", AdName: "구글 검색광고", Status: "GG", RegisterDate: "2026-01-19", LastVisit: "2026-01-20", CallCount: 15},
	{ID: "969802", Name: "김재혁", Phone: "010-7770-9800", Email: "example8@email.com", AdName: "유튜브 광고", Status: "부재중", RegisterDate: "2026-01-19", LastVisit: "2026-01-20", CallCount: 4},
	{ID: "969193", Name: "오정환", Phone: "010-9873-9122", Email: "example9@email.com", AdName: "티빙 광고", Status: "신규", RegisterDate: "2026-01-18", LastVisit: "2026-01-20", CallCount: 9},
	{ID: "967840", Name: "Jinoo Yu", Phone: "010-5302-5799", Email: "example10@email.com", AdName: "네이버 검색광고", Status: "예약완료", RegisterDate: "2026-01-17", LastVisit: "2026-01-20", CallCount: 6},
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
	data := PageData{
		Title:      "고객 관리",
		ActiveMenu: "customers",
		Customers:  dummyCustomers,
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
