package employees

import (
	"backoffice/handlers/errorhandler"
	"net/http"
)

// 더미 데이터 (실제로는 데이터베이스에서 가져와야 함)
var dummyEmployees = []Employee{
	{ID: "EMP001", Name: "김철수", Alias: "철수", Phone: "010-1234-5678", Branches: []string{"강남점", "홍대점"}, RegisterDate: "2024-01-15"},
	{ID: "EMP002", Name: "이영희", Alias: "영희", Phone: "010-2345-6789", Branches: []string{"강남점"}, RegisterDate: "2024-02-20"},
	{ID: "EMP003", Name: "박민수", Alias: "민수", Phone: "010-3456-7890", Branches: []string{"홍대점", "신촌점"}, RegisterDate: "2024-03-10"},
	{ID: "EMP004", Name: "정수진", Alias: "수진", Phone: "010-4567-8901", Branches: []string{"신촌점"}, RegisterDate: "2024-04-05"},
	{ID: "EMP005", Name: "최동욱", Alias: "동욱", Phone: "010-5678-9012", Branches: []string{"강남점", "홍대점", "신촌점"}, RegisterDate: "2024-05-12"},
	{ID: "EMP006", Name: "강지훈", Alias: "지훈", Phone: "010-6789-0123", Branches: []string{"강남점"}, RegisterDate: "2024-06-18"},
	{ID: "EMP007", Name: "윤서연", Alias: "서연", Phone: "010-7890-1234", Branches: []string{"홍대점"}, RegisterDate: "2024-07-22"},
	{ID: "EMP008", Name: "한재민", Alias: "재민", Phone: "010-8901-2345", Branches: []string{"신촌점", "강남점"}, RegisterDate: "2024-08-30"},
}

// getEmployeeByID - ID로 직원 조회
func getEmployeeByID(id string) *Employee {
	for _, employee := range dummyEmployees {
		if employee.ID == id {
			return &employee
		}
	}
	return nil
}

// Handler 직원 목록 페이지
func Handler(w http.ResponseWriter, r *http.Request) {
	data := PageData{
		Title:      "직원 관리",
		ActiveMenu: "employees",
		Employees:  dummyEmployees,
	}

	Templates.ExecuteTemplate(w, "employees/list.html", data)
}

// DetailHandler 직원 상세 페이지
func DetailHandler(w http.ResponseWriter, r *http.Request) {
	id := r.URL.Query().Get("id")
	if id == "" {
		http.Redirect(w, r, "/employees", http.StatusSeeOther)
		return
	}

	employee := getEmployeeByID(id)
	if employee == nil {
		errorhandler.Handler404(w, r)
		return
	}

	data := DetailPageData{
		Title:      "직원 상세",
		ActiveMenu: "employees",
		Employee:   *employee,
	}

	Templates.ExecuteTemplate(w, "employees/detail.html", data)
}

// EditHandler 직원 수정 페이지
func EditHandler(w http.ResponseWriter, r *http.Request) {
	id := r.URL.Query().Get("id")
	if id == "" {
		http.Redirect(w, r, "/employees", http.StatusSeeOther)
		return
	}

	employee := getEmployeeByID(id)
	if employee == nil {
		errorhandler.Handler404(w, r)
		return
	}

	data := EditPageData{
		Title:      "직원 수정",
		ActiveMenu: "employees",
		Employee:   *employee,
	}

	Templates.ExecuteTemplate(w, "employees/edit.html", data)
}

// AddHandler 직원 추가 페이지
func AddHandler(w http.ResponseWriter, r *http.Request) {
	data := PageData{
		Title:      "직원 추가",
		ActiveMenu: "employees",
	}

	Templates.ExecuteTemplate(w, "employees/add.html", data)
}
