package attendance

import (
	"backoffice/handlers/complex/management"
	"backoffice/middleware"
	"fmt"
	"html/template"
	"log"
	"net/http"
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

// createDetailMockClasses - 상세 출석부용 풍부한 MOCK 데이터
func createDetailMockClasses(slotName string) []management.ClassWithMembers {
	return []management.ClassWithMembers{
		{
			Class: management.Class{ID: 101, Name: "레벨0-1반", TimeSlotName: slotName, Capacity: 8},
			Members: []management.Member{
				{ID: 1001, Name: "김도현", PhoneNumber: "01012345678", Level: "3-", Info: "대학생, 교환학생 준비", JoinDate: "2026-01-06", ExpiryDate: "2026-07-06", Stats: "24 did 76 left", Grade: "VVIP", AttendanceHistory: []string{"O", "O", "O", "X", "O", "O", "O", "O", "X", "O"}},
				{ID: 1002, Name: "이수진", PhoneNumber: "01098761234", Level: "3", Info: "직장인, IT기업", JoinDate: "2025-11-15", ExpiryDate: "2026-05-15", Stats: "38 did 62 left", Grade: "VVIP", AttendanceHistory: []string{"O", "O", "X", "O", "O", "O", "X", "O", "O", "O"}},
				{ID: 1003, Name: "박준혁", PhoneNumber: "01055567890", Level: "2+", Info: "자영업, 해외바이어 미팅", JoinDate: "2026-02-10", ExpiryDate: "2026-08-10", Stats: "12 did 88 left", Grade: "VVIP", AttendanceHistory: []string{"O", "O", "O", "O", "O", "X", "O", "O", "O", "O"}},
				{ID: 1004, Name: "정유나", PhoneNumber: "01033344556", Level: "3-", Info: "대학원생", JoinDate: "2026-01-20", ExpiryDate: "2026-04-20", Stats: "18 did 12 left", Grade: "A+", AttendanceHistory: []string{"O", "X", "O", "O", "X", "O", "O", "X", "O", "O"}},
				{ID: 1005, Name: "최민서", PhoneNumber: "01077788899", Level: "2", Info: "워홀 준비", JoinDate: "2026-03-01", ExpiryDate: "2026-04-01", Stats: "6 did 4 left", Grade: "멤버쉽", Status: "△", IsPostponed: true, AttendanceHistory: []string{"O", "O", "O", "△", "△", "△"}},
				{ID: 1006, Name: "한지우", PhoneNumber: "01011122233", Level: "3+", Info: "프리랜서 번역가", JoinDate: "2025-09-01", ExpiryDate: "2026-09-01", Stats: "52 did 48 left", Grade: "VVIP+", AttendanceHistory: []string{"O", "O", "O", "O", "O", "O", "O", "O", "O", "O"}},
			},
		},
		{
			Class: management.Class{ID: 102, Name: "레벨0-2반", TimeSlotName: slotName, Capacity: 7},
			Members: []management.Member{
				{ID: 2001, Name: "오승우", PhoneNumber: "01044455566", Level: "4-", Info: "외국계 기업 마케터", JoinDate: "2025-10-01", ExpiryDate: "2026-10-01", Stats: "48 did 52 left", Grade: "VVIP+", AttendanceHistory: []string{"O", "O", "O", "O", "X", "O", "O", "O", "O", "O"}},
				{ID: 2002, Name: "윤서아", PhoneNumber: "01066677788", Level: "3", Info: "간호사, 해외취업 목표", JoinDate: "2026-01-13", ExpiryDate: "2026-07-13", Stats: "20 did 80 left", Grade: "VVIP", AttendanceHistory: []string{"O", "O", "X", "X", "O", "O", "O", "O", "O", "X"}},
				{ID: 2003, Name: "장현우", PhoneNumber: "01099900011", Level: "3-", Info: "공무원", JoinDate: "2026-02-03", ExpiryDate: "2026-05-03", Stats: "14 did 16 left", Grade: "A+", AttendanceHistory: []string{"O", "X", "O", "O", "O", "X", "O", "O", "X", "O"}},
				{ID: 2004, Name: "송예은", PhoneNumber: "01022233344", Level: "4", Info: "통역사 지망", JoinDate: "2025-08-20", ExpiryDate: "2026-08-20", Stats: "60 did 40 left", Grade: "VVIP+", AttendanceHistory: []string{"O", "O", "O", "O", "O", "O", "O", "O", "O", "O"}},
				{ID: 2005, Name: "임태호", PhoneNumber: "01088899900", Level: "2+", Info: "스타트업 대표", JoinDate: "2026-03-10", ExpiryDate: "2026-06-10", Stats: "4 did 26 left", Grade: "A+", Status: "△", IsPostponed: true, AttendanceHistory: []string{"O", "O", "X", "△"}},
			},
		},
		{
			Class: management.Class{ID: 103, Name: "프리토킹 A반", TimeSlotName: slotName, Capacity: 6},
			Members: []management.Member{
				{ID: 3001, Name: "강민재", PhoneNumber: "01015926348", Level: "5", Info: "유학 경험, 영어강사 준비", JoinDate: "2025-06-01", ExpiryDate: "2026-06-01", Stats: "82 did 18 left", Grade: "VVIP+", AttendanceHistory: []string{"O", "O", "O", "O", "O", "O", "O", "O", "O", "O"}},
				{ID: 3002, Name: "배소희", PhoneNumber: "01035746892", Level: "4+", Info: "외국계 금융사", JoinDate: "2025-12-01", ExpiryDate: "2026-06-01", Stats: "30 did 70 left", Grade: "VVIP", AttendanceHistory: []string{"O", "X", "O", "O", "O", "O", "X", "O", "O", "O"}},
				{ID: 3003, Name: "문성빈", PhoneNumber: "01048261573", Level: "5-", Info: "해외영업 담당", JoinDate: "2026-01-02", ExpiryDate: "2026-07-02", Stats: "22 did 78 left", Grade: "VVIP", AttendanceHistory: []string{"O", "O", "O", "O", "X", "O", "O", "O", "O", "X"}},
				{ID: 3004, Name: "권하린", PhoneNumber: "01067381924", Level: "4", Info: "항공사 승무원", JoinDate: "2026-02-17", ExpiryDate: "2026-05-17", Stats: "10 did 20 left", Grade: "A+", AttendanceHistory: []string{"O", "O", "O", "O", "O", "X", "O", "O", "O", "O"}},
			},
		},
	}
}

// DetailHandler - 특정 시간대 또는 특정 수업의 상세 등록현황(출석부) 페이지
func DetailHandler(w http.ResponseWriter, r *http.Request) {
	slotName := r.URL.Query().Get("slot")
	if slotName == "" {
		slotName = "월수 오전팀 (10:00 ~ 12:00)"
	}

	displayClasses := createDetailMockClasses(slotName)

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
