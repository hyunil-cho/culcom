package opens

import (
	"html/template"
	"net/http"
)

var PostponementTemplates *template.Template

func PostponementHandler(w http.ResponseWriter, r *http.Request) {
	// DB 호출 대신 Mock 데이터 사용
	branches := []map[string]interface{}{
		{"id": 1, "name": "강남점"},
		{"id": 2, "name": "종로점"},
		{"id": 3, "name": "신촌점"},
		{"id": 4, "name": "부산점"},
	}

	// Mock 시간대별 수업 데이터
	classesByTimeSlot := map[string][]string{
		"평일 오전 (10:00 ~ 12:00)": {"월수 오전 레벨1", "화목 오전 레벨2", "금요 집중반"},
		"평일 오후 (14:00 ~ 16:00)": {"월수 오후 비즈니스", "화목 오후 프리토킹", "수요 북클럽"},
		"평일 저녁 (19:00 ~ 21:00)": {"월수 저녁 레벨1", "화목 저녁 레벨3", "수금 저녁 기초회화"},
		"주말 오전 (10:30 ~ 12:30)": {"토요 오전 레벨2", "일요 오전 프리토킹"},
		"주말 오후 (14:00 ~ 16:00)": {"토요 오후 레벨1", "일요 오후 여행영어"},
	}

	// 템플릿에서 순회하기 위해 시간대 목록 추출
	var timeSlots []string
	for slot := range classesByTimeSlot {
		timeSlots = append(timeSlots, slot)
	}

	data := struct {
		Title             string
		Branches          []map[string]interface{}
		TimeSlots         []string
		ClassesByTimeSlot map[string][]string
	}{
		Title:             "수업 연기 요청",
		Branches:          branches,
		TimeSlots:         timeSlots,
		ClassesByTimeSlot: classesByTimeSlot,
	}

	// layouts/base.html 등을 사용하지 않는 완전 독립형 또는 간단한 레이아웃 필요
	// 여기서는 요청하신 대로 UI를 먼저 구성합니다.
	if err := PostponementTemplates.ExecuteTemplate(w, "opens/postponement.html", data); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
	}
}
