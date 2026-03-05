package branches

import (
	"backoffice/middleware"
)

type Branch struct {
	ID           int
	Name         string
	Alias        string
	RegisterDate string
}

type PageData struct {
	middleware.BasePageData
	Title      string
	ActiveMenu string
	AdminName  string
	Branches   []Branch
}
