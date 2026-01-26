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
	Providers  []string   // SMS 제공업체 목록
}

// MessageTemplate 메시지 템플릿
type MessageTemplate struct {
	ID          int
	Name        string // 템플릿 이름
	Category    string // 카테고리 (예약확인, 결제알림, 이벤트 등)
	Content     string // 메시지 내용 (플레이스홀더 포함)
	Description string // 템플릿 설명
	IsActive    bool   // 활성화 여부
	IsDefault   bool   // 기본값 여부
	CreatedAt   string // 생성일시
	UpdatedAt   string // 수정일시
}

// Placeholder 사용 가능한 플레이스홀더
type Placeholder struct {
	Key         string // 플레이스홀더 키 (예: {이름})
	Label       string // 표시 이름
	Description string // 설명
	Example     string // 예시 값
}

// Pagination 페이징 정보
type Pagination struct {
	CurrentPage  int   // 현재 페이지
	TotalPages   int   // 전체 페이지 수
	TotalItems   int   // 전체 항목 수
	ItemsPerPage int   // 페이지당 항목 수
	HasPrev      bool  // 이전 페이지 존재 여부
	HasNext      bool  // 다음 페이지 존재 여부
	Pages        []int // 페이지 번호 목록
}

// TemplateListPageData 템플릿 리스트 페이지 데이터
type TemplateListPageData struct {
	Title      string
	ActiveMenu string
	Templates  []MessageTemplate
	Categories []string
	Pagination Pagination // 페이징 정보
}

// TemplateFormPageData 템플릿 추가/수정 페이지 데이터
type TemplateFormPageData struct {
	Title        string
	ActiveMenu   string
	Template     *MessageTemplate // 수정 시 기존 템플릿
	Placeholders []Placeholder    // 사용 가능한 플레이스홀더 목록
	Categories   []string         // 카테고리 목록
	IsEdit       bool             // 수정 모드 여부
}

// Templates 템플릿
var Templates *template.Template
