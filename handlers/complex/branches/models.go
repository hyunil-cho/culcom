package branches

import (
	"backoffice/middleware"
)

type Branch struct {
	ID           int
	Name         string
	Alias        string
	Manager      string
	Address      string
	Directions   string
	CreatedAt    string
	UpdatedAt    string
	RegisterDate string // For compatibility with existing code if any
}

type PageData struct {
	middleware.BasePageData
	Title      string
	ActiveMenu string
	AdminName  string
	Branches   []Branch
}
