package integrations

import (
	"backoffice/config"
	"backoffice/database"
	"backoffice/middleware"
	"backoffice/services/sms"
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

// Handler 연동 관리 목록 페이지
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

// SMSTestHandler SMS 테스트 발송 API
func SMSTestHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// JSON 요청 파싱
	var req sms.SmsSendRequest
	err := json.NewDecoder(r.Body).Decode(&req)
	if err != nil {
		log.Printf("SMS 테스트 요청 파싱 오류: %v", err)
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(sms.SmsSendResponse{
			Success: false,
			Message: "잘못된 요청 형식입니다",
		})
		return
	}

	// 요청 데이터 로깅
	log.Println("=== SMS 테스트 발송 요청 ===")
	log.Printf("환경: %s", config.GetEnvironment())
	log.Printf("계정 ID: %s", req.AccountID)
	log.Printf("비밀번호: %s", maskPassword(req.Password))
	log.Printf("발신번호: %s", req.SenderPhone)
	log.Printf("수신번호: %s", req.ReceiverPhone)
	log.Printf("메시지: %s", req.Message)
	log.Println("========================")

	// SMS 발송 서비스 호출
	sendReq := sms.SendRequest{
		AccountID:     req.AccountID,
		Password:      req.Password,
		SenderPhone:   req.SenderPhone,
		ReceiverPhone: req.ReceiverPhone,
		Message:       req.Message,
		Subject:       "테스트 메시지",
	}

	result, err := sms.Send(sendReq)
	if err != nil {
		log.Printf("SMS 발송 오류: %v", err)
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(sms.SmsSendResponse{
			Success: false,
			Message: err.Error(),
		})
		return
	}

	// 응답 반환
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(sms.SmsSendResponse{
		Success: result.Success,
		Message: result.Message,
	})
}

// SMSConfigSaveHandler SMS 설정 저장 API
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
	log.Printf("비밀번호: %s", maskPassword(password))
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

// ActivateHandler 연동 활성화 API
func ActivateHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// JSON 요청 파싱
	var req struct {
		ServiceID string `json:"service_id"`
	}
	err := json.NewDecoder(r.Body).Decode(&req)
	if err != nil {
		log.Printf("활성화 요청 파싱 오류: %v", err)
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"message": "잘못된 요청 형식입니다",
		})
		return
	}

	// 구글 캘린더는 OAuth 연동 페이지로 리다이렉트
	if req.ServiceID == "calendar" {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success":  false,
			"message":  "구글 캘린더는 연동 설정 페이지에서 OAuth 인증을 진행해주세요",
			"redirect": "/integrations/calendar-config",
		})
		return
	}

	// 서비스 ID를 정수로 변환
	var serviceID int
	_, err = fmt.Sscanf(req.ServiceID, "%d", &serviceID)
	if err != nil {
		log.Printf("유효하지 않은 서비스 ID: %s", req.ServiceID)
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"message": "유효하지 않은 서비스 ID입니다",
		})
		return
	}

	// 세션에서 선택된 지점 정보 가져오기
	branchCode := middleware.GetSelectedBranch(r)

	// Database를 통해 활성화
	if err := database.ActivateIntegration(branchCode, serviceID); err != nil {
		log.Printf("활성화 오류: %v", err)
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"message": "활성화 중 오류가 발생했습니다",
		})
		return
	}

	// 성공 응답
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"message": "활성화되었습니다",
	})
}

// DisconnectHandler 연동 해제 (비활성화) API
func DisconnectHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// JSON 요청 파싱
	var req struct {
		ServiceID string `json:"service_id"`
	}
	err := json.NewDecoder(r.Body).Decode(&req)
	if err != nil {
		log.Printf("연결 해제 요청 파싱 오류: %v", err)
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"message": "잘못된 요청 형식입니다",
		})
		return
	}

	// 구글 캘린더는 별도 해제 로직 사용
	if req.ServiceID == "calendar" {
		branchCode := middleware.GetSelectedBranch(r)
		err := database.DisconnectCalendar(branchCode)
		if err != nil {
			log.Printf("DisconnectHandler - calendar disconnect error: %v", err)
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusInternalServerError)
			json.NewEncoder(w).Encode(map[string]interface{}{
				"success": false,
				"message": "연동 해제 중 오류가 발생했습니다",
			})
			return
		}
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": true,
			"message": "구글 캘린더 연동이 해제되었습니다",
		})
		return
	}

	// 서비스 ID를 정수로 변환
	var serviceID int
	_, err = fmt.Sscanf(req.ServiceID, "%d", &serviceID)
	if err != nil {
		log.Printf("유효하지 않은 서비스 ID: %s", req.ServiceID)
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"message": "유효하지 않은 서비스 ID입니다",
		})
		return
	}

	// 세션에서 선택된 지점 정보 가져오기
	branchCode := middleware.GetSelectedBranch(r)

	// Database를 통해 비활성화
	if err := database.DeactivateIntegration(branchCode, serviceID); err != nil {
		log.Printf("비활성화 오류: %v", err)
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"message": "비활성화 중 오류가 발생했습니다",
		})
		return
	}

	// 성공 응답
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"message": "연결이 해제되었습니다",
	})
}

// maskPassword 비밀번호 마스킹 (로깅용)
func maskPassword(password string) string {
	if len(password) <= 2 {
		return "**"
	}
	return password[:2] + "****"
}

