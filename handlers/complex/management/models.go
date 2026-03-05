package management

import (
	"backoffice/middleware"
)

type Class struct {
	ID          int
	Name        string
	Description string
	DateType    string // "fixed" (일자 선택) or "weekly" (매주 x요일)
	DateValue   string // 날짜 문자열 또는 요일 (월, 화, 수...)
	StartTime   string // 시작 시간 (HH:MM)
	EndTime     string // 종료 시간 (HH:MM)
}

type PageData struct {
	middleware.BasePageData
	Title      string
	ActiveMenu string
	AdminName  string
	Classes    []Class
}
