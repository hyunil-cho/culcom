package integrations

import (
	"backoffice/config"
	"backoffice/database"
	"backoffice/middleware"
	"backoffice/services/sms"
	"encoding/json"
	"log"
	"net/http"
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
	for _, status := range integrationStatuses {
		var serviceStatus string
		if status.IsConnected {
			serviceStatus = "active"
		} else {
			serviceStatus = "not-configured"
		}

		var serviceName, description, icon string
		switch status.ServiceType {
		case "sms":
			serviceName = "SMS 서비스"
			description = "문자 메시지 발송 서비스"
			icon = "💬"
		default:
			serviceName = status.ServiceType
			description = "외부 연동 서비스"
			icon = "🔗"
		}

		services = append(services, IntegrationService{
			ID:          status.ServiceType,
			Name:        serviceName,
			Description: description,
			Icon:        icon,
			Category:    status.ServiceType,
			Status:      serviceStatus,
			Connected:   status.IsConnected,
		})
	}

	data := PageData{
		Title:      "외부 시스템 연동",
		ActiveMenu: "integrations",
		Services:   services,
	}

	Templates.ExecuteTemplate(w, "integrations/list.html", data)
}

// ConfigureHandler 연동 설정 페이지
func ConfigureHandler(w http.ResponseWriter, r *http.Request) {
	id := r.URL.Query().Get("id")

	// 서비스 정보 가져오기 (실제로는 DB에서 조회)
	var service IntegrationService
	switch id {
	case "sms":
		service = IntegrationService{
			ID:          "sms",
			Name:        "SMS 서비스",
			Description: "문자 메시지 발송 서비스",
			Icon:        "💬",
			Category:    "sms",
			Status:      "active",
			Connected:   true,
		}
	default:
		service = IntegrationService{
			ID:          id,
			Name:        "알 수 없는 서비스",
			Description: "서비스 정보를 찾을 수 없습니다",
			Icon:        "❓",
			Category:    "unknown",
			Status:      "not-configured",
			Connected:   false,
		}
	}

	data := struct {
		Title      string
		ActiveMenu string
		Service    IntegrationService
	}{
		Title:      service.Name + " 연동 설정",
		ActiveMenu: "integrations",
		Service:    service,
	}

	Templates.ExecuteTemplate(w, "integrations/configure.html", data)
}

// SMSConfigHandler SMS 연동 설정 페이지
func SMSConfigHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method == http.MethodGet {
		// TODO: 실제로는 DB에서 기존 설정을 조회
		var config *SMSConfig

		data := SMSConfigPageData{
			Title:      "SMS 연동 설정",
			ActiveMenu: "integrations",
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

	// Database를 통해 설정 저장
	if err := database.SaveSMSConfig(accountID, password, senderPhones, isActive); err != nil {
		log.Printf("SMS 설정 저장 오류: %v", err)
		http.Redirect(w, r, "/integrations?error=save_failed", http.StatusSeeOther)
		return
	}

	// 성공 시 리다이렉트
	http.Redirect(w, r, "/integrations?success=saved", http.StatusSeeOther)
}

// maskPassword 비밀번호 마스킹 (로깅용)
func maskPassword(password string) string {
	if len(password) <= 2 {
		return "**"
	}
	return password[:2] + "****"
}
