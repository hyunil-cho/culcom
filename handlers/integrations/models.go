package integrations

import "html/template"

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
	Title      string
	ActiveMenu string
	Services   []IntegrationService
	BranchCode string
	BranchName string
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
	Title      string
	ActiveMenu string
	Service    IntegrationService
	Config     *SMSConfig // 기존 설정 정보 (있는 경우)
}



// Templates 템플릿
var Templates *template.Template
