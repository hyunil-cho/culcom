package employees

import "html/template"

// Employee 직원 정보
type Employee struct {
	ID           string
	Name         string
	Alias        string
	Phone        string
	Branches     []string // 소속 지점 목록 (여러 개 가능)
	RegisterDate string
}

// PageData 직원 목록 페이지 데이터
type PageData struct {
	Title      string
	ActiveMenu string
	Employees  []Employee
}

// DetailPageData 직원 상세 페이지 데이터
type DetailPageData struct {
	Title      string
	ActiveMenu string
	Employee   Employee
}

// EditPageData 직원 수정 페이지 데이터
type EditPageData struct {
	Title      string
	ActiveMenu string
	Employee   Employee
}

// Templates 템플릿
var Templates *template.Template
