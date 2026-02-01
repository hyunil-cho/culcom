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

// CalendarConfig 구글 캘린더 연동 설정 정보
type CalendarConfig struct {
	ClientID       string // OAuth 2.0 클라이언트 ID
	ClientSecret   string // OAuth 2.0 클라이언트 보안 비밀번호
	AccessToken    string // 액세스 토큰
	RefreshToken   string // 리프레시 토큰
	ConnectedEmail string // 연동된 구글 계정 이메일
	IsActive       bool   // 활성화 여부
	CreatedAt      string // 생성일시
	UpdatedAt      string // 수정일시
}

// CalendarConfigPageData 구글 캘린더 설정 페이지 데이터
type CalendarConfigPageData struct {
	middleware.BasePageData
	Title          string
	ActiveMenu     string
	IsActive       bool
	ConnectedEmail string
	SuccessMessage string
	ErrorMessage   string
}

// Templates 템플릿
var Templates *template.Template
