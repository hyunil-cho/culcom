package main

import (
	"backoffice/config"
	"backoffice/database"
	"backoffice/handlers/branches"
	"backoffice/handlers/customers"
	"backoffice/handlers/errorhandler"
	"backoffice/handlers/home"
	"backoffice/handlers/integrations"
	"backoffice/handlers/login"
	"backoffice/handlers/messagetemplates"
	"backoffice/handlers/services"
	"backoffice/middleware"
	"encoding/gob"
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
	templates = template.Must(templates.ParseGlob("templates/message-templates/*.html"))
	templates = template.Must(templates.ParseGlob("templates/auth/*.html"))
	templates = template.Must(templates.ParseGlob("templates/error.html"))

	home.Templates = templates
	login.Templates = templates
	customers.Templates = templates
	branches.Templates = templates
	integrations.Templates = templates
	messagetemplates.Templates = templates
	errorhandler.Templates = templates
}

func main() {
	// 환경 설정 초기화
	if err := config.Init(); err != nil {
		log.Fatalf("설정 초기화 실패: %v", err)
	}

	// 데이터베이스 연결 초기화
	if err := database.Init(); err != nil {
		log.Fatalf("데이터베이스 연결 실패: %v", err)
	}
	defer database.Close()

	// 세션 초기화
	config.InitSession()

	// gob 타입 등록 (세션에 복잡한 타입 저장을 위해)
	gob.Register([]map[string]string{})
	gob.Register(map[string]string{})

	// 커스텀 ServeMux 생성 (404 핸들러 설정을 위해)
	mux := http.NewServeMux()

	// 라우트 설정 (인증 필요한 라우트는 RequireAuthRecover 미들웨어 적용)
	mux.HandleFunc("/dashboard", middleware.RequireAuthRecover(home.Handler))                                           // 대시보드
	mux.HandleFunc("/customers", middleware.RequireAuthRecover(customers.Handler))                                      // 고객 관리
	mux.HandleFunc("/customers/edit", middleware.RequireAuthRecover(customers.EditHandler))                             // 고객 수정
	mux.HandleFunc("/customers/add", middleware.RequireAuthRecover(customers.AddHandler))                               // 고객 추가
	mux.HandleFunc("/api/customers/comment", middleware.RequireAuthRecover(customers.UpdateCommentHandler))             // 고객 코멘트 업데이트
	mux.HandleFunc("/api/customers/increment-call", middleware.RequireAuthRecover(customers.IncrementCallCountHandler)) // 고객 통화 횟수 증가
	mux.HandleFunc("/api/customers/reservation", middleware.RequireAuthRecover(customers.CreateReservationHandler))     // 예약 정보 생성
	mux.HandleFunc("/api/customers/update-name", middleware.RequireAuthRecover(customers.UpdateCustomerNameHandler))    // 고객 이름 업데이트
	mux.HandleFunc("/api/customers/check-sms", middleware.RequireAuthRecover(customers.CheckSMSIntegrationHandler))     // SMS 연동 상태 확인
	mux.HandleFunc("/api/customers/sms-senders", middleware.RequireAuthRecover(customers.GetSMSSenderNumbersHandler))   // SMS 발신번호 목록 조회
	mux.HandleFunc("/api/service/sms", middleware.RequireAuthRecover(services.SendSMSHandler))                          // SMS 메시지 전송
	mux.HandleFunc("/branches", middleware.RequireAuthRecover(branches.Handler))                                        // 지점 관리
	mux.HandleFunc("/branches/detail", middleware.RequireAuthRecover(branches.DetailHandler))                           // 지점 상세
	mux.HandleFunc("/branches/edit", middleware.RequireAuthRecover(branches.EditHandler))                               // 지점 수정
	mux.HandleFunc("/branches/add", middleware.RequireAuthRecover(branches.AddHandler))                                 // 지점 추가
	mux.HandleFunc("/branches/delete", middleware.RequireAuthRecover(branches.DeleteHandler))                           // 지점 삭제
	mux.HandleFunc("/integrations", middleware.RequireAuthRecover(integrations.Handler))                                // 외부 시스템 연동
	mux.HandleFunc("/integrations/configure", middleware.RequireAuthRecover(integrations.ConfigureHandler))             // 연동 설정
	mux.HandleFunc("/integrations/manage", middleware.RequireAuthRecover(integrations.ConfigureHandler))                // 연동 관리 (설정과 동일)
	mux.HandleFunc("/integrations/sms-config", middleware.RequireAuthRecover(integrations.SMSConfigHandler))            // SMS 연동 설정
	mux.HandleFunc("/api/external/sms", middleware.RequireAuthRecover(integrations.SMSTestHandler))                     // SMS 테스트 발송 API
	mux.HandleFunc("/api/sms/config", middleware.RequireAuthRecover(integrations.SMSConfigSaveHandler))                 // SMS 설정 저장 API
	mux.HandleFunc("/api/integrations/activate", middleware.RequireAuthRecover(integrations.ActivateHandler))           // 연동 활성화 API
	mux.HandleFunc("/api/integrations/disconnect", middleware.RequireAuthRecover(integrations.DisconnectHandler))       // 연동 해제 API
	mux.HandleFunc("/message-templates", middleware.RequireAuthRecover(messagetemplates.Handler))                       // 메시지 템플릿 목록
	mux.HandleFunc("/message-templates/add", middleware.RequireAuthRecover(messagetemplates.AddHandler))                // 메시지 템플릿 추가
	mux.HandleFunc("/message-templates/edit", middleware.RequireAuthRecover(messagetemplates.EditHandler))              // 메시지 템플릿 수정
	mux.HandleFunc("/message-templates/delete", middleware.RequireAuthRecover(messagetemplates.DeleteHandler))          // 메시지 템플릿 삭제
	mux.HandleFunc("/message-templates/set-default", middleware.RequireAuthRecover(messagetemplates.SetDefaultHandler)) // 메시지 템플릿 기본값 설정
	mux.HandleFunc("/login", middleware.RecoverFunc(login.LoginHandler))                                                // 로그인 처리 (인증 불필요)
	mux.HandleFunc("/logout", middleware.RequireAuthRecover(login.LogoutHandler))                                       // 로그아웃 처리
	mux.HandleFunc("/error", middleware.RecoverFunc(errorhandler.Handler404))                                           // 에러 페이지

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
