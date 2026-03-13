package management

import (
	"backoffice/middleware"
)

type Class struct {
	ID           int
	TimeSlotID   int    // 연결된 시간대 슬롯 ID
	TimeSlotName string // 표시용: 평일 오전, 주말 등
	StaffID      int    // 담당 강사 ID
	StaffName    string // 담당 강사 이름
	Name         string
	Description  string
	Capacity     int    // 정원
	DateValue    string // 요일 (슬롯에서 가져올 정보)
	StartTime    string // 시작 시간 (슬롯에서 가져올 정보)
	EndTime      string // 종료 시간 (슬롯에서 가져올 정보)
}

// Member - 수업 등록 회원 정보 (MOCK용)
type Member struct {
	ID                int
	BranchSeq         string   // 소속 지점 코드
	Name              string
	PhoneNumber       string
	Status            string   // 출석 상태 등 (O, X 등)
	Level             string   // 레벨 (예: 3-)
	Info              string   // 소속/정보 (예: 달서 멤버)
	ChartNumber       string   // 차트 넘버
	Comment           string   // 코멘트 (직업, 관심사, 동기 등)
	JoinDate          string   // 가입일
	LastDate          string   // 마지막 수업일
	ExpiryDate        string   // 만료일
	Stats             string   // 통계 (예: 8 did 97 left)
	Grade             string   // 등급 (예: A+, VVIP+)
	AttendanceHistory []string // 지난 출석 기록 (O, X 등)
}

// Staff - 강사 정보 (MOCK용)
type Staff struct {
	ID                 int
	BranchSeq          string // 소속 지점 코드
	Name               string
	PhoneNumber        string
	Email              string
	Subject            string // 담당 과목/분야
	Role               string // 역할 (강사, 팀장 등)
	Status             string // 상태 (재직, 휴직 등)
	JoinDate           string // 등록일
	Comment            string // 비고
	AssignedClassIDs   string // 배정된 수업 ID 리스트 (쉼표 구분)
}

// PostponementRequest - 수업 연기 요청 (MOCK용)
type PostponementRequest struct {
	ID           int
	MemberName   string
	PhoneNumber  string
	CurrentClass string
	StartDate    string
	EndDate      string
	Reason       string
	Status       string // 대기, 승인, 반려
	RequestDate  string
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
	Staffs     []Staff                  // 선택 가능한 강사 목록
}

// ComplexViewPageData - 슬롯별 통합 뷰 데이터
type ComplexViewPageData struct {
	middleware.BasePageData
	Title      string
	ActiveMenu string
	Groups     []SlotGroup // 여러 슬롯 그룹을 담음
}
