package management

import (
	"backoffice/middleware"
	"log"
	"net/http"
	"strconv"
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
		log.Println("Template error:", err)
		http.Error(w, err.Error(), http.StatusInternalServerError)
	}
}

// StaffAddHandler - 새 강사 등록 화면
func StaffAddHandler(w http.ResponseWriter, r *http.Request) {
	data := struct {
		middleware.BasePageData
		Title      string
		ActiveMenu string
	}{
		BasePageData: middleware.GetBasePageData(r),
		Title:        "새 강사 등록",
		ActiveMenu:   "complex_staffs",
	}

	if err := Templates.ExecuteTemplate(w, "dashboard/staff_add.html", data); err != nil {
		log.Println("Template error:", err)
		http.Error(w, err.Error(), http.StatusInternalServerError)
	}
}

// StaffEditHandler - 강사 정보 수정 화면
func StaffEditHandler(w http.ResponseWriter, r *http.Request) {
	idStr := r.URL.Query().Get("id")
	id, _ := strconv.Atoi(idStr)

	var staff Staff
	for _, s := range mockStaffs {
		if s.ID == id {
			staff = s
			break
		}
	}

	data := struct {
		middleware.BasePageData
		Title      string
		ActiveMenu string
		Staff      Staff
	}{
		BasePageData: middleware.GetBasePageData(r),
		Title:        "강사 정보 수정",
		ActiveMenu:   "complex_staffs",
		Staff:        staff,
	}

	if err := Templates.ExecuteTemplate(w, "dashboard/staff_edit.html", data); err != nil {
		log.Println("Template error:", err)
		http.Error(w, err.Error(), http.StatusInternalServerError)
	}
}

// StaffUpdateHandler - 강사 정보 저장/업데이트
func StaffUpdateHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Invalid method", http.StatusMethodNotAllowed)
		return
	}

	idStr := r.FormValue("id")
	name := r.FormValue("name")
	phone := r.FormValue("phone_number")
	email := r.FormValue("email")
	subject := r.FormValue("subject")
	role := r.FormValue("role")
	status := r.FormValue("status")
	joinDate := r.FormValue("join_date")
	comment := r.FormValue("comment")

	if idStr == "" { // 신규
		newID := len(mockStaffs) + 1
		mockStaffs = append(mockStaffs, Staff{
			ID: newID, Name: name, PhoneNumber: phone, Email: email,
			Subject: subject, Role: role, Status: status,
			JoinDate: joinDate, Comment: comment,
		})
	} else { // 수정
		id, _ := strconv.Atoi(idStr)
		for i, s := range mockStaffs {
			if s.ID == id {
				mockStaffs[i].Name = name
				mockStaffs[i].PhoneNumber = phone
				mockStaffs[i].Email = email
				mockStaffs[i].Subject = subject
				mockStaffs[i].Role = role
				mockStaffs[i].Status = status
				mockStaffs[i].JoinDate = joinDate
				mockStaffs[i].Comment = comment
				break
			}
		}
	}

	http.Redirect(w, r, "/complex/staffs", http.StatusSeeOther)
}
