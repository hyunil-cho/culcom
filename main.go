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
	"backoffice/handlers/settings"
	"backoffice/middleware"
	"encoding/gob"
	"html/template"
	"log"
	"net/http"

	_ "backoffice/docs" // Swagger docs

	httpSwagger "github.com/swaggo/http-swagger"
)

// @title           Culcom Backoffice API
// @version         1.0
// @description     컬컴 백오피스 REST API 문서
// @termsOfService  http://swagger.io/terms/

// @contact.name   API Support
// @contact.email  support@culcom.com

// @license.name  Apache 2.0
// @license.url   http://www.apache.org/licenses/LICENSE-2.0.html

// @host      localhost:8080
// @BasePath  /api

// @securityDefinitions.apikey SessionAuth
// @in cookie
// @name user-session

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
	templates = template.Must(templates.ParseGlob("templates/settings/*.html"))
	templates = template.Must(templates.ParseGlob("templates/auth/*.html"))
	templates = template.Must(templates.ParseGlob("templates/error.html"))

	home.Templates = templates
	login.Templates = templates
	customers.Templates = templates
	branches.Templates = templates
	integrations.Templates = templates
	messagetemplates.Templates = templates
	settings.Templates = templates
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

	// 공개 라우트 (인증 불필요)
	mux.HandleFunc("/login", middleware.RecoverFunc(login.LoginHandler)) // 로그인 처리

	// 라우트 설정 (인증 필요한 라우트는 RequireAuthRecover 미들웨어 적용)
	mux.HandleFunc("/dashboard", middleware.RequireAuthRecover(home.Handler))                                                      // 대시보드
	mux.HandleFunc("/api/dashboard/caller-stats", middleware.RequireAuthRecover(home.GetCallerStatsAPI))                           // CALLER별 통계 API
	mux.HandleFunc("/customers", middleware.RequireAuthRecover(customers.Handler))                                                 // 고객 관리
	mux.HandleFunc("/customers/add", middleware.RequireAuthRecover(customers.AddHandler))                                          // 고객 추가
	mux.HandleFunc("/api/customers/comment", middleware.RequireAuthRecover(customers.UpdateCommentHandler))                        // 고객 코멘트 업데이트
	mux.HandleFunc("/api/customers/process-call", middleware.RequireAuthRecover(customers.ProcessCallHandler))                     // 통화 처리 (CALLER 선택 + 통화 횟수 증가)
	mux.HandleFunc("/api/customers/mark-no-phone-interview", middleware.RequireAuthRecover(customers.MarkNoPhoneInterviewHandler)) // 전화상안함 처리
	mux.HandleFunc("/api/customers/reservation", middleware.RequireAuthRecover(customers.CreateReservationHandler))                // 예약 정보 생성
	mux.HandleFunc("/api/customers/update-name", middleware.RequireAuthRecover(customers.UpdateCustomerNameHandler))               // 고객 이름 업데이트
	mux.HandleFunc("/api/customers/delete", middleware.RequireAuthRecover(customers.DeleteCustomerHandler))                        // 고객 삭제 API
	mux.HandleFunc("/api/integrations/check-sms", middleware.RequireAuthRecover(integrations.CheckSMSIntegrationHandler))          // SMS 연동 상태 확인
	mux.HandleFunc("/api/integrations/sms-senders", middleware.RequireAuthRecover(integrations.GetSMSSenderNumbersHandler))        // SMS 발신번호 목록 조회
	mux.HandleFunc("/api/external/customers", customers.ExternalRegisterCustomerHandler)                                           // 외부 고객 등록 API (인증 불필요)
	mux.HandleFunc("/api/service/sms", middleware.RequireAuthRecover(services.SendSMSHandler))                                     // SMS 메시지 전송
	mux.HandleFunc("/api/service/reservation-sms-config", middleware.RequireAuthRecover(services.GetReservationSMSConfigHandler))  // 예약 SMS 설정 조회
	mux.HandleFunc("/branches", middleware.RequireAuthRecover(branches.Handler))                                                   // 지점 관리
	mux.HandleFunc("/branches/detail", middleware.RequireAuthRecover(branches.DetailHandler))                                      // 지점 상세
	mux.HandleFunc("/branches/edit", middleware.RequireAuthRecover(branches.EditHandler))                                          // 지점 수정
	mux.HandleFunc("/branches/add", middleware.RequireAuthRecover(branches.AddHandler))                                            // 지점 추가
	mux.HandleFunc("/branches/delete", middleware.RequireAuthRecover(branches.DeleteHandler))                                      // 지점 삭제
	mux.HandleFunc("/integrations", middleware.RequireAuthRecover(integrations.Handler))                                           // 외부 시스템 연동
	mux.HandleFunc("/integrations/configure", middleware.RequireAuthRecover(integrations.ConfigureHandler))                        // 연동 설정
	mux.HandleFunc("/integrations/manage", middleware.RequireAuthRecover(integrations.ConfigureHandler))                           // 연동 관리 (설정과 동일)
	mux.HandleFunc("/api/external/sms", middleware.RequireAuthRecover(integrations.SMSTestHandler))                                // SMS 테스트 발송 API
	mux.HandleFunc("/api/sms/config", middleware.RequireAuthRecover(integrations.SMSConfigSaveHandler))                            // SMS 설정 저장 API
	mux.HandleFunc("/api/integrations/activate", middleware.RequireAuthRecover(integrations.ActivateHandler))                      // 연동 활성화 API
	mux.HandleFunc("/api/integrations/disconnect", middleware.RequireAuthRecover(integrations.DisconnectHandler))                  // 연동 해제 API
	mux.HandleFunc("/api/calendar/create-event", middleware.RequireAuthRecover(integrations.CreateCalendarEventHandler))           // 구글 캘린더 이벤트 생성 API
	mux.HandleFunc("/message-templates", middleware.RequireAuthRecover(messagetemplates.Handler))                                  // 메시지 템플릿 목록
	mux.HandleFunc("/message-templates/add", middleware.RequireAuthRecover(messagetemplates.AddHandler))                           // 메시지 템플릿 추가
	mux.HandleFunc("/message-templates/edit", middleware.RequireAuthRecover(messagetemplates.EditHandler))                         // 메시지 템플릿 수정
	mux.HandleFunc("/message-templates/delete", middleware.RequireAuthRecover(messagetemplates.DeleteHandler))                     // 메시지 템플릿 삭제
	mux.HandleFunc("/message-templates/set-default", middleware.RequireAuthRecover(messagetemplates.SetDefaultHandler))            // 메시지 템플릿 기본값 설정
	mux.HandleFunc("/settings", middleware.RequireAuthRecover(settings.Handler))                                                   // 설정 메인 페이지
	mux.HandleFunc("/settings/reservation-sms", middleware.RequireAuthRecover(settings.ReservationSMSConfigHandler))               // 예약 SMS 설정
	mux.HandleFunc("/logout", middleware.RequireAuthRecover(login.LogoutHandler))                                                  // 로그아웃 처리
	mux.HandleFunc("/error", middleware.RecoverFunc(errorhandler.Handler404))                                                      // 에러 페이지

	// 정적 파일 서빙 (CSS, JS, 이미지 등)
	mux.Handle("/static/", http.StripPrefix("/static/", http.FileServer(http.Dir("static"))))

	// Swagger UI
	mux.HandleFunc("/swagger/", httpSwagger.WrapHandler)

	// 루트 경로 핸들러 (세션 유무에 따른 리다이렉트)
	mux.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/" {
			// "/" 이외의 경로는 404
			errorhandler.Handler404(w, r)
			return
		}

		// 세션 확인
		session, err := config.SessionStore.Get(r, "user-session")
		if err != nil || session.Values["user_id"] == nil {
			// 세션이 없으면 로그인 페이지로
			http.Redirect(w, r, "/login", http.StatusSeeOther)
			return
		}

		// 세션이 있으면 대시보드로
		http.Redirect(w, r, "/dashboard", http.StatusSeeOther)
	})

	// 서버 설정 가져오기
	cfg := config.GetConfig()
	port := ":" + cfg.Server.Port

	// TLS 활성화 여부에 따라 서버 시작
	if cfg.Server.TLSEnabled {
		log.Printf("HTTPS 서버 시작: https://localhost%s", port)
		log.Printf("인증서: %s", cfg.Server.TLSCertFile)
		log.Printf("개인키: %s", cfg.Server.TLSKeyFile)
		if err := http.ListenAndServeTLS(port, cfg.Server.TLSCertFile, cfg.Server.TLSKeyFile, mux); err != nil {
			log.Fatal(err)
		}
	} else {
		log.Printf("HTTP 서버 시작: http://localhost%s", port)
		if err := http.ListenAndServe(port, mux); err != nil {
			log.Fatal(err)
		}
	}
}
