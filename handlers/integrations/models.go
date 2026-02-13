package integrations

import (
	"backoffice/middleware"
	"html/template"
)

// IntegrationService 연동 서비스 정보
type IntegrationService struct {
	ID          string
	Name        string
	Description string
	Icon        string
	Category    string // email, sms, storage, etc.
	Status      string // active, inactive, not-configured
	Connected   bool
}

// PageData 연동 관리 페이지 데이터
type PageData struct {
	middleware.BasePageData
	Title      string
	ActiveMenu string
	Services   []IntegrationService
}

// SMSConfig SMS 연동 설정 정보
type SMSConfig struct {
	ID           int
	Provider     string   // 제공업체 (예: 알리고, 문자나라 등)
	AccountID    string   // 계정 ID/사용자명
	Password     string   // 비밀번호
	SenderPhones []string // 발신번호 목록
	IsActive     bool     // 활성화 여부
	CreatedAt    string   // 생성일시
	UpdatedAt    string   // 수정일시
}

// SMSConfigPageData SMS 설정 페이지 데이터
type SMSConfigPageData struct {
	middleware.BasePageData
	Title      string
	ActiveMenu string
	Service    IntegrationService
	Config     *SMSConfig // 기존 설정 정보 (있는 경우)
}

// SMSConfigSaveRequest SMS 설정 저장 요청
type SMSConfigSaveRequest struct {
	AccountID    string   `json:"account_id"`
	Password     string   `json:"password"`
	SenderPhones []string `json:"sender_phones"`
	IsActive     bool     `json:"is_active"`
}

// SMSConfigSaveResponse SMS 설정 저장 응답
type SMSConfigSaveResponse struct {
	Success bool   `json:"success"`
	Message string `json:"message"`
}

// CreateCalendarEventRequest 캘린더 이벤트 생성 요청 구조체
type CreateCalendarEventRequest struct {
	CustomerName   string `json:"customer_name"`   // 고객 이름
	PhoneNumber    string `json:"phone_number"`    // 전화번호
	InterviewDate  string `json:"interview_date"`  // 인터뷰 일시 (YYYY-MM-DD HH:MM:SS)
	Comment        string `json:"comment"`         // 코멘트
	Duration       int    `json:"duration"`        // 소요시간 (분, 기본값 60분)
	Caller         string `json:"caller"`          // CALLER (A-P)
	CallCount      int    `json:"call_count"`      // 전화 횟수
	CommercialName string `json:"commercial_name"` // 광고명
	AdSource       string `json:"ad_source"`       // 광고 출처
}

// Templates 템플릿
var Templates *template.Template
