package customers

// Customer - 고객 데이터 구조체
type Customer struct {
	ID           string
	Name         string
	Phone        string
	Email        string
	Status       string
	RegisterDate string
	LastVisit    string
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
	Title      string
	ActiveMenu string
	Customers  []Customer
}

// DetailPageData - 고객 상세 페이지 데이터 구조체
type DetailPageData struct {
	Title        string
	ActiveMenu   string
	Customer     Customer
	SalesHistory []SalesHistory
}

// EditPageData - 고객 수정 페이지 데이터 구조체
type EditPageData struct {
	Title      string
	ActiveMenu string
	Customer   Customer
}
