package messagetemplates

import (
	"backoffice/utils"
	"html/template"
)

// MessageTemplate 메시지 템플릿
type MessageTemplate struct {
	ID          int
	Name        string // 템플릿 이름
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

// TemplateListPageData 템플릿 리스트 페이지 데이터
type TemplateListPageData struct {
	Title      string
	ActiveMenu string
	Templates  []MessageTemplate
	Pagination utils.Pagination // 페이징 정보
}

// TemplateFormPageData 템플릿 추가/수정 페이지 데이터
type TemplateFormPageData struct {
	Title        string
	ActiveMenu   string
	Template     *MessageTemplate // 수정 시 기존 템플릿
	Placeholders []Placeholder    // 사용 가능한 플레이스홀더 목록
	IsEdit       bool             // 수정 모드 여부
}

// Templates 템플릿
var Templates *template.Template
