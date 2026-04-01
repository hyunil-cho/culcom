package memberships

import (
	"backoffice/database"
	"backoffice/middleware"
	"backoffice/utils"
	"html/template"
	"log"
	"net/http"
	"strconv"
)

var Templates *template.Template

// ListHandler - 멤버십 목록 페이지 핸들러
func ListHandler(w http.ResponseWriter, r *http.Request) {
	successMessage := utils.GetFlashMessage(w, r, "success")

	memberships, err := database.GetAllMemberships()
	if err != nil {
		log.Printf("멤버십 목록 조회 오류: %v", err)
		http.Error(w, "멤버십 목록 조회 실패", http.StatusInternalServerError)
		return
	}

	data := PageData{
		BasePageData:   middleware.GetBasePageData(r),
		Title:          "멤버십 관리",
		ActiveMenu:     "complex_memberships",
		Memberships:    memberships,
		SuccessMessage: successMessage,
	}

	if err := Templates.ExecuteTemplate(w, "memberships/list.html", data); err != nil {
		log.Printf("Template error: %v", err)
		http.Redirect(w, r, "/error", http.StatusSeeOther)
	}
}

// AddHandler - 멤버십 추가 페이지 핸들러
func AddHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method == http.MethodGet {
		data := EditPageData{
			BasePageData: middleware.GetBasePageData(r),
			Title:        "멤버십 추가",
			ActiveMenu:   "complex_memberships",
			IsEdit:       false,
		}

		if err := Templates.ExecuteTemplate(w, "memberships/form.html", data); err != nil {
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
		durationVal, _ := strconv.Atoi(r.FormValue("duration_value"))
		durationUnit := r.FormValue("duration_unit")
		count, _ := strconv.Atoi(r.FormValue("count"))
		price, _ := strconv.Atoi(r.FormValue("price"))

		durationDays := calcDurationDays(durationVal, durationUnit)

		if name == "" {
			http.Redirect(w, r, "/error", http.StatusSeeOther)
			return
		}

		if _, err := database.InsertMembership(name, durationDays, count, price); err != nil {
			log.Printf("멤버십 추가 오류: %v", err)
			http.Error(w, "멤버십 추가 실패", http.StatusInternalServerError)
			return
		}

		utils.SetFlashMessage(w, r, "success", "멤버십이 성공적으로 추가되었습니다.")
		http.Redirect(w, r, "/complex/memberships", http.StatusSeeOther)
		return
	}
}

// EditHandler - 멤버십 수정 페이지 핸들러
func EditHandler(w http.ResponseWriter, r *http.Request) {
	idStr := r.URL.Query().Get("id")
	if idStr == "" {
		http.Redirect(w, r, "/complex/memberships", http.StatusSeeOther)
		return
	}

	id, _ := strconv.Atoi(idStr)

	if r.Method == http.MethodGet {
		target, err := database.GetMembershipByID(id)
		if err != nil {
			log.Printf("멤버십 조회 오류: %v", err)
			http.Redirect(w, r, "/complex/memberships", http.StatusSeeOther)
			return
		}

		displayVal, displayUnit := calcDisplayDuration(target.Duration)

		data := EditPageData{
			BasePageData: middleware.GetBasePageData(r),
			Title:        "멤버십 수정",
			ActiveMenu:   "complex_memberships",
			IsEdit:       true,
			Membership:   *target,
			DurationVal:  displayVal,
			DurationUnit: displayUnit,
		}

		if err := Templates.ExecuteTemplate(w, "memberships/form.html", data); err != nil {
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
		durationVal, _ := strconv.Atoi(r.FormValue("duration_value"))
		durationUnit := r.FormValue("duration_unit")
		count, _ := strconv.Atoi(r.FormValue("count"))
		price, _ := strconv.Atoi(r.FormValue("price"))

		durationDays := calcDurationDays(durationVal, durationUnit)

		if name == "" {
			http.Redirect(w, r, "/error", http.StatusSeeOther)
			return
		}

		if _, err := database.UpdateMembership(id, name, durationDays, count, price); err != nil {
			log.Printf("멤버십 수정 오류: %v", err)
			http.Error(w, "멤버십 수정 실패", http.StatusInternalServerError)
			return
		}

		utils.SetFlashMessage(w, r, "success", "멤버십이 성공적으로 수정되었습니다.")
		http.Redirect(w, r, "/complex/memberships", http.StatusSeeOther)
		return
	}
}

// DeleteHandler - 멤버십 삭제 핸들러
func DeleteHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	idStr := r.URL.Query().Get("id")
	if idStr == "" {
		http.Redirect(w, r, "/complex/memberships", http.StatusSeeOther)
		return
	}

	id, _ := strconv.Atoi(idStr)

	if _, err := database.DeleteMembership(id); err != nil {
		log.Printf("멤버십 삭제 오류: %v", err)
		http.Error(w, "멤버십 삭제 실패", http.StatusInternalServerError)
		return
	}

	utils.SetFlashMessage(w, r, "success", "멤버십이 성공적으로 삭제되었습니다.")
	http.Redirect(w, r, "/complex/memberships", http.StatusSeeOther)
}

// calcDurationDays - 기간 단위를 일수로 변환
func calcDurationDays(val int, unit string) int {
	switch unit {
	case "month":
		return val * 30
	case "year":
		return val * 365
	default:
		return val
	}
}

// calcDisplayDuration - 일수를 표시용 단위로 변환
func calcDisplayDuration(days int) (int, string) {
	if days > 0 && days%365 == 0 {
		return days / 365, "year"
	}
	if days > 0 && days%30 == 0 {
		return days / 30, "month"
	}
	return days, "day"
}
