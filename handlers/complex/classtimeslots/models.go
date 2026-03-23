package classtimeslots

import (
	"backoffice/middleware"
	"backoffice/utils"
	"strings"
)

// ClassTimeSlot - 수업 시간대 구조체
type ClassTimeSlot struct {
	Seq         int
	BranchSeq   int
	Name        string
	DaysOfWeek  string
	StartTime   string
	EndTime     string
	CreatedDate string
}

// PageData - 수업 시간대 목록 페이지 데이터
type PageData struct {
	middleware.BasePageData
	Title          string
	ActiveMenu     string
	Slots          []ClassTimeSlot
	SuccessMessage string
	ErrorMessage   string
}

// EditPageData - 수업 시간대 수정/추가 페이지 데이터
type EditPageData struct {
	middleware.BasePageData
	Title          string
	ActiveMenu     string
	Slot           ClassTimeSlot
	IsEdit         bool
	SuccessMessage string
	ErrorMessage   string
}

// IsDaySelected - 요일 선택 여부 확인 (템플릿용)
func (d EditPageData) IsDaySelected(day string) bool {
	if d.Slot.DaysOfWeek == "" {
		return false
	}
	
	dayList := strings.Split(d.Slot.DaysOfWeek, ",")
	for _, dayStr := range dayList {
		if strings.TrimSpace(dayStr) == day {
			return true
		}
	}
	return false
}

// SearchParams - 검색 파라미터
type SearchParams struct {
	utils.SearchParams
}
