package main

import (
	"backoffice/config"
	"backoffice/database"
	"backoffice/handlers/complex/attendance"
	"backoffice/handlers/complex/classtimeslots"
	"backoffice/handlers/complex/index"
	"backoffice/handlers/complex/management"
	"backoffice/handlers/complex/memberships"
	complexSurvey "backoffice/handlers/complex/survey"
	"backoffice/handlers/errorhandler"
	"backoffice/handlers/main/board"
	"backoffice/handlers/main/branches"
	"backoffice/handlers/main/consultation"
	"backoffice/handlers/main/customers"
	"backoffice/handlers/main/home"
	"backoffice/handlers/main/integrations"
	"backoffice/handlers/main/landing"
	"backoffice/handlers/main/login"
	"backoffice/handlers/main/messagetemplates"
	"backoffice/handlers/main/notices"
	"backoffice/handlers/main/opens"
	"backoffice/handlers/main/services"
	"backoffice/handlers/main/settings"
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
	funcMap := template.FuncMap{
		"add": func(a, b int) int {
			return a + b
		},
		"sub": func(a, b int) int {
			return a - b
		},
		"seq": func(start, end int) []int {
			s := make([]int, 0)
			for i := start; i <= end; i++ {
				s = append(s, i)
			}
			return s
		},
	}

	templates := template.Must(template.New("").Funcs(funcMap).ParseGlob("templates/layouts/*.html"))
	templates = template.Must(templates.ParseGlob("templates/main/dashboard/*.html"))
	templates = template.Must(templates.ParseGlob("templates/main/customers/*.html"))
	templates = template.Must(templates.ParseGlob("templates/main/branches/*.html"))
	templates = template.Must(templates.ParseGlob("templates/main/integrations/*.html"))
	templates = template.Must(templates.ParseGlob("templates/main/message-templates/*.html"))
	templates = template.Must(templates.ParseGlob("templates/main/settings/*.html"))
	templates = template.Must(templates.ParseGlob("templates/main/auth/*.html"))
	templates = template.Must(templates.ParseGlob("templates/main/landing/*.html"))
	templates = template.Must(templates.ParseGlob("templates/main/consultation/*.html"))
	templates = template.Must(templates.ParseGlob("templates/main/notices/*.html"))
	templates = template.Must(templates.ParseGlob("templates/main/privacy/*.html"))
	templates = template.Must(templates.ParseGlob("templates/complex/classtimeslots/*.html"))
	templates = template.Must(templates.ParseGlob("templates/complex/memberships/*.html"))
	templates = template.Must(templates.ParseGlob("templates/complex/attendance/*.html"))
	templates = template.Must(templates.ParseGlob("templates/complex/management/*.html"))
	templates = template.Must(templates.ParseGlob("templates/complex/members/*.html"))
	templates = template.Must(templates.ParseGlob("templates/complex/staffs/*.html"))
	templates = template.Must(templates.ParseGlob("templates/complex/postponements/*.html"))
	templates = template.Must(templates.ParseGlob("templates/complex/index/*.html"))
	templates = template.Must(templates.ParseGlob("templates/complex/survey/*.html"))
	templates = template.Must(templates.ParseGlob("templates/main/error.html"))

	home.Templates = templates
	login.Templates = templates
	customers.Templates = templates
	branches.Templates = templates
	integrations.Templates = templates
	messagetemplates.Templates = templates
	settings.Templates = templates
	errorhandler.Templates = templates
	landing.Templates = templates
	consultation.Templates = templates
	notices.Templates = templates
	index.Templates = templates
	management.Templates = templates
	classtimeslots.Templates = templates
	attendance.Templates = templates
	memberships.Templates = templates
	complexSurvey.Templates = templates

	publicFuncMap := template.FuncMap{
		"add": func(a, b int) int { return a + b },
		"sub": func(a, b int) int { return a - b },
	}
	board.PublicTemplates = template.Must(template.New("").Funcs(publicFuncMap).ParseGlob("templates/main/board/*.html"))

	opens.InitPrivacyTemplate()
	opens.PostponementTemplates = template.Must(template.New("").ParseGlob("templates/main/privacy/*.html"))
	opens.MembershipCheckTemplates = template.Must(template.New("").ParseGlob("templates/main/membership/*.html"))
	opens.RefundTemplates = template.Must(template.New("").ParseGlob("templates/main/refund/*.html"))
}

