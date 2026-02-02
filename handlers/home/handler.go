package home

import (
	"backoffice/database"
	"backoffice/middleware"
	"encoding/json"
	"fmt"
	"html/template"
	"log"
	"net/http"
)

// TODO :: 로그인 세션이 없는 사용자가 대시보드 페이지로 가면, 로그인 페이지로 리다이렉트 시키기

var Templates *template.Template

// Handler - 홈페이지 핸들러
func Handler(w http.ResponseWriter, r *http.Request) {
	// 현재 로그인한 사용자의 지점 정보 가져오기
	branchSeq := middleware.GetSelectedBranch(r)

	// 1. 금일 총 예약자 수 조회
	totalCustomers, err := database.GetTodayTotalCustomers(branchSeq)
	if err != nil {
		log.Printf("Handler - GetTodayTotalCustomers error: %v", err)
		totalCustomers = 0
	}

	// 2. 금일 walk_in 고객 수 조회
	walkInCustomers, err := database.GetTodayWalkInCustomers(branchSeq)
	if err != nil {
		log.Printf("Handler - GetTodayWalkInCustomers error: %v", err)
		walkInCustomers = 0
	}

	// 3. ad_source별 통계 조회
	adSourceStats, err := database.GetTodayCustomersByAdSource(branchSeq)
	if err != nil {
		log.Printf("Handler - GetTodayCustomersByAdSource error: %v", err)
		adSourceStats = []database.AdSourceStats{}
	}

	// 4. SMS 잔여건수 조회
	var smsRemaining int
	if branchSeq > 0 {
		smsRemaining, _ = database.GetSMSRemainingCount(branchSeq)
	}

	// 통계 카드 생성
	var stats []StatCard

	// 금일 총 예약자
	stats = append(stats, StatCard{
		Title: "금일 총 예약자",
		Value: fmt.Sprintf("%d명", totalCustomers),
		Icon:  "👥",
		Color: "#3498db",
	})

	// walk_in 고객
	stats = append(stats, StatCard{
		Title: "워크인 회원",
		Value: fmt.Sprintf("%d명", walkInCustomers),
		Icon:  "🚶",
		Color: "#e74c3c",
	})

	// ad_source별 통계 (상위 2개만 표시)
	for i, adStat := range adSourceStats {
		if i >= 2 {
			break
		}
		// ad_source 이름을 한글로 변환
		adSourceName := adStat.AdSource
		if adSourceName == "kakao_sync" {
			adSourceName = "카카오싱크"
		} else if adSourceName == "walk_in" {
			adSourceName = "워크인"
		} else {
			adSourceName = "기타"
		}

		icon := "📊"
		color := "#2ecc71"
		if i == 1 {
			icon = "📈"
			color = "#9b59b6"
		}

		stats = append(stats, StatCard{
			Title: fmt.Sprintf("%s 예약", adSourceName),
			Value: fmt.Sprintf("%d명", adStat.Count),
			Icon:  icon,
			Color: color,
		})
	}

	// SMS 잔여건수 카드 추가
	stats = append(stats, StatCard{
		Title: "잔여 SMS 메시지",
		Value: fmt.Sprintf("%d건", smsRemaining),
		Icon:  "💬",
		Color: "#f39c12",
	})

	// 5. 최근 7일간 일별 고객 통계 조회
	dailyStats, err := database.GetDailyCustomerStats(branchSeq, 7)
	if err != nil {
		log.Printf("Handler - GetDailyCustomerStats error: %v", err)
		dailyStats = []database.DailyCustomerStats{}
	}

	// JSON으로 변환 (템플릿에서 JavaScript로 사용)
	dailyStatsJSON, err := json.Marshal(dailyStats)
	if err != nil {
		log.Printf("Handler - JSON marshal error: %v", err)
		dailyStatsJSON = []byte("[]")
	}

	data := PageData{
		BasePageData:   middleware.GetBasePageData(r),
		Title:          "대시보드",
		ActiveMenu:     "dashboard",
		AdminName:      "관리자",
		Stats:          stats,
		DailyStats:     dailyStats,
		DailyStatsJSON: string(dailyStatsJSON),
	}

	if err := Templates.ExecuteTemplate(w, "dashboard/home.html", data); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		log.Println("Template error:", err)
	}
}
