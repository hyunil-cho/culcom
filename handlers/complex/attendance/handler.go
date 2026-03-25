package attendance

import (
	"backoffice/handlers/complex/management"
	"backoffice/middleware"
	"fmt"
	"html/template"
	"log"
	"net/http"
	"strconv"
)

var Templates *template.Template

// createMockClasses - 수업 생성을 위한 헬퍼 함수 (MOCK용)
func createMockClasses(slotName string, count int) []management.ClassWithMembers {
	classes := []management.ClassWithMembers{}
	for i := 1; i <= count; i++ {
		className := fmt.Sprintf("레벨%d-%d반", (i-1)/3, i)
		if i > 7 {
			className = fmt.Sprintf("프리토킹 %c반", rune(64+i-7))
		}

		members := []management.Member{
			{ID: i*10 + 1, Name: fmt.Sprintf("회원%d-1", i), PhoneNumber: "0101111XXXX", Status: "O"},
			{ID: i*10 + 2, Name: fmt.Sprintf("회원%d-2", i), PhoneNumber: "0102222XXXX", Status: ""},
			{ID: i*10 + 3, Name: fmt.Sprintf("회원%d-3", i), PhoneNumber: "0103333XXXX", Status: "O"},
			{ID: i*10 + 4, Name: fmt.Sprintf("회원%d-4", i), PhoneNumber: "0104444XXXX", Status: ""},
			{ID: i*10 + 5, Name: fmt.Sprintf("회원%d-5", i), PhoneNumber: "0105555XXXX", Status: "O"},
		}
		// 일부 반에 수업 연기 중인 회원 추가
		if i%4 == 1 {
			members[2] = management.Member{ID: i*10 + 3, Name: fmt.Sprintf("회원%d-3", i), PhoneNumber: "0103333XXXX", Status: "△", IsPostponed: true}
		}
		if i%5 == 0 {
			members[4] = management.Member{ID: i*10 + 5, Name: fmt.Sprintf("회원%d-5", i), PhoneNumber: "0105555XXXX", Status: "△", IsPostponed: true}
		}
		// 일부 반은 인원을 더 많이
		if i%3 == 0 {
			members = append(members, management.Member{ID: i*10 + 6, Name: "추가회원A", PhoneNumber: "0109999XXXX", Status: "O"})
			members = append(members, management.Member{ID: i*10 + 7, Name: "추가회원B", PhoneNumber: "0108888XXXX", Status: ""})
		}

		classes = append(classes, management.ClassWithMembers{
			Class:   management.Class{Name: className, TimeSlotName: slotName},
			Members: members,
		})
	}
	return classes
}

// Handler - 등록현황(통합) 페이지
func Handler(w http.ResponseWriter, r *http.Request) {
	// 1. 월수 오전팀 (10개 수업)
	monWedMorning := management.SlotGroup{
		SlotName: "월수 오전팀 (10:00 ~ 12:00)",
		Classes:  createMockClasses("월수 오전", 10),
	}

	// 2. 화목 오후팀 (10개 수업)
	tueThuAfternoon := management.SlotGroup{
		SlotName: "화목 오후팀 (14:00 ~ 16:00)",
		Classes:  createMockClasses("화목 오후", 10),
	}

	// 3. 주말 집중팀 (8개 수업)
	weekendIntensive := management.SlotGroup{
		SlotName: "주말 집중팀 (13:00 ~ 17:00)",
		Classes:  createMockClasses("주말 집중", 8),
	}

	data := management.ComplexViewPageData{
		BasePageData: middleware.GetBasePageData(r),
		Title:        "지점 통합 등록현황",
		ActiveMenu:   "complex_attendance",
		Groups:       []management.SlotGroup{monWedMorning, tueThuAfternoon, weekendIntensive},
	}

	if err := Templates.ExecuteTemplate(w, "dashboard/attendance.html", data); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		log.Println("Template error:", err)
	}
}

// DetailHandler - 특정 시간대 또는 특정 수업의 상세 등록현황(출석부) 페이지
func DetailHandler(w http.ResponseWriter, r *http.Request) {
	slotName := r.URL.Query().Get("slot")
	classIDStr := r.URL.Query().Get("classId")

	if slotName == "" && classIDStr == "" {
		slotName = "월수 오전팀 (10:00 ~ 12:00)"
	}

	// 모든 수업 목록 생성 (MOCK)
	allClasses := createMockClasses(slotName, 12)
	var displayClasses []management.ClassWithMembers

	if classIDStr != "" {
		classID, _ := strconv.Atoi(classIDStr)
		for _, cls := range allClasses {
			if cls.ID == classID {
				displayClasses = append(displayClasses, cls)
				break
			}
		}
		// 만약 ID로 못찾았다면 (MOCK 데이터 불일치 등) 전체 표시 방지용 처리 가능
	} else {
		displayClasses = allClasses
	}

	data := struct {
		middleware.BasePageData
		Title      string
		ActiveMenu string
		SlotName   string
		Classes    []management.ClassWithMembers
	}{
		BasePageData: middleware.GetBasePageData(r),
		Title:        slotName + " 등록현황",
		ActiveMenu:   "complex_attendance",
		SlotName:     slotName,
		Classes:      displayClasses,
	}

	if err := Templates.ExecuteTemplate(w, "dashboard/attendance_detail.html", data); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		log.Println("Template error:", err)
	}
}
