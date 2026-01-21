package main

import (
	"backoffice/handlers/customers"
	"backoffice/handlers/home"
	"backoffice/handlers/login"
	"html/template"
	"log"
	"net/http"
)

func init() {
	// 템플릿 파싱 - layouts, dashboard, customers 등 모든 템플릿 파일 로드
	templates := template.Must(template.ParseGlob("templates/layouts/*.html"))
	templates = template.Must(templates.ParseGlob("templates/dashboard/*.html"))
	templates = template.Must(templates.ParseGlob("templates/customers/*.html"))
	templates = template.Must(templates.ParseGlob("templates/auth/*.html"))

	home.Templates = templates
	login.Templates = templates
	customers.Templates = templates
}

func main() {
	// 라우트 설정
	http.HandleFunc("/", login.Handler)                           // 랜딩 페이지 = 로그인
	http.HandleFunc("/dashboard", home.Handler)                   // 대시보드
	http.HandleFunc("/customers", customers.Handler)              // 고객 관리
	http.HandleFunc("/customers/detail", customers.DetailHandler) // 고객 상세
	http.HandleFunc("/customers/edit", customers.EditHandler)     // 고객 수정

	// 정적 파일 서빙 (CSS, JS, 이미지 등)
	http.Handle("/static/", http.StripPrefix("/static/", http.FileServer(http.Dir("static"))))

	// 서버 시작
	port := ":8080"
	log.Printf("서버 시작: http://localhost%s", port)
	if err := http.ListenAndServe(port, nil); err != nil {
		log.Fatal(err)
	}
}
