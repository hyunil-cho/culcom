package integrations

import (
	"backoffice/config"
	"backoffice/database"
	"backoffice/middleware"
	"backoffice/utils"
	"context"
	"crypto/rand"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"time"

	"golang.org/x/oauth2"
	"golang.org/x/oauth2/google"
	"google.golang.org/api/calendar/v3"
	"google.golang.org/api/option"
)

// Handler 연동 관리 목록 페이지 (SSR)
func Handler(w http.ResponseWriter, r *http.Request) {
	// 미들웨어에서 처리한 세션에서 지점 정보 가져오기
	branchCode := middleware.GetSelectedBranch(r)

	// DB에서 해당 지점의 모든 연동 상태 조회
	integrationStatuses, err := database.GetAllIntegrationsByBranch(branchCode)
	if err != nil {
		log.Println("Database error:", err)
		http.Redirect(w, r, "/error", http.StatusSeeOther)
		return
	}

	// 연동 상태를 서비스 카드로 변환
	var services []IntegrationService

	// 구글 캘린더 카드 추가 (DB에서 상태 조회)
	calendarStatus := "not-configured"
	calendarConnected := false
	calConfig, err := database.GetCalendarConfig(branchCode)
	if err == nil && calConfig != nil && calConfig.IsActive {
		calendarStatus = "active"
		calendarConnected = true
	} else if err == nil && calConfig != nil {
		calendarStatus = "inactive"
	}

	services = append(services, IntegrationService{
		ID:          "calendar",
		Name:        "Google Calendar",
		Description: "예약 일정을 구글 캘린더에 자동으로 등록하고 관리합니다.",
		Icon:        "📅",
		Category:    "calendar",
		Status:      calendarStatus,
		Connected:   calendarConnected,
	})

	for _, status := range integrationStatuses {
		var serviceStatus string
		if status.IsConnected {
			serviceStatus = "active"
		} else if status.HasConfig {
			serviceStatus = "inactive" // 설정은 있지만 비활성화
		} else {
			serviceStatus = "not-configured" // 설정 없음
		}

		// DB의 ConfigData에서 서비스 정보 가져오기
		serviceName := ""
		description := ""
		serviceID := ""
		if name, ok := status.ConfigData["service_name"].(string); ok {
			serviceName = name
		}
		if desc, ok := status.ConfigData["description"].(string); ok {
			description = desc
		}
		if id, ok := status.ConfigData["service_id"].(int); ok {
			serviceID = fmt.Sprintf("%d", id)
		}

		// 서비스 타입별 아이콘 설정
		var icon string
		switch status.ServiceType {
		case "SMS":
			icon = "💬"
		default:
			icon = "🔗"
		}

		services = append(services, IntegrationService{
			ID:          serviceID,
			Name:        serviceName,
			Description: description,
			Icon:        icon,
			Category:    status.ServiceType,
			Status:      serviceStatus,
			Connected:   status.IsConnected,
		})
	}

	data := PageData{
		BasePageData: middleware.GetBasePageData(r),
		Title:        "외부 시스템 연동",
		ActiveMenu:   "integrations",
		Services:     services,
	}

	Templates.ExecuteTemplate(w, "integrations/list.html", data)
}