// CalendarConfigHandler 구글 캘린더 설정 페이지
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

	branchCode, ok := session.Values["branch_code"].(string)
	if !ok {
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
	err = database.SaveCalendarTokens(branchCode, token.AccessToken, token.RefreshToken, tokenExpiry, userInfo.Email)
	if err != nil {
		log.Printf("CalendarCallbackHandler - save tokens error: %v", err)
		http.Error(w, "토큰 저장 중 오류가 발생했습니다", http.StatusInternalServerError)
		return
	}

	// 성공 시 설정 페이지로 리다이렉트
	http.Redirect(w, r, "/integrations/calendar-config?success=true", http.StatusSeeOther)
}

// DisconnectCalendarHandler 구글 캘린더 연동 해제
func DisconnectCalendarHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	branchCode := middleware.GetSelectedBranch(r)

	// DB에서 토큰 정보 삭제
	err := database.DisconnectCalendar(branchCode)
	if err != nil {
		log.Printf("DisconnectCalendarHandler - DB error: %v", err)
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"message": "연동 해제 중 오류가 발생했습니다",
		})
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"message": "구글 캘린더 연동이 해제되었습니다",
	})
}

// generateStateToken CSRF 방지용 state 토큰 생성
func generateStateToken() string {
	b := make([]byte, 32)
	rand.Read(b)
	return base64.URLEncoding.EncodeToString(b)
}

// GetCalendarService 구글 캘린더 API 서비스 생성
func GetCalendarService(branchCode string) (*calendar.Service, error) {
	// DB에서 토큰 정보 조회
	calConfig, err := database.GetCalendarConfig(branchCode)
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

// CreateCalendarEventRequest 캘린더 이벤트 생성 요청
type CreateCalendarEventRequest struct {
	CustomerName  string `json:"customer_name"`  // 고객 이름
	PhoneNumber   string `json:"phone_number"`   // 전화번호
	InterviewDate string `json:"interview_date"` // 인터뷰 일시 (YYYY-MM-DD HH:MM:SS)
	Comment       string `json:"comment"`        // 코멘트
	Duration      int    `json:"duration"`       // 소요시간 (분, 기본값 60분)
}

// CreateCalendarEventHandler 구글 캘린더에 이벤트 생성 API
func CreateCalendarEventHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// JSON 요청 파싱
	var req CreateCalendarEventRequest
	err := json.NewDecoder(r.Body).Decode(&req)
	if err != nil {
		log.Printf("CreateCalendarEvent - 요청 파싱 오류: %v", err)
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"message": "잘못된 요청 형식입니다",
		})
		return
	}

	// 세션에서 지점 정보 가져오기
	branchCode := middleware.GetSelectedBranch(r)

	// 캘린더 이벤트 생성
	link, err := CreateCalendarEvent(branchCode, req)
	if err != nil {
		log.Printf("CreateCalendarEvent - 오류: %v", err)
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"message": err.Error(),
		})
		return
	}

	// 성공 응답
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"message": "캘린더 이벤트가 생성되었습니다",
		"link":    link,
	})
}

// CreateCalendarEvent 구글 캘린더 이벤트 생성 (재사용 가능한 함수)
func CreateCalendarEvent(branchCode string, req CreateCalendarEventRequest) (string, error) {
	// 필수 필드 검증
	if req.CustomerName == "" || req.PhoneNumber == "" || req.InterviewDate == "" {
		return "", fmt.Errorf("필수 필드가 누락되었습니다")
	}

	// 소요시간 기본값 설정
	if req.Duration == 0 {
		req.Duration = 60 // 기본 60분
	}

	// 구글 캘린더 서비스 생성
	service, err := GetCalendarService(branchCode)
	if err != nil {
		return "", fmt.Errorf("구글 캘린더가 연동되지 않았습니다")
	}

	// 인터뷰 일시 파싱
	interviewTime, err := time.Parse("2006-01-02 15:04:05", req.InterviewDate)
	if err != nil {
		return "", fmt.Errorf("날짜 형식이 올바르지 않습니다")
	}

	// 종료 시간 계산
	endTime := interviewTime.Add(time.Duration(req.Duration) * time.Minute)

	// 이벤트 설명 구성
	description := fmt.Sprintf("고객명: %s\n전화번호: %s", req.CustomerName, req.PhoneNumber)
	if req.Comment != "" {
		description += fmt.Sprintf("\n메모: %s", req.Comment)
	}

	// 구글 캘린더 이벤트 생성
	event := &calendar.Event{
		Summary:     fmt.Sprintf("상담 예약 - %s", req.CustomerName),
		Description: description,
		Start: &calendar.EventDateTime{
			DateTime: interviewTime.Format(time.RFC3339),
			TimeZone: "Asia/Seoul",
		},
		End: &calendar.EventDateTime{
			DateTime: endTime.Format(time.RFC3339),
			TimeZone: "Asia/Seoul",
		},
	}

	// 이벤트 생성 API 호출
	createdEvent, err := service.Events.Insert("primary", event).Do()
	if err != nil {
		return "", fmt.Errorf("캘린더 이벤트 생성 중 오류가 발생했습니다: %v", err)
	}

	log.Printf("CreateCalendarEvent - 이벤트 생성 완료: %s", createdEvent.Id)
	return createdEvent.HtmlLink, nil
}
