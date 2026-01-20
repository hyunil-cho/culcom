package main

import (
	"backoffice/handlers/home"
	"backoffice/handlers/login"
	"html/template"
	"log"
	"net/http"
)

func init() {
	// 템플릿 파싱
	templates := template.Must(template.ParseGlob("templates/*.html"))
	home.Templates = templates
	login.Templates = templates
}

func main() {
	// 라우트 설정
	http.HandleFunc("/", login.Handler)         // 랜딩 페이지 = 로그인
	http.HandleFunc("/dashboard", home.Handler) // 대시보드

	// 정적 파일 서빙 (CSS, JS, 이미지 등)
	http.Handle("/static/", http.StripPrefix("/static/", http.FileServer(http.Dir("static"))))

	// 서버 시작
	port := ":8080"
	log.Printf("서버 시작: http://localhost%s", port)
	if err := http.ListenAndServe(port, nil); err != nil {
		log.Fatal(err)
	}
}