// registerPublicRoutes 인증이 필요 없는 공개 라우트를 등록합니다.
func registerPublicRoutes(mux *http.ServeMux) {
	// /api
	mux.HandleFunc("/api/external/customers", opens.ExternalRegisterCustomerHandler)

	// /board
	mux.HandleFunc("/board", middleware.RecoverFunc(board.ListHandler))
	mux.HandleFunc("/board/detail", middleware.RecoverFunc(board.DetailHandler))
	mux.HandleFunc("/board/kakao/callback", middleware.RecoverFunc(board.KakaoCallbackHandler))
	mux.HandleFunc("/board/kakao/login", middleware.RecoverFunc(board.KakaoLoginHandler))
	mux.HandleFunc("/board/kakao/success", middleware.RecoverFunc(board.KakaoRegistrationSuccessHandler))
	mux.HandleFunc("/board/logout", middleware.RecoverFunc(board.BoardLogoutHandler))
	mux.HandleFunc("/board/mypage", middleware.RecoverFunc(board.MypageHandler))
	mux.HandleFunc("/board/withdraw", middleware.RecoverFunc(board.WithdrawHandler))

	// /complex (공개)
	mux.HandleFunc("/complex/membership", opens.MembershipCheckHandler)
	mux.HandleFunc("/complex/membership/result", opens.MembershipResultHandler)
	mux.HandleFunc("/complex/postponement", opens.PostponementHandler)
	mux.HandleFunc("/api/postponement/submit", opens.PostponementSubmitHandler)
	mux.HandleFunc("/api/postponement/search-member", opens.PostponementSearchMemberHandler)
	mux.HandleFunc("/api/postponement/reasons", opens.PostponementReasonsAPIHandler)
	mux.HandleFunc("/complex/refund", middleware.RecoverFunc(opens.RefundHandler))
	mux.HandleFunc("/api/refund/search-member", opens.RefundSearchMemberHandler)
	mux.HandleFunc("/api/refund/submit", opens.RefundSubmitHandler)
	mux.HandleFunc("/complex/survey", middleware.RecoverFunc(consultation.SurveyHandler))

	// /consultation (공개)
	mux.HandleFunc("/consultation/success", middleware.RecoverFunc(consultation.SuccessHandler))
	mux.HandleFunc("/consultation/survey/submit", middleware.RecoverFunc(consultation.SurveySubmitHandler))

	// 기타
	mux.HandleFunc("/login", middleware.RecoverFunc(login.LoginHandler))
	mux.HandleFunc("/privacy", opens.PrivacyPolicyHandler)
}