// ConfigureHandler 연동 설정 페이지
func ConfigureHandler(w http.ResponseWriter, r *http.Request) {
	id := r.URL.Query().Get("id")
	branchCode := middleware.GetSelectedBranch(r)

	// ID를 정수로 변환
	var serviceID int
	_, err := fmt.Sscanf(id, "%d", &serviceID)
	if err != nil {
		log.Printf("Invalid service ID: %s", id)
		http.Redirect(w, r, "/integrations", http.StatusSeeOther)
		return
	}

	// DB에서 서비스 정보 조회
	status, err := database.GetIntegrationStatusByServiceID(branchCode, serviceID)
	if err != nil {
		log.Printf("서비스 정보 조회 실패: %v", err)
		http.Redirect(w, r, "/integrations", http.StatusSeeOther)
		return
	}

	// 서비스 정보 구성
	serviceName := ""
	description := ""
	if name, ok := status.ConfigData["service_name"].(string); ok {
		serviceName = name
	}
	if desc, ok := status.ConfigData["description"].(string); ok {
		description = desc
	}

	var icon string
	switch status.ServiceType {
	case "SMS":
		icon = "💬"
	default:
		icon = "🔗"
	}

	service := IntegrationService{
		ID:          id,
		Name:        serviceName,
		Description: description,
		Icon:        icon,
		Category:    status.ServiceType,
		Status:      "not-configured",
		Connected:   status.IsConnected,
	}

	// 마이문자인 경우 설정 정보 조회
	var config *SMSConfig
	if status.ServiceType == "SMS" {
		mymunjaConfig, err := database.GetMymunjaConfig(branchCode, serviceID)
		if err == nil {
			config = &SMSConfig{
				ID:           mymunjaConfig.ConfigSeq,
				Provider:     "마이문자",
				AccountID:    mymunjaConfig.MymunjaID,
				Password:     mymunjaConfig.MymunjaPassword,
				SenderPhones: mymunjaConfig.CallbackNumbers,
				IsActive:     mymunjaConfig.IsActive,
			}
			service.Status = "active"
		} else {
			log.Printf("마이문자 설정 조회 실패 (설정 없음): %v", err)
		}
	}

	data := SMSConfigPageData{
		BasePageData: middleware.GetBasePageData(r),
		Title:        service.Name + " 연동 설정",
		ActiveMenu:   "integrations",
		Service:      service,
		Config:       config,
	}

	Templates.ExecuteTemplate(w, "integrations/sms-config.html", data)
}

// SMSConfigHandler SMS 연동 설정 페이지
func SMSConfigHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method == http.MethodGet {
		// TODO: 실제로는 DB에서 기존 설정을 조회
		var config *SMSConfig

		data := SMSConfigPageData{
			BasePageData: middleware.GetBasePageData(r),
			Title:        "SMS 연동 설정",
			ActiveMenu:   "integrations",
			Service: IntegrationService{
				ID:          "sms",
				Name:        "SMS 서비스",
				Description: "문자 메시지 발송 서비스",
				Icon:        "💬",
				Category:    "sms",
				Status:      "not-configured",
				Connected:   false,
			},
			Config: config,
		}

		Templates.ExecuteTemplate(w, "integrations/sms-config.html", data)
		return
	}

	if r.Method == http.MethodPost {
		// SMS 설정 저장
		err := r.ParseForm()
		if err != nil {
			http.Error(w, "잘못된 요청입니다", http.StatusBadRequest)
			return
		}

		// 폼 데이터 추출
		senderPhones := r.Form["sender_phones[]"]
		_ = SMSConfig{
			Provider:     r.FormValue("provider"),
			AccountID:    r.FormValue("account_id"),
			Password:     r.FormValue("password"),
			SenderPhones: senderPhones,
			IsActive:     r.FormValue("is_active") == "on",
		}

		// TODO: 실제로는 DB에 저장
		// database.SaveSMSConfig(&config)

		// 설정 저장 후 다시 설정 페이지로 리다이렉트
		http.Redirect(w, r, "/integrations/sms-config?success=true", http.StatusSeeOther)
		return
	}

	http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
}

// SMSConfigSaveHandler SMS 설정 저장 핸들러 (SSR - Form POST)
func SMSConfigSaveHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Form 데이터 파싱
	if err := r.ParseForm(); err != nil {
		log.Printf("Form 파싱 오류: %v", err)
		http.Error(w, "잘못된 요청 형식입니다", http.StatusBadRequest)
		return
	}

	// Form 데이터 추출
	accountID := r.FormValue("account_id")
	password := r.FormValue("password")
	senderPhones := r.Form["sender_phones"]
	isActive := r.FormValue("is_active") == "true" || r.FormValue("is_active") == "on"

	// 요청 데이터 로깅
	log.Println("=== SMS 설정 저장 요청 ===")
	log.Printf("계정 ID: %s", accountID)
	log.Printf("비밀번호: %s", utils.MaskPassword(password))
	log.Printf("발신번호: %v", senderPhones)
	log.Printf("활성화: %v", isActive)
	log.Println("========================")

	// 필수 필드 검증
	if accountID == "" || password == "" || len(senderPhones) == 0 {
		log.Println("필수 필드 누락")
		http.Redirect(w, r, "/integrations?error=required_fields", http.StatusSeeOther)
		return
	}

	// 세션에서 선택된 지점 정보 가져오기
	branchCode := middleware.GetSelectedBranch(r)

	// Database를 통해 설정 저장 (지점별)
	if err := database.SaveSMSConfig(branchCode, accountID, password, senderPhones, isActive); err != nil {
		log.Printf("SMS 설정 저장 오류: %v", err)
		http.Redirect(w, r, "/integrations?error=save_failed", http.StatusSeeOther)
		return
	}

	// 성공 시 리다이렉트
	http.Redirect(w, r, "/integrations?success=saved", http.StatusSeeOther)
}

