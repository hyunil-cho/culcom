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
}

// Templates 템플릿
var Templates *template.Template
