package memberships

import (
	"backoffice/database"
	"backoffice/middleware"
	"backoffice/utils"
	"html/template"
	"log"
	"net/http"
	"strconv"
	"time"
)

var Templates *template.Template

// MOCK 데이터 저장을 위한 변수
var mockMemberships = []database.Membership{
	{Seq: 1, Name: "3개월 주2회 멤버십", Duration: 90, Count: 24, Price: 450000, CreatedDate: "2026-01-10 10:00:00"},
	{Seq: 2, Name: "6개월 주2회 멤버십", Duration: 180, Count: 48, Price: 800000, CreatedDate: "2026-01-15 11:00:00"},
	{Seq: 3, Name: "12개월 프리패스", Duration: 365, Count: 100, Price: 1500000, CreatedDate: "2026-02-01 09:30:00"},
}

// ListHandler - 멤버십 목록 페이지 핸들러
func ListHandler(w http.ResponseWriter, r *http.Request) {
	successMessage := utils.GetFlashMessage(w, r, "success")

	data := PageData{
		BasePageData:   middleware.GetBasePageData(r),
		Title:          "멤버십 관리",
		ActiveMenu:     "complex_memberships",
		Memberships:    mockMemberships,
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
		data := PageData{
			BasePageData: middleware.GetBasePageData(r),
			Title:        "멤버십 추가",
			ActiveMenu:   "complex_memberships",
		}

		if err := Templates.ExecuteTemplate(w, "memberships/add.html", data); err != nil {
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

		// 일수 계산
		durationDays := durationVal
		switch durationUnit {
		case "month":
			durationDays = durationVal * 30
		case "year":
			durationDays = durationVal * 365
		}

		if name == "" {
			http.Redirect(w, r, "/error", http.StatusSeeOther)
			return
		}

		// MOCK 데이터 추가
		newSeq := 1
		if len(mockMemberships) > 0 {
			newSeq = mockMemberships[len(mockMemberships)-1].Seq + 1
		}
		
		newMembership := database.Membership{
			Seq:         newSeq,
			Name:        name,
			Duration:    durationDays,
			Count:       count,
			Price:       price,
			CreatedDate: time.Now().Format("2006-01-02 15:04:05"),
		}
		mockMemberships = append(mockMemberships, newMembership)

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
		var target database.Membership
		found := false
		for _, m := range mockMemberships {
			if m.Seq == id {
				target = m
				found = true
				break
			}
		}

		if !found {
			http.Redirect(w, r, "/complex/memberships", http.StatusSeeOther)
			return
		}

		// 표시용 단위 변환
		displayVal := target.Duration
		displayUnit := "day"
		if target.Duration > 0 && target.Duration%365 == 0 {
			displayVal = target.Duration / 365
			displayUnit = "year"
		} else if target.Duration > 0 && target.Duration%30 == 0 {
			displayVal = target.Duration / 30
			displayUnit = "month"
		}

		data := struct {
			middleware.BasePageData
			Title        string
			ActiveMenu   string
			Membership   database.Membership
			DurationVal  int
			DurationUnit string
		}{
			BasePageData: middleware.GetBasePageData(r),
			Title:        "멤버십 수정",
			ActiveMenu:   "complex_memberships",
			Membership:   target,
			DurationVal:  displayVal,
			DurationUnit: displayUnit,
		}

		if err := Templates.ExecuteTemplate(w, "memberships/edit.html", data); err != nil {
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

		// 일수 계산
		durationDays := durationVal
		switch durationUnit {
		case "month":
			durationDays = durationVal * 30
		case "year":
			durationDays = durationVal * 365
		}

		if name == "" {
			http.Redirect(w, r, "/error", http.StatusSeeOther)
			return
		}

		// MOCK 데이터 수정
		for i, m := range mockMemberships {
			if m.Seq == id {
				mockMemberships[i].Name = name
				mockMemberships[i].Duration = durationDays
				mockMemberships[i].Count = count
				mockMemberships[i].Price = price
				mockMemberships[i].LastUpdateDate = time.Now().Format("2006-01-02 15:04:05")
				break
			}
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

	// MOCK 데이터 삭제
	for i, m := range mockMemberships {
		if m.Seq == id {
			mockMemberships = append(mockMemberships[:i], mockMemberships[i+1:]...)
			break
		}
	}

	utils.SetFlashMessage(w, r, "success", "멤버십이 성공적으로 삭제되었습니다.")
	http.Redirect(w, r, "/complex/memberships", http.StatusSeeOther)
}
