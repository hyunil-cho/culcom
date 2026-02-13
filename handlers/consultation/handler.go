package consultation

import (
	"backoffice/database"
	"html/template"
	"log"
	"net/http"
	"regexp"
	"strings"
)

var Templates *template.Template

// RegisterHandler - 상담 등록 페이지 (GET)
func RegisterHandler(w http.ResponseWriter, r *http.Request) {
	data := PageData{
		Title: "CulCom - 상담 신청",
	}

	if err := Templates.ExecuteTemplate(w, "consultation/register.html", data); err != nil {
		log.Printf("템플릿 실행 오류: %v", err)
		http.Error(w, "페이지를 불러올 수 없습니다", http.StatusInternalServerError)
	}
}

// SubmitHandler - 상담 등록 처리 (POST)
func SubmitHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "잘못된 요청 방식입니다", http.StatusMethodNotAllowed)
		return
	}

	// 폼 데이터 파싱
	if err := r.ParseForm(); err != nil {
		log.Printf("폼 파싱 오류: %v", err)
		http.Error(w, "잘못된 요청입니다", http.StatusBadRequest)
		return
	}

	name := strings.TrimSpace(r.FormValue("name"))
	phoneNumber := strings.TrimSpace(r.FormValue("phone_number"))

	// 유효성 검사
	if name == "" {
		renderError(w, "이름을 입력해주세요.")
		return
	}

	if phoneNumber == "" {
		renderError(w, "전화번호를 입력해주세요.")
		return
	}

	// 전화번호 형식 검증 (숫자와 하이픈만 허용)
	phoneRegex := regexp.MustCompile(`^[0-9-]+$`)
	if !phoneRegex.MatchString(phoneNumber) {
		renderError(w, "올바른 전화번호 형식이 아닙니다.")
		return
	}

	// 하이픈 제거 후 길이 체크 (10자 또는 11자)
	phoneDigits := strings.ReplaceAll(phoneNumber, "-", "")
	if len(phoneDigits) < 10 || len(phoneDigits) > 11 {
		renderError(w, "올바른 전화번호 형식이 아닙니다.")
		return
	}

	// 상담신청을 통해 들어온 고객은 지점 미배정 상태 (NULL)
	// 관리자가 나중에 지점을 배정할 수 있음
	var branchSeq *int = nil

	// 고객 정보 저장
	customerSeq, err := database.CreateCustomer(branchSeq, name, phoneNumber, "", "", "상담신청")
	if err != nil {
		log.Printf("고객 정보 저장 오류: %v", err)
		renderError(w, "상담 신청 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.")
		return
	}

	log.Printf("상담 신청 완료 - Customer ID: %d, Name: %s, Phone: %s", customerSeq, name, phoneNumber)

	// 성공 페이지로 리다이렉트
	http.Redirect(w, r, "/consultation/success?name="+name, http.StatusSeeOther)
}

// SuccessHandler - 상담 신청 완료 페이지
func SuccessHandler(w http.ResponseWriter, r *http.Request) {
	customerName := r.URL.Query().Get("name")
	if customerName == "" {
		customerName = "고객님"
	}

	data := SuccessPageData{
		CustomerName: customerName,
	}

	if err := Templates.ExecuteTemplate(w, "consultation/success.html", data); err != nil {
		log.Printf("템플릿 실행 오류: %v", err)
		http.Error(w, "페이지를 불러올 수 없습니다", http.StatusInternalServerError)
	}
}

// renderError - 에러 메시지와 함께 등록 페이지 다시 표시
func renderError(w http.ResponseWriter, message string) {
	data := PageData{
		Title:        "CulCom - 상담 신청",
		ErrorMessage: message,
	}

	if err := Templates.ExecuteTemplate(w, "consultation/register.html", data); err != nil {
		log.Printf("템플릿 실행 오류: %v", err)
		http.Error(w, "페이지를 불러올 수 없습니다", http.StatusInternalServerError)
	}
}
