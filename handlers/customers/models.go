package customers

import (
	"backoffice/database"
	"backoffice/middleware"
	"backoffice/utils"
)

// Customer - 고객 데이터 구조체
type Customer struct {
	ID           string
	Name         string
	Phone        string
	Email        string
	AdName       string
	Status       string
	RegisterDate string
	LastVisit    string
	CallCount    int
	Branch       string
	Comment      string
}

// SalesHistory - 영업 히스토리 구조체
type SalesHistory struct {
	Date    string
	Agent   string
	Content string
	Detail  string
	Comment string
}

// PageData - 고객 관리 페이지 데이터 구조체
type PageData struct {
	middleware.BasePageData
	Title            string
	ActiveMenu       string
	Customers        []Customer
	DefaultTemplate  string // 기본 템플릿 내용
	MessageTemplates []database.MessageTemplate
	Pagination       utils.Pagination
	CurrentFilter    string // 현재 적용된 필터 (new/all)
	SearchType       string // 검색 타입 (name/phone)
	SearchKeyword    string // 검색어
}

// DetailPageData - 고객 상세 페이지 데이터 구조체
type DetailPageData struct {
	middleware.BasePageData
	Title        string
	ActiveMenu   string
	Customer     Customer
	SalesHistory []SalesHistory
}

// EditPageData - 고객 수정 페이지 데이터 구조체
type EditPageData struct {
	middleware.BasePageData
	Title      string
	ActiveMenu string
	Customer   Customer
}
