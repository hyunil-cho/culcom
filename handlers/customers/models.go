package customers

import (
	"backoffice/middleware"
	"backoffice/utils"
)

// Customer - 고객 데이터 구조체
type Customer struct {
	ID              string
	Name            string
	Phone           string
	AdName          string
	AdSource        string
	Status          string
	RegisterDate    string
	LastContactDate string
	CallCount       int
	Branch          string
	Comment         string
}

// PageData - 고객 관리 페이지 데이터 구조체
type PageData struct {
	middleware.BasePageData
	Title          string
	ActiveMenu     string
	Customers      []Customer
	SuccessMessage string // 플래시 메시지
	Pagination     utils.Pagination
	CurrentFilter  string // 현재 적용된 필터 (new/all)
	SearchType     string // 검색 타입 (name/phone)
	SearchKeyword  string // 검색어
	TotalCount     int    // 조건에 맞는 전체 고객 수
}