// registerComplexRoutes /complex 접두사를 가진 인증 필요 라우트를 등록합니다.
func registerComplexRoutes(mux *http.ServeMux) {
	mux.HandleFunc("/complex", middleware.RequireAuthRecover(middleware.InjectBranchData(index.Handler)))

	// /complex/attendance
	mux.HandleFunc("/complex/attendance", middleware.RequireAuthRecover(middleware.InjectBranchData(attendance.Handler)))
	mux.HandleFunc("/complex/attendance/detail", middleware.RequireAuthRecover(middleware.InjectBranchData(attendance.DetailHandler)))

	// /complex/classes
	mux.HandleFunc("/complex/classes", middleware.RequireAuthRecover(middleware.InjectBranchData(management.Handler)))
	mux.HandleFunc("/complex/classes/add", middleware.RequireAuthRecover(middleware.InjectBranchData(management.AddHandler)))
	mux.HandleFunc("/complex/classes/edit", middleware.RequireAuthRecover(middleware.InjectBranchData(management.EditHandler)))
	mux.HandleFunc("/complex/classes/update", middleware.RequireAuthRecover(middleware.InjectBranchData(management.UpdateHandler)))
	mux.HandleFunc("/complex/classes/delete", middleware.RequireAuthRecover(middleware.InjectBranchData(management.DeleteHandler)))

	// /complex/members
	mux.HandleFunc("/complex/members", middleware.RequireAuthRecover(middleware.InjectBranchData(management.MemberListHandler)))
	mux.HandleFunc("/complex/members/add", middleware.RequireAuthRecover(middleware.InjectBranchData(management.MemberAddHandler)))
	mux.HandleFunc("/complex/members/edit", middleware.RequireAuthRecover(middleware.InjectBranchData(management.MemberEditHandler)))
	mux.HandleFunc("/complex/members/update", middleware.RequireAuthRecover(middleware.InjectBranchData(management.MemberUpdateHandler)))
	mux.HandleFunc("/complex/members/delete", middleware.RequireAuthRecover(middleware.InjectBranchData(management.MemberDeleteHandler)))
	mux.HandleFunc("/api/complex/members/memberships", middleware.RequireAuthRecover(management.MemberMembershipsAPIHandler))

	// /complex/memberships
	mux.HandleFunc("/complex/memberships", middleware.RequireAuthRecover(middleware.InjectBranchData(memberships.ListHandler)))
	mux.HandleFunc("/complex/memberships/add", middleware.RequireAuthRecover(middleware.InjectBranchData(memberships.AddHandler)))
	mux.HandleFunc("/complex/memberships/delete", middleware.RequireAuthRecover(memberships.DeleteHandler))
	mux.HandleFunc("/complex/memberships/edit", middleware.RequireAuthRecover(middleware.InjectBranchData(memberships.EditHandler)))

	// /complex/postponements
	mux.HandleFunc("/complex/postponements", middleware.RequireAuthRecover(middleware.InjectBranchData(management.PostponementListHandler)))
	mux.HandleFunc("/complex/postponements/reasons", middleware.RequireAuthRecover(middleware.InjectBranchData(management.PostponementReasonListHandler)))
	mux.HandleFunc("/complex/postponements/reasons/add", middleware.RequireAuthRecover(middleware.InjectBranchData(management.PostponementReasonAddHandler)))
	mux.HandleFunc("/complex/postponements/reasons/delete", middleware.RequireAuthRecover(management.PostponementReasonDeleteHandler))
	mux.HandleFunc("/complex/postponements/reasons/label/delete", middleware.RequireAuthRecover(management.PostponementReasonLabelDeleteHandler))
	mux.HandleFunc("/complex/postponements/update-status", middleware.RequireAuthRecover(management.PostponementUpdateStatusHandler))

	// /complex/refunds
	mux.HandleFunc("/complex/refunds", middleware.RequireAuthRecover(middleware.InjectBranchData(management.RefundListHandler)))
	mux.HandleFunc("/complex/refunds/update-status", middleware.RequireAuthRecover(management.RefundUpdateStatusHandler))

	// /complex/staffs
	mux.HandleFunc("/complex/staffs", middleware.RequireAuthRecover(middleware.InjectBranchData(management.StaffListHandler)))
	mux.HandleFunc("/complex/staffs/add", middleware.RequireAuthRecover(middleware.InjectBranchData(management.StaffAddHandler)))
	mux.HandleFunc("/complex/staffs/edit", middleware.RequireAuthRecover(middleware.InjectBranchData(management.StaffEditHandler)))
	mux.HandleFunc("/complex/staffs/update", middleware.RequireAuthRecover(middleware.InjectBranchData(management.StaffUpdateHandler)))
	mux.HandleFunc("/complex/staffs/delete", middleware.RequireAuthRecover(middleware.InjectBranchData(management.StaffDeleteHandler)))

	// /complex/survey (관리자)
	mux.HandleFunc("/complex/survey/options", middleware.RequireAuthRecover(middleware.InjectBranchData(complexSurvey.OptionsHandler)))
	mux.HandleFunc("/complex/survey/options/add", middleware.RequireAuthRecover(complexSurvey.AddOptionHandler))
	mux.HandleFunc("/complex/survey/options/delete", middleware.RequireAuthRecover(complexSurvey.DeleteOptionHandler))
	mux.HandleFunc("/complex/survey/options/type", middleware.RequireAuthRecover(complexSurvey.UpdateTypeHandler))

	// /complex/timeslots
	mux.HandleFunc("/complex/timeslots", middleware.RequireAuthRecover(middleware.InjectBranchData(classtimeslots.Handler)))
	mux.HandleFunc("/complex/timeslots/add", middleware.RequireAuthRecover(middleware.InjectBranchData(classtimeslots.AddHandler)))
	mux.HandleFunc("/complex/timeslots/delete", middleware.RequireAuthRecover(middleware.InjectBranchData(classtimeslots.DeleteHandler)))
	mux.HandleFunc("/complex/timeslots/edit", middleware.RequireAuthRecover(middleware.InjectBranchData(classtimeslots.EditHandler)))
}

