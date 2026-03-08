package management

import (
	"backoffice/middleware"
)

type Class struct {
	ID           int
	TimeSlotID   int    // 연결된 시간대 슬롯 ID
	TimeSlotName string // 표시용: 평일 오전, 주말 등
	Name         string
	Description  string
	DateValue    string // 요일 (슬롯에서 가져올 정보)
	StartTime    string // 시작 시간 (슬롯에서 가져올 정보)
	EndTime      string // 종료 시간 (슬롯에서 가져올 정보)
}

type PageData struct {
	middleware.BasePageData
	Title      string
	ActiveMenu string
	Classes    []Class
	TimeSlots  []map[string]interface{} // 선택 가능한 시간대 목록
}
