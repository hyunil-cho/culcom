package public

import (
	"html/template"
	"log"
	"net/http"
)

var Templates *template.Template

// LandingHandler - 공개 랜딩 페이지 핸들러
func LandingHandler(w http.ResponseWriter, r *http.Request) {
	if err := Templates.ExecuteTemplate(w, "public/landing.html", nil); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		log.Println("Template error:", err)
	}
}

// PrivacyHandler - 개인정보처리방침 페이지 핸들러
func PrivacyHandler(w http.ResponseWriter, r *http.Request) {
	if err := Templates.ExecuteTemplate(w, "public/privacy.html", nil); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		log.Println("Template error:", err)
	}
}

// TermsHandler - 이용약관 페이지 핸들러
func TermsHandler(w http.ResponseWriter, r *http.Request) {
	if err := Templates.ExecuteTemplate(w, "public/terms.html", nil); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		log.Println("Template error:", err)
	}
}
