package home

import (
	"html/template"
	"log"
	"net/http"
)

// TODO :: 로그인 세션이 없는 사용자가 대시보드 페이지로 가면, 로그인 페이지로 리다이렉트 시키기

var Templates *template.Template

// Handler - 홈페이지 핸들러
func Handler(w http.ResponseWriter, r *http.Request) {
	data := PageData{
		Title:      "대시보드",
		ActiveMenu: "dashboard",
		AdminName:  "관리자",
		Stats: []StatCard{
			{Title: "금일 총 예약자", Value: "1,234", Icon: "👥", Color: "#3498db"},
			{Title: "카카오싱크 예약", Value: "456", Icon: "📊", Color: "#2ecc71"},
			{Title: "워크인 회원", Value: "23", Icon: "⏰", Color: "#e74c3c"},
			{Title: "잔여 SMS 메시지", Value: "345/2000", Icon: "💰", Color: "#f39c12"},
		},
	}

	if err := Templates.ExecuteTemplate(w, "dashboard/home.html", data); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		log.Println("Template error:", err)
	}
}
