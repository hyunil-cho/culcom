package consultation

// PageData - 상담 등록 페이지 데이터
type PageData struct {
	Title          string
	ErrorMessage   string
	SuccessMessage string
}

// SuccessPageData - 상담 등록 성공 페이지 데이터
type SuccessPageData struct {
	CustomerName string
	PhoneNumber  string
}

// RegisterRequest - 상담 등록 요청
type RegisterRequest struct {
	Name        string `json:"name"`
	PhoneNumber string `json:"phone_number"`
}
