package memberships

import (
	"backoffice/database"
	"backoffice/middleware"
)

// PageData - 멤버십 관리 페이지 데이터 구조체
type PageData struct {
	middleware.BasePageData
	Title          string
	ActiveMenu     string
	Memberships    []database.Membership
	SuccessMessage string
}

// EditPageData - 멤버십 수정 페이지 데이터 구조체
type EditPageData struct {
	middleware.BasePageData
	Title      string
	ActiveMenu string
	Membership database.Membership
}
