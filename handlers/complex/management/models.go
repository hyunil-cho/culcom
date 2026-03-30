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
	BranchSeq         string // 소속 지점 코드
	Name              string
	PhoneNumber       string
	Status            string   // 출석 상태 등 (O, X, △ 등)
	IsPostponed       bool     // 수업 연기 중 여부
	Level             string   // 레벨 (예: 3-)
	Language          string   // 언어 (예: 영어, 일본어)
	Info              string   // 인적사항 (스태프가 기록하는 회원 특징)
	ChartNumber       string   // 차트 넘버
	Comment           string   // 코멘트 (직업, 관심사, 동기 등)
	JoinDate          string   // 가입일
	LastDate          string   // 마지막 수업일
	ExpiryDate        string   // 만료일
	Stats             string   // 통계 (예: 8 did 97 left)
	Grade             string   // 등급 (예: A+, VVIP+)
	Price             string   // 금액
	PaymentDate       string   // 납부일
	DepositAmount     string   // 디파짓 납부금액
	PaymentMethod     string   // 결제방법
	SignupChannel     string   // 가입 경로
	Interviewer       string   // 인터뷰어 (상담/등록 담당 스태프)
	CreatedAt         string   // 등록일자
	UpdatedAt         string   // 수정일자
	AttendanceHistory []string // 지난 출석 기록 (O, X 등)
}

// Staff - 강사 정보 (MOCK용)
type Staff struct {
	ID                   int
	BranchSeq            string // 소속 지점 코드
	BranchName           string // 소속 지점명 (표시용)
	Name                 string
	PhoneNumber          string
	Email                string
	Subject              string // 담당 과목/분야
	Status               string // 상태 (재직, 휴직 등)
	JoinDate             string // 등록일
	Comment              string // 비고
	AssignedClassIDs     string // 배정된 수업 ID 리스트 (쉼표 구분)
	Interviewer          string // 인터뷰어
	PaymentMethod        string // 결제방법
	DepositAmount        string // 디파짓 금액
	RefundableDeposit    string // 환급 예정 디파짓
	NonRefundableDeposit string // 환급불가 디파짓
	RefundBank           string // 환급 은행
	RefundAccount        string // 환급 계좌번호
	RefundAmount         string // 환급 금액
}

// PostponementRequest - 수업 연기 요청 (MOCK용)
type PostponementRequest struct {
	ID             int
	MemberName     string
	PhoneNumber    string
	CurrentClass   string
	StartDate      string
	EndDate        string
	Reason         string
	Status         string // 대기, 승인, 반려
	RejectReason   string // 반려 사유
	RequestDate    string
	UsedCount      int // 사용한 연기 횟수
	RemainingCount int // 남은 연기 횟수
}

// RefundRequest - 환불 요청 (MOCK용)
type RefundRequest struct {
	ID            int
	MemberName    string
	PhoneNumber   string
	Grade         string // 멤버십 등급
	CurrentClass  string
	PaymentAmount string // 결제 금액
	RefundAmount  string // 환불 요청 금액
	Reason        string
	BankName      string // 환불 계좌 은행
	AccountNumber string // 계좌번호
	AccountHolder string // 예금주
	Status        string // 진행중, 승인, 반려
	RejectReason  string
	RequestDate   string
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