// CalendarConfigHandler 구글 캘린더 설정 페이지 (SSR)
func CalendarConfigHandler(w http.ResponseWriter, r *http.Request) {
	branchCode := middleware.GetSelectedBranch(r)

	// DB에서 구글 캘린더 연동 상태 조회
	calConfig, err := database.GetCalendarConfig(branchCode)

	data := CalendarConfigPageData{
		BasePageData:   middleware.GetBasePageData(r),
		Title:          "Google Calendar 연동",
		ActiveMenu:     "integrations",
		IsActive:       false,
		ConnectedEmail: "",
	}

	if err == nil && calConfig != nil && calConfig.IsActive {
		data.IsActive = true
		data.ConnectedEmail = calConfig.ConnectedEmail
	}

	Templates.ExecuteTemplate(w, "integrations/calendar-config.html", data)
}

// CalendarAuthHandler OAuth 인증 시작
func CalendarAuthHandler(w http.ResponseWriter, r *http.Request) {
	branchCode := middleware.GetSelectedBranch(r)

	// 환경변수에서 OAuth 클라이언트 정보 가져오기
	appConfig := config.GetConfig()
	if appConfig.GoogleOAuth.ClientID == "" || appConfig.GoogleOAuth.ClientSecret == "" {
		http.Error(w, "Google OAuth 설정이 환경변수에 설정되지 않았습니다. 관리자에게 문의하세요.", http.StatusInternalServerError)
		return
	}

	// OAuth2 Config 생성
	oauth2Config := &oauth2.Config{
		ClientID:     appConfig.GoogleOAuth.ClientID,
		ClientSecret: appConfig.GoogleOAuth.ClientSecret,
		RedirectURL:  fmt.Sprintf("%s/api/calendar/callback", getBaseURL(r)),
		Scopes: []string{
			calendar.CalendarScope,                           // 캘린더 읽기/쓰기
			"https://www.googleapis.com/auth/userinfo.email", // 이메일 정보
		},
		Endpoint: google.Endpoint,
	}

	// state 생성 (CSRF 방지)
	state := generateStateToken()

	// 세션에 state 저장
	session, _ := config.SessionStore.Get(r, "auth-session")
	session.Values["oauth_state"] = state
	session.Values["branch_code"] = branchCode
	session.Save(r, w)

	// Google OAuth 인증 URL로 리다이렉트
	authURL := oauth2Config.AuthCodeURL(state, oauth2.AccessTypeOffline, oauth2.ApprovalForce)
	http.Redirect(w, r, authURL, http.StatusTemporaryRedirect)
}

