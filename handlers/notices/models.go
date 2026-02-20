package notices

import (
	"backoffice/middleware"
	"backoffice/utils"
)

// NoticeItem - 공지사항/이벤트 목록 아이템
type NoticeItem struct {
	ID             string
	BranchName     string
	Title          string
	Category       string
	CategoryClass  string
	IsPinned       bool
	ViewCount      int
	EventStartDate string
	EventEndDate   string
	CreatedBy      string
	CreatedDate    string
	HasEventDate   bool
}

// NoticeDetail - 공지사항/이벤트 상세
type NoticeDetail struct {
	ID             string
	BranchName     string
	Title          string
	Content        string
	Category       string
	CategoryClass  string
	IsPinned       bool
	ViewCount      int
	EventStartDate string
	EventEndDate   string
	CreatedBy      string
	CreatedDate    string
	LastUpdateDate string
	HasEventDate   bool
}

// ListPageData - 공지사항/이벤트 목록 페이지 데이터
type ListPageData struct {
	middleware.BasePageData
	Title         string
	ActiveMenu    string
	Notices       []NoticeItem
	Pagination    utils.Pagination
	CurrentFilter string
	SearchKeyword string
	TotalCount    int
}

// DetailPageData - 공지사항/이벤트 상세 페이지 데이터
type DetailPageData struct {
	middleware.BasePageData
	Title      string
	ActiveMenu string
	Notice     NoticeDetail
}

// AddPageData - 공지사항/이벤트 등록 페이지 데이터
type AddPageData struct {
	middleware.BasePageData
	Title          string
	ActiveMenu     string
	SuccessMessage string
	ErrorMessage   string
}

// EditPageData - 공지사항/이벤트 수정 페이지 데이터
type EditPageData struct {
	middleware.BasePageData
	Title          string
	ActiveMenu     string
	Notice         NoticeDetail
	SuccessMessage string
	ErrorMessage   string
}
