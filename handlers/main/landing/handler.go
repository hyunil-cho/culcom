package landing

import (
	"backoffice/database"
	"encoding/base64"
	"html/template"
	"log"
	"net/http"
)

var Templates *template.Template

// Handler - 광고용 랜딩 페이지
func Handler(w http.ResponseWriter, r *http.Request) {
	// 지점 목록 조회
	branches, err := database.GetBranchesForSelect()
	if err != nil {
		log.Printf("지점 목록 조회 오류: %v", err)
		http.Error(w, "지점 정보를 불러올 수 없습니다", http.StatusInternalServerError)
		return
	}

	data := PageData{
		Title:    "CulCom - 스터디 문의하기",
		Branches: branches,
	}

	if err := Templates.ExecuteTemplate(w, "landing/index.html", data); err != nil {
		log.Printf("템플릿 실행 오류: %v", err)
		http.Error(w, "페이지를 불러올 수 없습니다", http.StatusInternalServerError)
	}
}

// SuccessHandler - 카카오 인증 성공 페이지
func SuccessHandler(w http.ResponseWriter, r *http.Request) {
	// URL 파라미터에서 인코딩된 데이터 가져오기
	encodedData := r.URL.Query().Get("data")
	customerName := "고객님"

	if encodedData != "" {
		// base64 디코딩
		decoded, err := base64.URLEncoding.DecodeString(encodedData)
		if err == nil {
			customerName = string(decoded)
		} else {
			log.Printf("데이터 디코딩 실패: %v", err)
		}
	}

	data := struct {
		CustomerName string
	}{
		CustomerName: customerName,
	}

	if err := Templates.ExecuteTemplate(w, "landing/success.html", data); err != nil {
		log.Printf("템플릿 실행 오류: %v", err)
		http.Error(w, "페이지를 불러올 수 없습니다", http.StatusInternalServerError)
	}
}

// ErrorHandler - 카카오 인증 실패 페이지
func ErrorHandler(w http.ResponseWriter, r *http.Request) {
	if err := Templates.ExecuteTemplate(w, "landing/error.html", nil); err != nil {
		log.Printf("템플릿 실행 오류: %v", err)
		http.Error(w, "페이지를 불러올 수 없습니다", http.StatusInternalServerError)
	}
}
