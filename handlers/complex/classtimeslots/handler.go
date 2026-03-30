package classtimeslots

import (
	"backoffice/database"
	"backoffice/middleware"
	"backoffice/utils"
	"html/template"
	"log"
	"net/http"
	"strconv"
	"strings"
)

var Templates *template.Template

// mapToSlot - DB map 결과를 ClassTimeSlot 구조체로 변환
func mapToSlot(m map[string]interface{}) ClassTimeSlot {
	seq, _ := m["seq"].(int)
	branchSeq, _ := m["branch_seq"].(int)
	name, _ := m["name"].(string)
	daysOfWeek, _ := m["days_of_week"].(string)
	startTime, _ := m["start_time"].(string)
	endTime, _ := m["end_time"].(string)
	createdDate, _ := m["created_at"].(string)

	return ClassTimeSlot{
		Seq:         seq,
		BranchSeq:   branchSeq,
		Name:        name,
		DaysOfWeek:  daysOfWeek,
		StartTime:   startTime,
		EndTime:     endTime,
		CreatedDate: createdDate,
	}
}

// Handler - 수업 시간대 목록 페이지 핸들러
func Handler(w http.ResponseWriter, r *http.Request) {
	successMessage := utils.GetFlashMessage(w, r, "success")
	errorMessage := utils.GetFlashMessage(w, r, "error")

	base := middleware.GetBasePageData(r)
	branchSeq := base.SelectedBranchSeq

	dbSlots, err := database.GetClassTimeSlotsByBranch(branchSeq)
	if err != nil {
		log.Printf("Handler - GetClassTimeSlotsByBranch error: %v", err)
	}

	var slots []ClassTimeSlot
	for _, m := range dbSlots {
		slots = append(slots, mapToSlot(m))
	}

	data := PageData{
		BasePageData:   base,
		Title:          "수업 시간대 관리",
		ActiveMenu:     "complex_timeslots",
		Slots:          slots,
		SuccessMessage: successMessage,
		ErrorMessage:   errorMessage,
	}

	if err := Templates.ExecuteTemplate(w, "classtimeslots/list.html", data); err != nil {
		log.Printf("Template error: %v", err)
		http.Redirect(w, r, "/error", http.StatusSeeOther)
	}
}

// AddHandler - 수업 시간대 추가 핸들러
func AddHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method == http.MethodGet {
		successMessage := utils.GetFlashMessage(w, r, "success")
		errorMessage := utils.GetFlashMessage(w, r, "error")

		data := EditPageData{
			BasePageData:   middleware.GetBasePageData(r),
			Title:          "수업 시간대 추가",
			ActiveMenu:     "complex_timeslots",
			IsEdit:         false,
			SuccessMessage: successMessage,
			ErrorMessage:   errorMessage,
		}

		if err := Templates.ExecuteTemplate(w, "classtimeslots/form.html", data); err != nil {
			log.Printf("Template error: %v", err)
			http.Redirect(w, r, "/error", http.StatusSeeOther)
		}
		return
	}

	if r.Method == http.MethodPost {
		if err := r.ParseForm(); err != nil {
			log.Printf("Form parse error: %v", err)
			http.Redirect(w, r, "/error", http.StatusSeeOther)
			return
		}

		branchSeq := middleware.GetSelectedBranch(r)
		name := r.FormValue("name")
		daysOfWeekSlice := r.Form["days_of_week"]
		daysOfWeek := strings.Join(daysOfWeekSlice, ",")
		startTime := r.FormValue("start_time")
		endTime := r.FormValue("end_time")

		if name == "" || daysOfWeek == "" || startTime == "" || endTime == "" {
			utils.SetFlashMessage(w, r, "error", "모든 필드를 입력해주세요.")
			http.Redirect(w, r, "/complex/class-time-slots/add", http.StatusSeeOther)
			return
		}

		_, err := database.InsertClassTimeSlot(branchSeq, name, daysOfWeek, startTime, endTime)
		if err != nil {
			log.Printf("AddHandler - InsertClassTimeSlot error: %v", err)
			utils.SetFlashMessage(w, r, "error", "수업 시간대 추가 중 오류가 발생했습니다.")
			http.Redirect(w, r, "/complex/class-time-slots/add", http.StatusSeeOther)
			return
		}

		utils.SetFlashMessage(w, r, "success", "수업 시간대가 성공적으로 추가되었습니다.")
		http.Redirect(w, r, "/complex/class-time-slots", http.StatusSeeOther)
		return
	}
}

