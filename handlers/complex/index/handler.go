package index

import (
	"html/template"
	"log"
	"net/http"
	"backoffice/middleware"
)

var Templates *template.Template

// Handler - Complex View 怨
func Handler(w http.ResponseWriter, r *http.Request) {
	data := PageData{
		BasePageData: middleware.GetBasePageData(r),
		Title:        "Complex View",
		ActiveMenu:   "complex_home",
		AdminName:    "愿由ъ옄",
	}

	if err := Templates.ExecuteTemplate(w, "dashboard/complex.html", data); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		log.Println("Template error:", err)
	}
}
