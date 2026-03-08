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
			{
				ID: i*10 + 1, Name: fmt.Sprintf("송예은%d", i), PhoneNumber: "01052852951", Status: "O",
				Level: "3-", Info: "달서 멤버", JoinDate: "2026-01-08", LastDate: "2025-12-22", ExpiryDate: "2036-10-21",
				Stats: "22 did 1109 left", Grade: "VVIP+", AttendanceHistory: []string{"O", "O", "", "O", "", "", "O", "O", "O"},
			},
			{
				ID: i*10 + 2, Name: fmt.Sprintf("홍지완%d", i), PhoneNumber: "01022223333", Status: "",
				Level: "", Info: "", JoinDate: "0000-00-00", LastDate: "0000-00-00", ExpiryDate: "0000-00-00",
				Stats: "0 left", Grade: "멤버쉽", AttendanceHistory: []string{"", "O", "O", "O", "O", "O", "", "", ""},
			},
			{
				ID: i*10 + 3, Name: fmt.Sprintf("김재민%d", i), PhoneNumber: "01086859818", Status: "O",
				Level: "0", Info: "", JoinDate: "0000-00-00", LastDate: "2026-02-09", ExpiryDate: "2027-02-08",
				Stats: "8 did 97 left", Grade: "A+", AttendanceHistory: []string{"", "", "", "O", "", "", "", "", ""},
			},
			{
				ID: i*10 + 4, Name: fmt.Sprintf("최민지%d", i), PhoneNumber: "01040733875", Status: "",
				Level: "0", Info: "", JoinDate: "0000-00-00", LastDate: "2026-01-05", ExpiryDate: "2027-01-04",
				Stats: "18 did 87 left", Grade: "A+", AttendanceHistory: []string{"", "", "", "", "", "", "O", "O", "O"},
			},
			{
				ID: i*10 + 5, Name: fmt.Sprintf("김무준%d", i), PhoneNumber: "01054117431", Status: "O",
				Level: "0", Info: "월화수목 오전", JoinDate: "2026-01-08", LastDate: "2026-01-06", ExpiryDate: "2036-01-05",
				Stats: "17 did 1026 left", Grade: "VVIP", AttendanceHistory: []string{"O", "", "O", "O", "O", "", "", "", ""},
			},
		}
		// 일부 반은 인원을 더 많이
		if i%3 == 0 {
			members = append(members, management.Member{
				ID: i*10 + 6, Name: "신민철", PhoneNumber: "01047447952", Status: "O",
				Level: "0", Info: "", JoinDate: "0000-00-00", LastDate: "2026-02-02", ExpiryDate: "2026-08-01",
				Stats: "10 did 42 left", Grade: "H+", AttendanceHistory: []string{"", "O", "O", "O", "", "O", "", "", ""},
			})
			members = append(members, management.Member{
				ID: i*10 + 7, Name: "김지현", PhoneNumber: "01038206210", Status: "",
				Level: "", Info: "영어평생멤버", JoinDate: "2026-01-04", LastDate: "2025-07-23", ExpiryDate: "2037-02-04",
				Stats: "65 did 1140 left", Grade: "VVIP+", AttendanceHistory: []string{"", "", "", "", "", "O", "O", "", ""},
			})
		}

		classes = append(classes, management.ClassWithMembers{
			Class:   management.Class{ID: i, Name: className, TimeSlotName: slotName},
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