// EditHandler - 수업 시간대 수정 핸들러
func EditHandler(w http.ResponseWriter, r *http.Request) {
	seqStr := r.URL.Query().Get("seq")
	if seqStr == "" {
		http.Redirect(w, r, "/complex/class-time-slots", http.StatusSeeOther)
		return
	}

	seq, err := strconv.Atoi(seqStr)
	if err != nil {
		http.Redirect(w, r, "/complex/class-time-slots", http.StatusSeeOther)
		return
	}

	if r.Method == http.MethodGet {
		successMessage := utils.GetFlashMessage(w, r, "success")
		errorMessage := utils.GetFlashMessage(w, r, "error")

		dbSlot, err := database.GetClassTimeSlotBySeq(seq)
		if err != nil {
			log.Printf("EditHandler - GetClassTimeSlotBySeq error: %v", err)
			http.Redirect(w, r, "/complex/class-time-slots", http.StatusSeeOther)
			return
		}

		slot := mapToSlot(dbSlot)

		data := EditPageData{
			BasePageData:   middleware.GetBasePageData(r),
			Title:          "수업 시간대 수정",
			ActiveMenu:     "complex_timeslots",
			Slot:           slot,
			IsEdit:         true,
			SuccessMessage: successMessage,
			ErrorMessage:   errorMessage,
		}

		if err := Templates.ExecuteTemplate(w, "classtimeslots/form.html", data); err != nil {
			log.Printf("Template error: %v", err)
			http.Redirect(w, r, "/error", http.StatusSeeOther)
		}
		return
	}

	if r.Method == http.MethodPost {
		if err := r.ParseForm(); err != nil {
			log.Printf("Form parse error: %v", err)
			http.Redirect(w, r, "/error", http.StatusSeeOther)
			return
		}

		name := r.FormValue("name")
		daysOfWeekSlice := r.Form["days_of_week"]
		daysOfWeek := strings.Join(daysOfWeekSlice, ",")
		startTime := r.FormValue("start_time")
		endTime := r.FormValue("end_time")

		if name == "" || daysOfWeek == "" || startTime == "" || endTime == "" {
			utils.SetFlashMessage(w, r, "error", "모든 필드를 입력해주세요.")
			http.Redirect(w, r, "/complex/class-time-slots/edit?seq="+seqStr, http.StatusSeeOther)
			return
		}

		_, err := database.UpdateClassTimeSlot(seq, name, daysOfWeek, startTime, endTime)
		if err != nil {
			log.Printf("EditHandler - UpdateClassTimeSlot error: %v", err)
			utils.SetFlashMessage(w, r, "error", "수업 시간대 수정 중 오류가 발생했습니다.")
			http.Redirect(w, r, "/complex/class-time-slots/edit?seq="+seqStr, http.StatusSeeOther)
			return
		}

		utils.SetFlashMessage(w, r, "success", "수업 시간대가 성공적으로 수정되었습니다.")
		http.Redirect(w, r, "/complex/class-time-slots", http.StatusSeeOther)
		return
	}
}

// DeleteHandler - 수업 시간대 삭제 핸들러
func DeleteHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	seqStr := r.URL.Query().Get("seq")
	if seqStr == "" {
		http.Redirect(w, r, "/complex/class-time-slots", http.StatusSeeOther)
		return
	}

	seq, err := strconv.Atoi(seqStr)
	if err != nil {
		http.Redirect(w, r, "/complex/class-time-slots", http.StatusSeeOther)
		return
	}

	_, err = database.DeleteClassTimeSlot(seq)
	if err != nil {
		log.Printf("DeleteHandler - DeleteClassTimeSlot error: %v", err)
		utils.SetFlashMessage(w, r, "error", "수업 시간대 삭제 중 오류가 발생했습니다.")
		http.Redirect(w, r, "/complex/class-time-slots", http.StatusSeeOther)
		return
	}

	utils.SetFlashMessage(w, r, "success", "수업 시간대가 성공적으로 삭제되었습니다.")
	http.Redirect(w, r, "/complex/class-time-slots", http.StatusSeeOther)
}
