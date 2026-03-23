package index

import (
	"backoffice/middleware"
	"encoding/json"
	"html/template"
	"log"
	"net/http"
)

var Templates *template.Template

// Handler - Complex View 메인 대시보드
func Handler(w http.ResponseWriter, r *http.Request) {
	// 더미 통계 데이터 (날짜별 출석률)
	stats := []map[string]interface{}{
		{"date": "2026-03-01", "rate": 85},
		{"date": "2026-03-02", "rate": 70},
		{"date": "2026-03-03", "rate": 92},
		{"date": "2026-03-04", "rate": 88},
		{"date": "2026-03-05", "rate": 75},
	}
	statsJSON, _ := json.Marshal(stats)

	data := PageData{
		BasePageData:        middleware.GetBasePageData(r),
		Title:               "Complex Dashboard",
		ActiveMenu:          "complex_home",
		AdminName:           "관리자",
		AttendanceStatsJSON: string(statsJSON),
	}

	if err := Templates.ExecuteTemplate(w, "dashboard/complex.html", data); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		log.Println("Template error:", err)
	}
}
