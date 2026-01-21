package customers

import (
	"html/template"
	"log"
	"net/http"
)

var Templates *template.Template

// 더미 데이터 (실제로는 데이터베이스에서 가져와야 함)
var dummyCustomers = []Customer{
	{ID: "972337", Name: "이재범", Phone: "010-0000-0000", Email: "example1@email.com", Status: "정상", RegisterDate: "2026-01-20", LastVisit: "2026-01-20"},
	{ID: "972181", Name: "김효은", Phone: "010-5656-5656", Email: "example2@email.com", Status: "정상", RegisterDate: "2026-01-20", LastVisit: "2026-01-20"},
	{ID: "972138", Name: "엠버", Phone: "010-2558-8255", Email: "example3@email.com", Status: "정상", RegisterDate: "2026-01-20", LastVisit: "2026-01-20"},
	{ID: "971925", Name: "Jimi", Phone: "010-8522-9988", Email: "example4@email.com", Status: "정상", RegisterDate: "2026-01-20", LastVisit: "2026-01-20"},
	{ID: "971904", Name: "이선균", Phone: "010-5422-0099", Email: "example5@email.com", Status: "정상", RegisterDate: "2026-01-20", LastVisit: "2026-01-20"},
	{ID: "971344", Name: "황성우", Phone: "010-0569-6538", Email: "example6@email.com", Status: "정상", RegisterDate: "2026-01-20", LastVisit: "2026-01-20"},
	{ID: "970864", Name: "박성민", Phone: "010-9442-3101", Email: "example7@email.com", Status: "정상", RegisterDate: "2026-01-19", LastVisit: "2026-01-20"},
	{ID: "969802", Name: "김재혁", Phone: "010-7770-9800", Email: "example8@email.com", Status: "정상", RegisterDate: "2026-01-19", LastVisit: "2026-01-20"},
	{ID: "969193", Name: "오정환", Phone: "010-9873-9122", Email: "example9@email.com", Status: "정상", RegisterDate: "2026-01-18", LastVisit: "2026-01-20"},
	{ID: "967840", Name: "Jinoo Yu", Phone: "010-5302-5799", Email: "example10@email.com", Status: "정상", RegisterDate: "2026-01-17", LastVisit: "2026-01-20"},
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
		http.Error(w, "고객을 찾을 수 없습니다", http.StatusNotFound)
		return
	}

	data := DetailPageData{
		Title:      "고객 상세",
		ActiveMenu: "customers",
		Customer:   *customer,
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
		http.Error(w, "고객을 찾을 수 없습니다", http.StatusNotFound)
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
