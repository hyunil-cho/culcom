package index

import (
	"backoffice/middleware"
)

// PageData - Complex View  援ъ“泥
type PageData struct {
	middleware.BasePageData
	Title      string
	ActiveMenu string
	AdminName  string
}
