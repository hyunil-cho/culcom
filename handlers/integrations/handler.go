package integrations

import (
	"backoffice/database"
	"backoffice/middleware"
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
		BranchCode: branchCode,
		BranchName: getBranchName(branchCode),
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
		// SMS 설정 조회 및 페이지 렌더링
		// TODO: 실제로는 DB에서 기존 설정을 조회
		var config *SMSConfig
		// 임시로 더미 데이터 사용 (실제 구현 시 DB 조회)
		hasConfig := true // DB에서 설정이 있는지 확인
		if hasConfig {
			config = &SMSConfig{
				ID:           1,
				Provider:     "알리고",
				AccountID:    "testaccount",
				Password:     "••••••••", // 보안상 마스킹
				SenderPhones: []string{"01012345678", "01087654321", "0213334444"},
				IsActive:     true,
				CreatedAt:    "2024-01-10 10:30:00",
				UpdatedAt:    "2024-01-20 15:45:00",
			}
		}

		data := SMSConfigPageData{
			Title:      "SMS 연동 설정",
			ActiveMenu: "integrations",
			Service: IntegrationService{
				ID:          "sms",
				Name:        "SMS 서비스",
				Description: "문자 메시지 발송 서비스",
				Icon:        "💬",
				Category:    "sms",
				Status:      "active",
				Connected:   config != nil && config.IsActive,
			},
			Config: config,
			Providers: []string{
				"알리고",
				"문자나라",
				"비즈톡",
				"카카오 알림톡",
			},
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

// getBranchName - 지점 코드를 한글 이름으로 변환
func getBranchName(code string) string {
	branchNames := map[string]string{
		"gasan":   "가산",
		"gangnam": "강남",
		"hongdae": "홍대",
		"sinchon": "신촌",
	}
	if name, ok := branchNames[code]; ok {
		return name
	}
	return code
}
