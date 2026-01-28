package integrations

import (
	"backoffice/config"
	"backoffice/database"
	"backoffice/middleware"
	"backoffice/services/sms"
	"encoding/json"
	"fmt"
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
