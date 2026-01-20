package login

import (
	"html/template"
	"log"
	"net/http"
)

//TODO :: 로그인 세션이 존재하는 사용자가 로그인 페이지로 가면, 대시보드로 리다이렉트 시키기

var Templates *template.Template

// Handler - 로그인 페이지 핸들러 (GET)
func Handler(w http.ResponseWriter, r *http.Request) {
	data := PageData{
		Title: "로그인",
		Error: "",
	}

	if err := Templates.ExecuteTemplate(w, "login.html", data); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		log.Println("Template error:", err)
	}
}

// LoginHandler - 로그인 처리 핸들러 (POST)
func LoginHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Redirect(w, r, "/", http.StatusSeeOther)
		return
	}

	// 폼 데이터 파싱
	if err := r.ParseForm(); err != nil {
		http.Error(w, "폼 데이터를 파싱할 수 없습니다", http.StatusBadRequest)
		return
	}

	// TODO: 실제 인증 로직 구현 예정
	// 현재는 바로 대시보드로 이동
	http.Redirect(w, r, "/dashboard", http.StatusSeeOther)
}
