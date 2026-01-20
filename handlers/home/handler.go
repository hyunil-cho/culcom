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
		Title:     "대시보드",
		AdminName: "관리자",
		Stats: []StatCard{
			{Title: "총 사용자", Value: "1,234", Icon: "👥", Color: "#3498db"},
			{Title: "오늘 방문자", Value: "456", Icon: "📊", Color: "#2ecc71"},
			{Title: "총 매출", Value: "₩12,345,678", Icon: "💰", Color: "#f39c12"},
			{Title: "대기 중인 작업", Value: "23", Icon: "⏰", Color: "#e74c3c"},
		},
	}

	if err := Templates.ExecuteTemplate(w, "home.html", data); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		log.Println("Template error:", err)
	}
}
