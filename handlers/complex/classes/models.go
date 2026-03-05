package classes

import (
	"backoffice/middleware"
)

// Student - 학생 정보
type Student struct {
	Index      int
	Name       string
	Phone      string
	IsAttended bool
}

// LevelClass - 레벨별 분반 정보
type LevelClass struct {
	LevelName         string
	LevelDescription  string
	Students          []Student
	AverageAttendance int
}

// CalendarDay - 캘린더의 하루 정보
type CalendarDay struct {
	Date     int      // 일 (1~31)
	Classes  []string // 해당 일의 수업 이름들
	IsToday  bool     // 오늘 여부
	InMonth  bool     // 현재 표시 중인 달의 날짜인지 여부
}

type PageData struct {
	middleware.BasePageData
	Title      string
	ActiveMenu string
	AdminName  string
	Year       int
	Month      int
	Days       []CalendarDay // 캘린더에 표시할 날짜 리스트
}

// ClassDetailData - 수업 상세(출석부) 페이지용 데이터
type ClassDetailData struct {
	middleware.BasePageData
	Title      string
	ActiveMenu string
	ClassName  string // 수업명 (예: 대구일본어 월수 오전팀)
	Date       string // 수업 날짜
	Level      LevelClass // 단일 레벨/출석부 정보
}
