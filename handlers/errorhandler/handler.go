package errorhandler

import (
	"html/template"
	"net/http"
	"time"
)

// ErrorData 에러 페이지 데이터
type ErrorData struct {
	ErrorCode    string
	ErrorTitle   string
	ErrorMessage string
	ErrorDetail  string
	Timestamp    string
}

// Templates 템플릿
var Templates *template.Template

// ShowError 에러 페이지 표시
func ShowError(w http.ResponseWriter, code int, title, message, detail string) {
	w.WriteHeader(code)

	data := ErrorData{
		ErrorCode:    http.StatusText(code),
		ErrorTitle:   title,
		ErrorMessage: message,
		ErrorDetail:  detail,
		Timestamp:    time.Now().Format("2006-01-02 15:04:05"),
	}

	// ErrorCode를 숫자로도 표시
	switch code {
	case 404:
		data.ErrorCode = "404"
	case 403:
		data.ErrorCode = "403"
	case 500:
		data.ErrorCode = "500"
	case 503:
		data.ErrorCode = "503"
	default:
		data.ErrorCode = "ERROR"
	}

	Templates.ExecuteTemplate(w, "error.html", data)
}

// Handler404 404 에러 핸들러
func Handler404(w http.ResponseWriter, r *http.Request) {
	ShowError(w, 404,
		"페이지를 찾을 수 없습니다",
		"요청하신 페이지가 존재하지 않거나 이동되었습니다.",
		"URL: "+r.URL.Path)
}

// Handler500 500 에러 핸들러
func Handler500(w http.ResponseWriter, r *http.Request, err error) {
	detail := ""
	if err != nil {
		detail = err.Error()
	}
	ShowError(w, 500,
		"서버 오류가 발생했습니다",
		"일시적인 서버 오류입니다. 잠시 후 다시 시도해주세요.",
		detail)
}

// Handler403 403 에러 핸들러
func Handler403(w http.ResponseWriter, r *http.Request) {
	ShowError(w, 403,
		"접근 권한이 없습니다",
		"이 페이지에 접근할 권한이 없습니다.",
		"필요한 권한이 없거나 로그인이 필요합니다.")
}
