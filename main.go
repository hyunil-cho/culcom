package main

import (
	"backoffice/handlers/branches"
	"backoffice/handlers/customers"
	"backoffice/handlers/errorhandler"
	"backoffice/handlers/home"
	"backoffice/handlers/integrations"
	"backoffice/handlers/login"
	"backoffice/middleware"
	"html/template"
	"log"
	"net/http"
)

func init() {
	// 커스텀 템플릿 함수 정의
	funcMap := template.FuncMap{
		"add": func(a, b int) int {
			return a + b
		},
		"sub": func(a, b int) int {
			return a - b
		},
	}

	// 템플릿 파싱 - layouts, dashboard, customers 등 모든 템플릿 파일 로드
	templates := template.Must(template.New("").Funcs(funcMap).ParseGlob("templates/layouts/*.html"))
	templates = template.Must(templates.ParseGlob("templates/dashboard/*.html"))
	templates = template.Must(templates.ParseGlob("templates/customers/*.html"))
	templates = template.Must(templates.ParseGlob("templates/branches/*.html"))
	templates = template.Must(templates.ParseGlob("templates/integrations/*.html"))
	templates = template.Must(templates.ParseGlob("templates/auth/*.html"))
	templates = template.Must(templates.ParseGlob("templates/error.html"))

	home.Templates = templates
	login.Templates = templates
	customers.Templates = templates
	branches.Templates = templates
	integrations.Templates = templates
	errorhandler.Templates = templates
}

func main() {
	// 커스텀 ServeMux 생성 (404 핸들러 설정을 위해)
	mux := http.NewServeMux()

	// 라우트 설정 (panic recovery 미들웨어 적용)
	mux.HandleFunc("/dashboard", middleware.RecoverFunc(home.Handler))                                                      // 대시보드
	mux.HandleFunc("/customers", middleware.RecoverFunc(customers.Handler))                                                 // 고객 관리
	mux.HandleFunc("/customers/detail", middleware.RecoverFunc(customers.DetailHandler))                                    // 고객 상세
	mux.HandleFunc("/customers/edit", middleware.RecoverFunc(customers.EditHandler))                                        // 고객 수정
	mux.HandleFunc("/customers/add", middleware.RecoverFunc(customers.AddHandler))                                          // 고객 추가
	mux.HandleFunc("/branches", middleware.RecoverFunc(branches.Handler))                                                   // 지점 관리
	mux.HandleFunc("/branches/detail", middleware.RecoverFunc(branches.DetailHandler))                                      // 지점 상세
	mux.HandleFunc("/branches/edit", middleware.RecoverFunc(branches.EditHandler))                                          // 지점 수정
	mux.HandleFunc("/branches/add", middleware.RecoverFunc(branches.AddHandler))                                            // 지점 추가
	mux.HandleFunc("/integrations", middleware.RecoverFunc(integrations.Handler))                                           // 외부 시스템 연동
	mux.HandleFunc("/integrations/configure", middleware.RecoverFunc(integrations.ConfigureHandler))                        // 연동 설정
	mux.HandleFunc("/integrations/sms-config", middleware.RecoverFunc(integrations.SMSConfigHandler))                       // SMS 연동 설정
	mux.HandleFunc("/message-templates", middleware.RecoverFunc(integrations.MessageTemplatesHandler))                      // 메시지 템플릿 목록
	mux.HandleFunc("/message-templates/add", middleware.RecoverFunc(integrations.MessageTemplateAddHandler))                // 메시지 템플릿 추가
	mux.HandleFunc("/message-templates/edit", middleware.RecoverFunc(integrations.MessageTemplateEditHandler))              // 메시지 템플릿 수정
	mux.HandleFunc("/message-templates/delete", middleware.RecoverFunc(integrations.MessageTemplateDeleteHandler))          // 메시지 템플릿 삭제
	mux.HandleFunc("/message-templates/set-default", middleware.RecoverFunc(integrations.MessageTemplateSetDefaultHandler)) // 메시지 템플릿 기본값 설정
	mux.HandleFunc("/error", middleware.RecoverFunc(errorhandler.Handler404))                                               // 에러 페이지

	// 정적 파일 서빙 (CSS, JS, 이미지 등)
	mux.Handle("/static/", http.StripPrefix("/static/", http.FileServer(http.Dir("static"))))

	// 루트 및 404 핸들러를 포함한 핸들러 래퍼 생성
	handler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// 루트 경로는 로그인 페이지로
		if r.URL.Path == "/" {
			middleware.RecoverFunc(login.Handler)(w, r)
			return
		}

		// 등록된 패턴과 매칭되는지 확인
		if _, pattern := mux.Handler(r); pattern == "" {
			// 매칭되는 패턴이 없으면 404
			errorhandler.Handler404(w, r)
			return
		}
		mux.ServeHTTP(w, r)
	})

	// 서버 시작
	port := ":8080"
	log.Printf("서버 시작: http://localhost%s", port)
	if err := http.ListenAndServe(port, handler); err != nil {
		log.Fatal(err)
	}
}
