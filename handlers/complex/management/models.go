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

// Member - 수업 등록 회원 정보 (MOCK용)
type Member struct {
	ID          int
	Name        string
	PhoneNumber string
	Status      string // 출석 상태 등 (O, X 등)
}

// ClassWithMembers - 회원이 포함된 수업 정보
type ClassWithMembers struct {
	Class
	Members []Member
}

// SlotGroup - 슬롯별 수업 그룹
type SlotGroup struct {
	SlotName string
	Classes  []ClassWithMembers
}

type PageData struct {
	middleware.BasePageData
	Title      string
	ActiveMenu string
	Classes    []Class
	TimeSlots  []map[string]interface{} // 선택 가능한 시간대 목록
}

// ComplexViewPageData - 슬롯별 통합 뷰 데이터
type ComplexViewPageData struct {
	middleware.BasePageData
	Title      string
	ActiveMenu string
	Groups     []SlotGroup // 여러 슬롯 그룹을 담음
}