// registerAuthRoutes /complex 이외의 인증 필요 라우트를 등록합니다.
func registerAuthRoutes(mux *http.ServeMux) {
	// /api
	mux.HandleFunc("/api/calendar/create-event", middleware.RequireAuthRecover(integrations.CreateCalendarEventHandler))
	mux.HandleFunc("/api/customers/comment", middleware.RequireAuthRecover(customers.UpdateCommentHandler))
	mux.HandleFunc("/api/customers/delete", middleware.RequireAuthRecover(customers.DeleteCustomerHandler))
	mux.HandleFunc("/api/customers/mark-no-phone-interview", middleware.RequireAuthRecover(customers.MarkNoPhoneInterviewHandler))
	mux.HandleFunc("/api/customers/process-call", middleware.RequireAuthRecover(customers.ProcessCallHandler))
	mux.HandleFunc("/api/customers/reservation", middleware.RequireAuthRecover(customers.CreateReservationHandler))
	mux.HandleFunc("/api/customers/update-name", middleware.RequireAuthRecover(customers.UpdateCustomerNameHandler))
	mux.HandleFunc("/api/dashboard/caller-stats", middleware.RequireAuthRecover(home.GetCallerStatsAPI))
	mux.HandleFunc("/api/external/sms", middleware.RequireAuthRecover(integrations.SMSTestHandler))
	mux.HandleFunc("/api/integrations/activate", middleware.RequireAuthRecover(integrations.ActivateHandler))
	mux.HandleFunc("/api/integrations/check-sms", middleware.RequireAuthRecover(integrations.CheckSMSIntegrationHandler))
	mux.HandleFunc("/api/integrations/disconnect", middleware.RequireAuthRecover(integrations.DisconnectHandler))
	mux.HandleFunc("/api/integrations/sms-senders", middleware.RequireAuthRecover(integrations.GetSMSSenderNumbersHandler))
	mux.HandleFunc("/api/complex/survey/submissions", middleware.RequireAuthRecover(consultation.SurveySubmissionsAPIHandler))
	mux.HandleFunc("/api/message-templates", middleware.RequireAuthRecover(messagetemplates.GetTemplatesAPI))
	mux.HandleFunc("/api/service/reservation-sms-config", middleware.RequireAuthRecover(services.GetReservationSMSConfigHandler))
	mux.HandleFunc("/api/service/sms", middleware.RequireAuthRecover(services.SendSMSHandler))
	mux.HandleFunc("/api/sms/config", middleware.RequireAuthRecover(integrations.SMSConfigSaveHandler))

	// /branches
	mux.HandleFunc("/branches", middleware.RequireAuthRecover(middleware.InjectBranchData(branches.Handler)))
	mux.HandleFunc("/branches/add", middleware.RequireAuthRecover(middleware.InjectBranchData(branches.AddHandler)))
	mux.HandleFunc("/branches/delete", middleware.RequireAuthRecover(branches.DeleteHandler))
	mux.HandleFunc("/branches/detail", middleware.RequireAuthRecover(middleware.InjectBranchData(branches.DetailHandler)))
	mux.HandleFunc("/branches/edit", middleware.RequireAuthRecover(middleware.InjectBranchData(branches.EditHandler)))

	// /customers
	mux.HandleFunc("/customers", middleware.RequireAuthRecover(middleware.InjectBranchData(customers.Handler)))
	mux.HandleFunc("/customers/add", middleware.RequireAuthRecover(middleware.InjectBranchData(customers.AddHandler)))

	// /dashboard
	mux.HandleFunc("/dashboard", middleware.RequireAuthRecover(middleware.InjectBranchData(home.Handler)))

	// /error
	mux.HandleFunc("/error", middleware.RecoverFunc(errorhandler.Handler404))

	// /integrations
	mux.HandleFunc("/integrations", middleware.RequireAuthRecover(middleware.InjectBranchData(integrations.Handler)))
	mux.HandleFunc("/integrations/configure", middleware.RequireAuthRecover(middleware.InjectBranchData(integrations.ConfigureHandler)))
	mux.HandleFunc("/integrations/kakao-sync", middleware.RequireAuthRecover(middleware.InjectBranchData(integrations.KakaoSyncHandler)))
	mux.HandleFunc("/integrations/manage", middleware.RequireAuthRecover(middleware.InjectBranchData(integrations.ConfigureHandler)))

	// /logout
	mux.HandleFunc("/logout", middleware.RequireAuthRecover(login.LogoutHandler))

	// /message-templates
	mux.HandleFunc("/message-templates", middleware.RequireAuthRecover(middleware.InjectBranchData(messagetemplates.Handler)))
	mux.HandleFunc("/message-templates/add", middleware.RequireAuthRecover(middleware.InjectBranchData(messagetemplates.AddHandler)))
	mux.HandleFunc("/message-templates/delete", middleware.RequireAuthRecover(messagetemplates.DeleteHandler))
	mux.HandleFunc("/message-templates/edit", middleware.RequireAuthRecover(middleware.InjectBranchData(messagetemplates.EditHandler)))
	mux.HandleFunc("/message-templates/set-default", middleware.RequireAuthRecover(messagetemplates.SetDefaultHandler))

	// /notices
	mux.HandleFunc("/notices", middleware.RequireAuthRecover(middleware.InjectBranchData(notices.Handler)))
	mux.HandleFunc("/notices/add", middleware.RequireAuthRecover(middleware.InjectBranchData(notices.AddHandler)))
	mux.HandleFunc("/notices/delete", middleware.RequireAuthRecover(notices.DeleteHandler))
	mux.HandleFunc("/notices/detail", middleware.RequireAuthRecover(middleware.InjectBranchData(notices.DetailHandler)))
	mux.HandleFunc("/notices/edit", middleware.RequireAuthRecover(middleware.InjectBranchData(notices.EditHandler)))

	// /settings
	mux.HandleFunc("/settings", middleware.RequireAuthRecover(middleware.InjectBranchData(settings.Handler)))
	mux.HandleFunc("/settings/reservation-sms", middleware.RequireAuthRecover(middleware.InjectBranchData(settings.ReservationSMSConfigHandler)))
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

	registerPublicRoutes(mux)
	registerComplexRoutes(mux)
	registerAuthRoutes(mux)

	// 정적 파일 서빙 (CSS, JS, 이미지 등)
	mux.Handle("/static/", http.StripPrefix("/static/", http.FileServer(http.Dir("static"))))

	// Swagger UI
	mux.HandleFunc("/swagger/", httpSwagger.WrapHandler)

	// 루트 경로 핸들러 - 공개 게시판 (공지사항/이벤트)
	mux.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/" {
			errorhandler.Handler404(w, r)
			return
		}
		board.ListHandler(w, r)
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
