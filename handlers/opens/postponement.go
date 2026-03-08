package opens

import (
	"html/template"
	"net/http"
)

var PostponementTemplates *template.Template

func PostponementHandler(w http.ResponseWriter, r *http.Request) {
	data := struct {
		Title string
	}{
		Title: "수업 연기 요청",
	}

	// layouts/base.html 등을 사용하지 않는 완전 독립형 또는 간단한 레이아웃 필요
	// 여기서는 요청하신 대로 UI를 먼저 구성합니다.
	if err := PostponementTemplates.ExecuteTemplate(w, "opens/postponement.html", data); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
	}
}
