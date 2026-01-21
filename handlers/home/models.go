package home

// StatCard - 통계 카드 데이터
type StatCard struct {
	Title string
	Value string
	Icon  string
	Color string
}

// PageData - 홈페이지 데이터 구조체
type PageData struct {
	Title      string
	ActiveMenu string
	AdminName  string
	Stats      []StatCard
}
