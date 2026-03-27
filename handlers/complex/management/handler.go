package management

import (
	"backoffice/middleware"
	"html/template"
	"log"
	"net/http"
	"strconv"
)

var Templates *template.Template

// MOCK 데이터: 시간대 슬롯과 연결된 형태
var mockClasses = []Class{
	{ID: 1, TimeSlotID: 1, TimeSlotName: "평일 월수 오전반", Name: "크로스핏 기초반", Description: "수업 수준이 기초인 수업입니다.", Capacity: 10},
	{ID: 2, TimeSlotID: 2, TimeSlotName: "평일 화목 오후반", Name: "크로스핏 선수반", Description: "선수 육성반", Capacity: 8},
}

// Handler - 수업 목록
func Handler(w http.ResponseWriter, r *http.Request) {
	data := PageData{
		BasePageData: middleware.GetBasePageData(r),
		Title:        "수업 관리",
		ActiveMenu:   "complex_classes",
		Classes:      mockClasses,
	}
	if err := Templates.ExecuteTemplate(w, "dashboard/complex_class_list.html", data); err != nil {
		log.Println("Template error:", err)
		http.Error(w, err.Error(), http.StatusInternalServerError)
	}
}

// AddHandler - 수업 등록 화면
func AddHandler(w http.ResponseWriter, r *http.Request) {
	// MOCK 시간대 데이터
	slots := []map[string]interface{}{
		{"seq": 1, "name": "평일 월수 오전반"},
		{"seq": 2, "name": "평일 화목 오후반"},
		{"seq": 3, "name": "주말 오전 집중반"},
	}

	data := struct {
		middleware.BasePageData
		Title      string
		ActiveMenu string
		IsEdit     bool
		Class      Class
		TimeSlots  []map[string]interface{}
		Staffs     []Staff
	}{
		BasePageData: middleware.GetBasePageData(r),
		Title:        "새 수업 등록",
		ActiveMenu:   "complex_classes",
		IsEdit:       false,
		TimeSlots:    slots,
		Staffs:       mockStaffs,
	}
	if err := Templates.ExecuteTemplate(w, "dashboard/complex_class_form.html", data); err != nil {
		log.Println("Template error:", err)
		http.Error(w, err.Error(), http.StatusInternalServerError)
	}
}

// EditHandler - 수업 수정 화면
func EditHandler(w http.ResponseWriter, r *http.Request) {
	id, _ := strconv.Atoi(r.URL.Query().Get("id"))

	// MOCK 시간대 데이터
	slots := []map[string]interface{}{
		{"seq": 1, "name": "평일 월수 오전반"},
		{"seq": 2, "name": "평일 화목 오후반"},
		{"seq": 3, "name": "주말 오전 집중반"},
	}

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
		IsEdit     bool
		Class      Class
		TimeSlots  []map[string]interface{}
		Staffs     []Staff
	}{
		BasePageData: middleware.GetBasePageData(r),
		Title:        "수업 정보 수정",
		ActiveMenu:   "complex_classes",
		IsEdit:       true,
		Class:        class,
		TimeSlots:    slots,
		Staffs:       mockStaffs,
	}
	if err := Templates.ExecuteTemplate(w, "dashboard/complex_class_form.html", data); err != nil {
		log.Println("Template error:", err)
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
	timeSlotIDStr := r.FormValue("time_slot_id")
	staffIDStr := r.FormValue("staff_id")
	name := r.FormValue("name")
	desc := r.FormValue("description")
	capacityStr := r.FormValue("capacity")

	timeSlotID, _ := strconv.Atoi(timeSlotIDStr)
	staffID, _ := strconv.Atoi(staffIDStr)
	capacity, _ := strconv.Atoi(capacityStr)

	// 강사 이름 찾기
	staffName := ""
	for _, s := range mockStaffs {
		if s.ID == staffID {
			staffName = s.Name
			break
		}
	}

	// 슬롯 정보 시뮬레이션
	slotName := "선택된 슬롯"
	days := "월,수"
	start := "10:00"
	end := "12:00"

	if idStr == "" { // 신규 등록
		newID := len(mockClasses) + 1
		mockClasses = append(mockClasses, Class{
			ID: newID, TimeSlotID: timeSlotID, TimeSlotName: slotName,
			StaffID: staffID, StaffName: staffName,
			Name: name, Description: desc, Capacity: capacity,
			DateValue: days, StartTime: start, EndTime: end,
		})
	} else { // 수정
		id, _ := strconv.Atoi(idStr)
		for i, c := range mockClasses {
			if c.ID == id {
				mockClasses[i].TimeSlotID = timeSlotID
				mockClasses[i].StaffID = staffID
				mockClasses[i].StaffName = staffName
				mockClasses[i].Name = name
				mockClasses[i].Description = desc
				mockClasses[i].Capacity = capacity
				break
			}
		}
	}

	http.Redirect(w, r, "/complex/classes", http.StatusSeeOther)
}
