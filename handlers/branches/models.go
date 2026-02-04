package branches

import (
	"backoffice/middleware"
)

// Branch - 지점 데이터 구조체
type Branch struct {
	ID           string
	Name         string
	Alias        string
	Address      string
	Directions   string
	RegisterDate string
}

// PageData - 지점 관리 페이지 데이터 구조체
type PageData struct {
	middleware.BasePageData
	Title          string
	ActiveMenu     string
	Branches       []Branch
	SuccessMessage string
	Pagination     interface{}
	SearchType     string
	SearchKeyword  string
	SearchParams   string
}

// DetailPageData - 지점 상세 페이지 데이터 구조체
type DetailPageData struct {
	middleware.BasePageData
	Title      string
	ActiveMenu string
	Branch     Branch
}

// EditPageData - 지점 수정 페이지 데이터 구조체
type EditPageData struct {
	middleware.BasePageData
	Title      string
	ActiveMenu string
	Branch     Branch
}