// CalendarCallbackHandler OAuth 콜백 처리
func CalendarCallbackHandler(w http.ResponseWriter, r *http.Request) {
	// state 검증
	session, _ := config.SessionStore.Get(r, "auth-session")
	savedState, ok := session.Values["oauth_state"].(string)
	if !ok {
		http.Error(w, "세션이 만료되었습니다. 다시 시도해주세요.", http.StatusBadRequest)
		return
	}

	state := r.URL.Query().Get("state")
	if state != savedState {
		http.Error(w, "잘못된 요청입니다 (state mismatch)", http.StatusBadRequest)
		return
	}

	branchSeq := middleware.GetSelectedBranch(r)
	if branchSeq == 0 {
		http.Error(w, "세션에서 지점 정보를 찾을 수 없습니다", http.StatusBadRequest)
		return
	}

	// authorization code 가져오기
	code := r.URL.Query().Get("code")
	if code == "" {
		// 사용자가 인증 거부한 경우
		errorMsg := r.URL.Query().Get("error")
		http.Redirect(w, r, fmt.Sprintf("/integrations/calendar-config?error=%s", errorMsg), http.StatusSeeOther)
		return
	}

	// DB에서 OAuth 클라이언트 정보 조회
	appConfig := config.GetConfig()

	// OAuth2 Config 생성
	oauth2Config := &oauth2.Config{
		ClientID:     appConfig.GoogleOAuth.ClientID,
		ClientSecret: appConfig.GoogleOAuth.ClientSecret,
		RedirectURL:  fmt.Sprintf("%s/api/calendar/callback", getBaseURL(r)),
		Scopes: []string{
			calendar.CalendarScope,
			"https://www.googleapis.com/auth/userinfo.email",
		},
		Endpoint: google.Endpoint,
	}

	// authorization code를 access token으로 교환
	ctx := context.Background()
	token, err := oauth2Config.Exchange(ctx, code)
	if err != nil {
		log.Printf("CalendarCallbackHandler - token exchange error: %v", err)
		http.Error(w, "토큰 교환 중 오류가 발생했습니다", http.StatusInternalServerError)
		return
	}

	// 사용자 이메일 정보 가져오기
	client := oauth2Config.Client(ctx, token)
	resp, err := client.Get("https://www.googleapis.com/oauth2/v2/userinfo")
	if err != nil {
		log.Printf("CalendarCallbackHandler - userinfo error: %v", err)
		http.Error(w, "사용자 정보 조회 중 오류가 발생했습니다", http.StatusInternalServerError)
		return
	}
	defer resp.Body.Close()

	var userInfo struct {
		Email string `json:"email"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&userInfo); err != nil {
		log.Printf("CalendarCallbackHandler - userinfo decode error: %v", err)
		http.Error(w, "사용자 정보 파싱 중 오류가 발생했습니다", http.StatusInternalServerError)
		return
	}

	// 토큰을 DB에 저장
	tokenExpiry := token.Expiry.Format("2006-01-02 15:04:05")
	err = database.SaveCalendarTokens(branchSeq, token.AccessToken, token.RefreshToken, tokenExpiry, userInfo.Email)
	if err != nil {
		log.Printf("CalendarCallbackHandler - save tokens error: %v", err)
		http.Error(w, "토큰 저장 중 오류가 발생했습니다", http.StatusInternalServerError)
		return
	}

	// 성공 시 설정 페이지로 리다이렉트
	http.Redirect(w, r, "/integrations/calendar-config?success=true", http.StatusSeeOther)
}

// generateStateToken CSRF 방지용 state 토큰 생성
func generateStateToken() string {
	b := make([]byte, 32)
	rand.Read(b)
	return base64.URLEncoding.EncodeToString(b)
}

// GetCalendarService 구글 캘린더 API 서비스 생성
func GetCalendarService(branchSeq int) (*calendar.Service, error) {
	// DB에서 토큰 정보 조회
	calConfig, err := database.GetCalendarConfig(branchSeq)
	if err != nil || calConfig == nil {
		return nil, fmt.Errorf("calendar config not found")
	}

	if !calConfig.IsActive {
		return nil, fmt.Errorf("calendar integration is not active")
	}

	// OAuth2 토큰 생성
	token := &oauth2.Token{
		AccessToken:  calConfig.AccessToken,
		RefreshToken: calConfig.RefreshToken,
		TokenType:    "Bearer",
	}

	// TokenExpiry 파싱
	if calConfig.TokenExpiry != "" {
		expiry, err := time.Parse("2006-01-02 15:04:05", calConfig.TokenExpiry)
		if err == nil {
			token.Expiry = expiry
		}
	}

	// OAuth2 Config 생성
	appConfig := config.GetConfig()
	oauth2Config := &oauth2.Config{
		ClientID:     appConfig.GoogleOAuth.ClientID,
		ClientSecret: appConfig.GoogleOAuth.ClientSecret,
		Endpoint:     google.Endpoint,
		Scopes:       []string{calendar.CalendarScope},
	}

	// HTTP 클라이언트 생성 (자동으로 토큰 갱신)
	ctx := context.Background()
	client := oauth2Config.Client(ctx, token)

	// Calendar 서비스 생성
	service, err := calendar.NewService(ctx, option.WithHTTPClient(client))
	if err != nil {
		return nil, fmt.Errorf("failed to create calendar service: %v", err)
	}

	return service, nil
}

// getBaseURL 요청에서 기본 URL 추출
func getBaseURL(r *http.Request) string {
	scheme := "http"
	if r.TLS != nil {
		scheme = "https"
	}
	return fmt.Sprintf("%s://%s", scheme, r.Host)
}
