package management

import (
	"backoffice/middleware"
	"html/template"
	"net/http"
	"strconv"
)

var Templates *template.Template

var mockClasses = []Class{
	{ID: 1, Name: "월수 오전 레벨0", Description: "왕초보 일본어", DateType: "weekly", DateValue: "월, 수", StartTime: "10:00", EndTime: "12:00"},
	{ID: 2, Name: "화목 오후 레벨2", Description: "비즈니스 회화", DateType: "weekly", DateValue: "화, 목", StartTime: "14:00", EndTime: "16:00"},
	{ID: 3, Name: "특별 보충 수업", Description: "N3 문법 정리", DateType: "fixed", DateValue: "2026-03-15", StartTime: "13:00", EndTime: "15:00"},
}

// Handler - 수업 목록
func Handler(w http.ResponseWriter, r *http.Request) {
	data := PageData{
		BasePageData: middleware.GetBasePageData(r),
		Title:        "수업 관리",
		ActiveMenu:   "complex_management",
		Classes:      mockClasses,
	}
	if err := Templates.ExecuteTemplate(w, "dashboard/complex_class_list.html", data); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
	}
}

// AddHandler - 수업 등록 화면
func AddHandler(w http.ResponseWriter, r *http.Request) {
	data := PageData{
		BasePageData: middleware.GetBasePageData(r),
		Title:        "새 수업 등록",
		ActiveMenu:   "complex_management",
	}
	if err := Templates.ExecuteTemplate(w, "dashboard/complex_class_add.html", data); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
	}
}

// EditHandler - 수업 수정 화면
func EditHandler(w http.ResponseWriter, r *http.Request) {
	id, _ := strconv.Atoi(r.URL.Query().Get("id"))
	var class Class
	for _, c := range mockClasses {
		if c.ID == id {
			class = c
			break
		}
	}

	data := struct {
		middleware.BasePageData
		Title      string
		ActiveMenu string
		Class      Class
	}{
		BasePageData: middleware.GetBasePageData(r),
		Title:        "수업 정보 수정",
		ActiveMenu:   "complex_management",
		Class:        class,
	}
	if err := Templates.ExecuteTemplate(w, "dashboard/complex_class_edit.html", data); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
	}
}

// UpdateHandler - 수업 정보 저장/업데이트 처리
func UpdateHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Invalid method", http.StatusMethodNotAllowed)
		return
	}

	idStr := r.FormValue("id")
	name := r.FormValue("name")
	desc := r.FormValue("description")
	dateType := r.FormValue("date_type")
	dateValue := r.FormValue("date_value")
	startTime := r.FormValue("start_time")
	endTime := r.FormValue("end_time")

	if idStr == "" { // 신규 등록
		newID := len(mockClasses) + 1
		mockClasses = append(mockClasses, Class{
			ID: newID, Name: name, Description: desc, DateType: dateType, DateValue: dateValue,
			StartTime: startTime, EndTime: endTime,
		})
	} else { // 수정
		id, _ := strconv.Atoi(idStr)
		for i, c := range mockClasses {
			if c.ID == id {
				mockClasses[i].Name = name
				mockClasses[i].Description = desc
				mockClasses[i].DateType = dateType
				mockClasses[i].DateValue = dateValue
				mockClasses[i].StartTime = startTime
				mockClasses[i].EndTime = endTime
				break
			}
		}
	}

	http.Redirect(w, r, "/complex/management", http.StatusSeeOther)
}
