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

// PageData - 고객 관리 페이지 데이터 구조체
type PageData struct {
	Title     string
	Customers []Customer
}

// DetailPageData - 고객 상세 페이지 데이터 구조체
type DetailPageData struct {
	Title    string
	Customer Customer
}

// EditPageData - 고객 수정 페이지 데이터 구조체
type EditPageData struct {
	Title    string
	Customer Customer
}
