package opens

import (
	"html/template"
	"log"
	"net/http"
)

var privacyTemplate *template.Template

// InitPrivacyTemplate - 개인정보 처리방침 템플릿 초기화
func InitPrivacyTemplate() {
	var err error
	privacyTemplate, err = template.ParseFiles("templates/privacy/policy.html")
	if err != nil {
		log.Printf("개인정보 처리방침 템플릿 파싱 오류: %v", err)
	}
}

// PrivacyPolicyHandler godoc
// @Summary      개인정보 처리방침
// @Description  컬컴 점주협의회의 개인정보 처리방침을 확인합니다
// @Tags         public
// @Produce      html
// @Success      200  {string}  string  "개인정보 처리방침 페이지"
// @Router       /privacy [get]
func PrivacyPolicyHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	if privacyTemplate == nil {
		InitPrivacyTemplate()
	}

	if privacyTemplate == nil {
		http.Error(w, "템플릿을 로드할 수 없습니다", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	if err := privacyTemplate.Execute(w, nil); err != nil {
		log.Printf("개인정보 처리방침 템플릿 실행 오류: %v", err)
		http.Error(w, "페이지를 표시할 수 없습니다", http.StatusInternalServerError)
	}
}
