package integrations

import (
	"backoffice/database"
	"backoffice/middleware"
	"backoffice/services/sms"
	"backoffice/utils"
	"fmt"
	"log"
	"net/http"
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
				UpdatedAt:    utils.FormatDateTime(mymunjaConfig.LastUpdateDate),
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

	// 기존 설정 확인 (최초 생성 여부 판단)
	existingConfig, err := database.GetSMSConfig(branchCode)
	isNewConfig := (err != nil || existingConfig == nil)

	// 최초 생성인 경우, 마이문자 API를 호출하여 SMS/LMS 잔여건수 조회
	var remainingCountSMSPtr, remainingCountLMSPtr *int
	if isNewConfig {
		log.Println("최초 마이문자 연동 설정 - 잔여건수 조회 시작")
		remainingCountSMS, remainingCountLMS, err := sms.CheckRemainingCount(accountID, password)
		if err != nil {
			log.Printf("잔여건수 조회 실패 (설정은 계속 저장됨): %v", err)
			// 잔여건수 조회 실패해도 설정 자체는 진행
		} else {
			log.Printf("잔여건수 조회 완료 - SMS: %d, LMS: %d", remainingCountSMS, remainingCountLMS)
			remainingCountSMSPtr = &remainingCountSMS
			remainingCountLMSPtr = &remainingCountLMS
		}
	}

	// Database를 통해 설정 저장 (지점별, SMS/LMS 잔여건수 포함)
	if err := database.SaveSMSConfig(branchCode, accountID, password, senderPhones, isActive, remainingCountSMSPtr, remainingCountLMSPtr); err != nil {
		log.Printf("SMS 설정 저장 오류: %v", err)
		http.Redirect(w, r, "/integrations?error=save_failed", http.StatusSeeOther)
		return
	}

	// 성공 시 리다이렉트
	http.Redirect(w, r, "/integrations?success=saved", http.StatusSeeOther)
}

// KakaoSyncHandler 카카오싱크 URL 생성기 페이지
func KakaoSyncHandler(w http.ResponseWriter, r *http.Request) {
	// 선택된 지점의 seq 가져오기
	branchSeq := middleware.GetSelectedBranch(r)

	// 카카오싱크 URL 생성
	// 형식: https://pf-link.kakao.com/qr/_qFHUn/pages/_MM?query=state%3D17
	// state%3D 뒤에 branchSeq를 붙임
	kakaoSyncBaseURL := "https://pf-link.kakao.com/qr/_qFHUn/pages/_MM"
	kakaoSyncURL := fmt.Sprintf("%s?query=state%%3D%d", kakaoSyncBaseURL, branchSeq)

	data := struct {
		middleware.BasePageData
		Title        string
		ActiveMenu   string
		KakaoSyncURL string
	}{
		BasePageData: middleware.GetBasePageData(r),
		Title:        "카카오싱크 URL 생성",
		ActiveMenu:   "kakao-sync",
		KakaoSyncURL: kakaoSyncURL,
	}

	if err := Templates.ExecuteTemplate(w, "integrations/kakao-sync.html", data); err != nil {
		log.Printf("템플릿 실행 오류: %v", err)
		http.Error(w, "페이지를 불러올 수 없습니다", http.StatusInternalServerError)
	}
}
