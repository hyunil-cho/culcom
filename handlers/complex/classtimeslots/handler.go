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

// Handler - 수업 시간대 목록 페이지 핸들러
func Handler(w http.ResponseWriter, r *http.Request) {
	// 세션에서 플래시 메시지 읽기
	successMessage := utils.GetFlashMessage(w, r, "success")
	errorMessage := utils.GetFlashMessage(w, r, "error")

	// 세션에서 선택된 지점 정보 가져오기
	branchSeq := middleware.GetSelectedBranch(r)

	// DB에서 수업 시간대 목록 조회
	slotsData, err := database.GetClassTimeSlotsByBranch(branchSeq)
	if err != nil {
		log.Printf("GetClassTimeSlotsByBranch error: %v", err)
		http.Redirect(w, r, "/error", http.StatusSeeOther)
		return
	}

	var slots []ClassTimeSlot
	for _, row := range slotsData {
		slot := ClassTimeSlot{
			Seq:         row["seq"].(int),
			BranchSeq:   row["branch_seq"].(int),
			Name:        row["name"].(string),
			DaysOfWeek:  row["days_of_week"].(string),
			StartTime:   row["start_time"].(string),
			EndTime:     row["end_time"].(string),
			CreatedDate: row["created_at"].(string),
		}
		slots = append(slots, slot)
	}

	data := PageData{
		BasePageData:   middleware.GetBasePageData(r),
		Title:          "수업 시간대 관리",
		ActiveMenu:     "class-time-slots",
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
		// 세션에서 플래시 메시지 읽기
		successMessage := utils.GetFlashMessage(w, r, "success")
		errorMessage := utils.GetFlashMessage(w, r, "error")

		data := EditPageData{
			BasePageData:   middleware.GetBasePageData(r),
			Title:          "수업 시간대 추가",
			ActiveMenu:     "class-time-slots",
			IsEdit:         false,
			SuccessMessage: successMessage,
			ErrorMessage:   errorMessage,
		}

		if err := Templates.ExecuteTemplate(w, "classtimeslots/add.html", data); err != nil {
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
			log.Printf("InsertClassTimeSlot error: %v", err)
			http.Redirect(w, r, "/error", http.StatusSeeOther)
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
		// 세션에서 플래시 메시지 읽기
		successMessage := utils.GetFlashMessage(w, r, "success")
		errorMessage := utils.GetFlashMessage(w, r, "error")

		slotData, err := database.GetClassTimeSlotBySeq(seq)
		if err != nil {
			log.Printf("GetClassTimeSlotBySeq error: %v", err)
			http.Redirect(w, r, "/error", http.StatusSeeOther)
			return
		}

		slot := ClassTimeSlot{
			Seq:        slotData["seq"].(int),
			BranchSeq:  slotData["branch_seq"].(int),
			Name:       slotData["name"].(string),
			DaysOfWeek: slotData["days_of_week"].(string),
			StartTime:  slotData["start_time"].(string),
			EndTime:    slotData["end_time"].(string),
		}

		data := EditPageData{
			BasePageData:   middleware.GetBasePageData(r),
			Title:          "수업 시간대 수정",
			ActiveMenu:     "class-time-slots",
			Slot:           slot,
			IsEdit:         true,
			SuccessMessage: successMessage,
			ErrorMessage:   errorMessage,
		}

		if err := Templates.ExecuteTemplate(w, "classtimeslots/edit.html", data); err != nil {
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
			log.Printf("UpdateClassTimeSlot error: %v", err)
			http.Redirect(w, r, "/error", http.StatusSeeOther)
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
		log.Printf("DeleteClassTimeSlot error: %v", err)
		http.Redirect(w, r, "/error", http.StatusSeeOther)
		return
	}

	utils.SetFlashMessage(w, r, "success", "수업 시간대가 성공적으로 삭제되었습니다.")
	http.Redirect(w, r, "/complex/class-time-slots", http.StatusSeeOther)
}
