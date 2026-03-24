package opens

import (
	"html/template"
	"net/http"
)

var RefundTemplates *template.Template

// RefundHandler - 멤버십 환불 신청 페이지 (공개)
func RefundHandler(w http.ResponseWriter, r *http.Request) {
	if err := RefundTemplates.ExecuteTemplate(w, "refund.html", nil); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
	}
}
