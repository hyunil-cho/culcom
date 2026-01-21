package integrations

import (
	"net/http"
)

// Handler 연동 관리 목록 페이지
func Handler(w http.ResponseWriter, r *http.Request) {
	data := PageData{
		Title:      "외부 시스템 연동",
		ActiveMenu: "integrations",
		Services: []IntegrationService{
			{
				ID:          "gmail",
				Name:        "Google Gmail",
				Description: "Gmail API를 통한 이메일 발송 및 수신",
				Icon:        "📧",
				Category:    "email",
				Status:      "active",
				Connected:   true,
			},
			{
				ID:          "sms",
				Name:        "SMS 서비스",
				Description: "문자 메시지 발송 서비스",
				Icon:        "💬",
				Category:    "sms",
				Status:      "active",
				Connected:   true,
			},
			{
				ID:          "slack",
				Name:        "Slack",
				Description: "팀 협업 및 알림 전송",
				Icon:        "💼",
				Category:    "collaboration",
				Status:      "inactive",
				Connected:   false,
			},
			{
				ID:          "aws-s3",
				Name:        "AWS S3",
				Description: "파일 저장 및 관리",
				Icon:        "☁️",
				Category:    "storage",
				Status:      "not-configured",
				Connected:   false,
			},
			{
				ID:          "kakao",
				Name:        "카카오톡 알림",
				Description: "카카오톡 비즈니스 메시지",
				Icon:        "💛",
				Category:    "messaging",
				Status:      "not-configured",
				Connected:   false,
			},
			{
				ID:          "payment",
				Name:        "결제 시스템",
				Description: "PG사 연동 결제 처리",
				Icon:        "💳",
				Category:    "payment",
				Status:      "active",
				Connected:   true,
			},
		},
	}

	Templates.ExecuteTemplate(w, "integrations/list.html", data)
}

// ConfigureHandler 연동 설정 페이지
func ConfigureHandler(w http.ResponseWriter, r *http.Request) {
	id := r.URL.Query().Get("id")

	// 서비스 정보 가져오기 (실제로는 DB에서 조회)
	var service IntegrationService
	switch id {
	case "gmail":
		service = IntegrationService{
			ID:          "gmail",
			Name:        "Google Gmail",
			Description: "Gmail API를 통한 이메일 발송 및 수신",
			Icon:        "📧",
			Category:    "email",
			Status:      "active",
			Connected:   true,
		}
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
	case "slack":
		service = IntegrationService{
			ID:          "slack",
			Name:        "Slack",
			Description: "팀 협업 및 알림 전송",
			Icon:        "💼",
			Category:    "collaboration",
			Status:      "inactive",
			Connected:   false,
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
