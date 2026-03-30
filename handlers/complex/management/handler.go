package management

import (
	"backoffice/database"
	"backoffice/middleware"
	"html/template"
	"log"
	"net/http"
	"strconv"
)

var Templates *template.Template

// Handler - 수업 목록
func Handler(w http.ResponseWriter, r *http.Request) {
	base := middleware.GetBasePageData(r)
	branchSeq := base.SelectedBranchSeq

	classRows, err := database.GetComplexClassesByBranch(branchSeq)
	if err != nil {
		log.Println("GetComplexClassesByBranch error:", err)
		http.Error(w, "수업 목록 조회 실패", http.StatusInternalServerError)
		return
	}

	var classes []Class
	for _, row := range classRows {
		classes = append(classes, mapToClass(row))
	}

	data := PageData{
		BasePageData: base,
		Title:        "수업 관리",
		ActiveMenu:   "complex_classes",
		Classes:      classes,
	}
	if err := Templates.ExecuteTemplate(w, "dashboard/complex_class_list.html", data); err != nil {
		log.Println("Template error:", err)
		http.Error(w, err.Error(), http.StatusInternalServerError)
	}
}

// AddHandler - 수업 등록 화면
func AddHandler(w http.ResponseWriter, r *http.Request) {
	base := middleware.GetBasePageData(r)
	branchSeq := base.SelectedBranchSeq

	slots, err := database.GetClassTimeSlotsByBranch(branchSeq)
	if err != nil {
		log.Println("GetClassTimeSlotsByBranch error:", err)
	}

	staffRows, err := database.GetStaffsByBranch(branchSeq)
	if err != nil {
		log.Println("GetStaffsByBranch error:", err)
	}

	var staffs []Staff
	for _, row := range staffRows {
		staffs = append(staffs, Staff{
			ID:   row["seq"].(int),
			Name: row["name"].(string),
		})
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
		BasePageData: base,
		Title:        "새 수업 등록",
		ActiveMenu:   "complex_classes",
		IsEdit:       false,
		TimeSlots:    slots,
		Staffs:       staffs,
	}
	if err := Templates.ExecuteTemplate(w, "dashboard/complex_class_form.html", data); err != nil {
		log.Println("Template error:", err)
		http.Error(w, err.Error(), http.StatusInternalServerError)
	}
}

// EditHandler - 수업 수정 화면
func EditHandler(w http.ResponseWriter, r *http.Request) {
	id, _ := strconv.Atoi(r.URL.Query().Get("id"))
	base := middleware.GetBasePageData(r)
	branchSeq := base.SelectedBranchSeq

	classRow, err := database.GetComplexClassBySeq(id)
	if err != nil {
		log.Println("GetComplexClassBySeq error:", err)
		http.Redirect(w, r, "/complex/classes", http.StatusSeeOther)
		return
	}
	class := mapToClass(classRow)

	slots, err := database.GetClassTimeSlotsByBranch(branchSeq)
	if err != nil {
		log.Println("GetClassTimeSlotsByBranch error:", err)
	}

	staffRows, err := database.GetStaffsByBranch(branchSeq)
	if err != nil {
		log.Println("GetStaffsByBranch error:", err)
	}

	var staffs []Staff
	for _, row := range staffRows {
		staffs = append(staffs, Staff{
			ID:   row["seq"].(int),
			Name: row["name"].(string),
		})
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
		BasePageData: base,
		Title:        "수업 정보 수정",
		ActiveMenu:   "complex_classes",
		IsEdit:       true,
		Class:        class,
		TimeSlots:    slots,
		Staffs:       staffs,
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

	base := middleware.GetBasePageData(r)
	branchSeq := base.SelectedBranchSeq

	idStr := r.FormValue("id")
	timeSlotID, _ := strconv.Atoi(r.FormValue("time_slot_id"))
	staffIDStr := r.FormValue("staff_id")
	name := r.FormValue("name")
	desc := r.FormValue("description")
	capacity, _ := strconv.Atoi(r.FormValue("capacity"))

	var staffSeq *int
	if staffIDStr != "" {
		v, err := strconv.Atoi(staffIDStr)
		if err == nil && v > 0 {
			staffSeq = &v
		}
	}

	if idStr == "" {
		// 신규 등록
		_, err := database.InsertComplexClass(branchSeq, timeSlotID, staffSeq, name, desc, capacity)
		if err != nil {
			log.Println("InsertComplexClass error:", err)
			http.Error(w, "수업 등록 실패", http.StatusInternalServerError)
			return
		}
	} else {
		// 수정
		id, _ := strconv.Atoi(idStr)
		_, err := database.UpdateComplexClass(id, timeSlotID, staffSeq, name, desc, capacity)
		if err != nil {
			log.Println("UpdateComplexClass error:", err)
			http.Error(w, "수업 수정 실패", http.StatusInternalServerError)
			return
		}
	}

	http.Redirect(w, r, "/complex/classes", http.StatusSeeOther)
}

// DeleteHandler - 수업 삭제 처리
func DeleteHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Invalid method", http.StatusMethodNotAllowed)
		return
	}

	id, _ := strconv.Atoi(r.FormValue("id"))
	if id == 0 {
		http.Error(w, "잘못된 요청", http.StatusBadRequest)
		return
	}

	_, err := database.DeleteComplexClass(id)
	if err != nil {
		log.Println("DeleteComplexClass error:", err)
		http.Error(w, "수업 삭제 실패", http.StatusInternalServerError)
		return
	}

	http.Redirect(w, r, "/complex/classes", http.StatusSeeOther)
}

// mapToClass - DB map 결과를 Class 구조체로 변환
func mapToClass(row map[string]interface{}) Class {
	return Class{
		ID:           row["seq"].(int),
		TimeSlotID:   row["time_slot_seq"].(int),
		TimeSlotName: row["time_slot_name"].(string),
		StaffID:      row["staff_seq"].(int),
		StaffName:    row["staff_name"].(string),
		Name:         row["name"].(string),
		Description:  row["description"].(string),
		Capacity:     row["capacity"].(int),
		DateValue:    row["days_of_week"].(string),
		StartTime:    row["start_time"].(string),
		EndTime:      row["end_time"].(string),
	}
}
