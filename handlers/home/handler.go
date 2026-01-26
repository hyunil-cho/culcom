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
	// URL에서 지점 파라미터 가져오기 (영문 코드)
	branchFilter := r.URL.Query().Get("branch")

	// 영문 코드 -> 한글 이름 매핑
	branchNames := map[string]string{
		"gasan":   "가산",
		"gangnam": "강남",
		"hongdae": "홍대",
		"sinchon": "신촌",
	}

	// 지점별로 다른 통계 표시 (실제로는 데이터베이스에서 가져와야 함)
	var stats []StatCard

	if branchFilter == "" {
		// 전체 지점 통계
		stats = []StatCard{
			{Title: "금일 총 예약자", Value: "1,234", Icon: "👥", Color: "#3498db"},
			{Title: "카카오싱크 예약", Value: "456", Icon: "📊", Color: "#2ecc71"},
			{Title: "워크인 회원", Value: "23", Icon: "⏰", Color: "#e74c3c"},
			{Title: "잔여 SMS 메시지", Value: "345/2000", Icon: "💰", Color: "#f39c12"},
		}
	} else {
		// 선택된 지점 통계 (더미 데이터)
		// TODO: 실제로는 데이터베이스에서 지점별 통계를 가져와야 함
		branchDisplayName := branchNames[branchFilter]
		if branchDisplayName == "" {
			branchDisplayName = branchFilter
		}
		stats = []StatCard{
			{Title: "금일 총 예약자 (" + branchDisplayName + ")", Value: "234", Icon: "👥", Color: "#3498db"},
			{Title: "카카오싱크 예약", Value: "89", Icon: "📊", Color: "#2ecc71"},
			{Title: "워크인 회원", Value: "12", Icon: "⏰", Color: "#e74c3c"},
			{Title: "잔여 SMS 메시지", Value: "345/2000", Icon: "💰", Color: "#f39c12"},
		}
	}

	data := PageData{
		Title:      "대시보드",
		ActiveMenu: "dashboard",
		AdminName:  "관리자",
		Stats:      stats,
	}

	if err := Templates.ExecuteTemplate(w, "dashboard/home.html", data); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		log.Println("Template error:", err)
	}
}
