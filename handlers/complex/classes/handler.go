package classes

import (
	"backoffice/middleware"
	"html/template"
	"log"
	"net/http"
	"time"
)

var Templates *template.Template

// Handler - 출석 현황(캘린더) 핸들러
func Handler(w http.ResponseWriter, r *http.Request) {
	now := time.Now()
	year, month, _ := now.Date()

	// 캘린더 데이터 생성
	days := make([]CalendarDay, 31)
	for i := 0; i < 31; i++ {
		dayNum := i + 1
		var classes []string
		
		// 3의 배수일 때는 오전반
		if dayNum%3 == 0 {
			classes = append(classes, "월수 오전 레벨0")
		}
		// 5의 배수일 때는 오후반
		if dayNum%5 == 0 {
			classes = append(classes, "화목 오후 레벨2")
		}
		// 15일처럼 공배수이거나 특정일에는 여러 수업이 겹침
		if dayNum == 15 {
			classes = append(classes, "토일 주말 프리토킹")
			classes = append(classes, "특별 보충 수업")
			classes = append(classes, "심화 회화 A")
			classes = append(classes, "기초 영문법 특강")
			classes = append(classes, "저녁 비즈니스반")
		}

		days[i] = CalendarDay{
			Date:    dayNum,
			Classes: classes,
			IsToday: dayNum == now.Day(),
			InMonth: true,
		}
	}

	data := PageData{
		BasePageData: middleware.GetBasePageData(r),
		Title:        "출석 현황",
		ActiveMenu:   "complex_classes",
		AdminName:    "관리자",
		Year:         year,
		Month:        int(month),
		Days:         days,
	}

	if err := Templates.ExecuteTemplate(w, "dashboard/classes.html", data); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		log.Println("Template error:", err)
	}
}

// DetailHandler - 수업 상세(출석부) 핸들러
func DetailHandler(w http.ResponseWriter, r *http.Request) {
	className := r.URL.Query().Get("name")
	if className == "" {
		className = "대구일본어 월수 오전팀"
	}

	// 단일 레벨 데이터 샘플
	level := LevelClass{
		LevelName:        "레벨0반",
		LevelDescription: "(기초 회화 문법)",
		Students: []Student{
			{Index: 1, Name: "송예은3-", Phone: "010528529..."},
			{Index: 2, Name: "홍지완", Phone: "x"},
			{Index: 3, Name: "김재민0", Phone: "01086859818"},
			{Index: 4, Name: "최민지0", Phone: "01040733875", IsAttended: true},
			{Index: 5, Name: "김무준0", Phone: "01054117431"},
		},
		AverageAttendance: 4,
	}

	data := ClassDetailData{
		BasePageData: middleware.GetBasePageData(r),
		Title:        "출석부 상세",
		ActiveMenu:   "complex_classes",
		ClassName:    className,
		Date:         "2026-03-05",
		Level:        level,
	}

	if err := Templates.ExecuteTemplate(w, "dashboard/class_detail.html", data); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		log.Println("Template error:", err)
	}
}

// 더미 학생 생성 헬퍼
func generateDummyStudents(count int) []Student {
	students := make([]Student, count)
	for i := 0; i < count; i++ {
		students[i] = Student{Index: i + 1, Name: "x", Phone: "x"}
	}
	return students
}
