package classtimeslots

import (
	"backoffice/middleware"
	"backoffice/utils"
	"html/template"
	"log"
	"net/http"
	"strconv"
	"strings"
)

var Templates *template.Template

// UI 개발을 위한 MOCK 데이터
var mockTimeSlots = []ClassTimeSlot{
	{Seq: 1, BranchSeq: 1, Name: "평일 월수 오전반", DaysOfWeek: "월,수", StartTime: "10:00", EndTime: "12:00", CreatedDate: "2026-03-01"},
	{Seq: 2, BranchSeq: 1, Name: "평일 화목 오후반", DaysOfWeek: "화,목", StartTime: "14:00", EndTime: "16:00", CreatedDate: "2026-03-01"},
	{Seq: 3, BranchSeq: 1, Name: "주말 오전 집중반", DaysOfWeek: "토,일", StartTime: "10:00", EndTime: "14:00", CreatedDate: "2026-03-01"},
}

// Handler - 수업 시간대 목록 페이지 핸들러
func Handler(w http.ResponseWriter, r *http.Request) {
	// 세션에서 플래시 메시지 읽기
	successMessage := utils.GetFlashMessage(w, r, "success")
	errorMessage := utils.GetFlashMessage(w, r, "error")

	// DB 대신 MOCK 데이터 사용
	data := PageData{
		BasePageData:   middleware.GetBasePageData(r),
		Title:          "수업 시간대 관리",
		ActiveMenu:     "complex_timeslots",
		Slots:          mockTimeSlots,
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
			ActiveMenu:     "complex_timeslots",
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

		// MOCK 데이터 추가
		newSeq := 1
		if len(mockTimeSlots) > 0 {
			newSeq = mockTimeSlots[len(mockTimeSlots)-1].Seq + 1
		}
		mockTimeSlots = append(mockTimeSlots, ClassTimeSlot{
			Seq:         newSeq,
			BranchSeq:   branchSeq,
			Name:        name,
			DaysOfWeek:  daysOfWeek,
			StartTime:   startTime,
			EndTime:     endTime,
			CreatedDate: "2026-03-15",
		})

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

		// MOCK 데이터 조회
		var slot ClassTimeSlot
		found := false
		for _, s := range mockTimeSlots {
			if s.Seq == seq {
				slot = s
				found = true
				break
			}
		}

		if !found {
			http.Redirect(w, r, "/complex/class-time-slots", http.StatusSeeOther)
			return
		}

		data := EditPageData{
			BasePageData:   middleware.GetBasePageData(r),
			Title:          "수업 시간대 수정",
			ActiveMenu:     "complex_timeslots",
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

		// MOCK 데이터 수정
		for i, s := range mockTimeSlots {
			if s.Seq == seq {
				mockTimeSlots[i].Name = name
				mockTimeSlots[i].DaysOfWeek = daysOfWeek
				mockTimeSlots[i].StartTime = startTime
				mockTimeSlots[i].EndTime = endTime
				break
			}
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

	// MOCK 데이터 삭제
	for i, s := range mockTimeSlots {
		if s.Seq == seq {
			mockTimeSlots = append(mockTimeSlots[:i], mockTimeSlots[i+1:]...)
			break
		}
	}

	utils.SetFlashMessage(w, r, "success", "수업 시간대가 성공적으로 삭제되었습니다.")
	http.Redirect(w, r, "/complex/class-time-slots", http.StatusSeeOther)
}
