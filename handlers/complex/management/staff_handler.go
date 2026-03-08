package management

import (
	"backoffice/middleware"
	"net/http"
)

// MOCK 강사 데이터
var mockStaffs = []Staff{
	{ID: 1, Name: "김강사", PhoneNumber: "01011112222", Email: "kim@culcom.com", Subject: "영어 회화", Role: "강사", Status: "재직", JoinDate: "2025-01-10", Comment: "기초반 전문"},
	{ID: 2, Name: "이팀장", PhoneNumber: "01022223333", Email: "lee@culcom.com", Subject: "비즈니스 영어", Role: "팀장", Status: "재직", JoinDate: "2024-05-20", Comment: ""},
	{ID: 3, Name: "박교수", PhoneNumber: "01033334444", Email: "park@culcom.com", Subject: "토익/토플", Role: "강사", Status: "휴직", JoinDate: "2025-02-15", Comment: "개인 사정으로 휴직 중"},
}

// StaffListHandler - 강사진 관리 목록
func StaffListHandler(w http.ResponseWriter, r *http.Request) {
	data := struct {
		middleware.BasePageData
		Title      string
		ActiveMenu string
		Staffs     []Staff
		TotalCount int
	}{
		BasePageData: middleware.GetBasePageData(r),
		Title:        "강사진 관리",
		ActiveMenu:   "complex_staffs",
		Staffs:       mockStaffs,
		TotalCount:   len(mockStaffs),
	}

	if err := Templates.ExecuteTemplate(w, "dashboard/staff_list.html", data); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
	}
}
