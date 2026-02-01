package integrations

import (
	"backoffice/config"
	"backoffice/database"
	"backoffice/middleware"
	"backoffice/services/sms"
	"backoffice/utils"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"time"

	"google.golang.org/api/calendar/v3"
)

// CreateCalendarEventRequest 캘린더 이벤트 생성 요청 구조체
type CreateCalendarEventRequest struct {
	CustomerName  string `json:"customer_name"`  // 고객 이름
	PhoneNumber   string `json:"phone_number"`   // 전화번호
	InterviewDate string `json:"interview_date"` // 인터뷰 일시 (YYYY-MM-DD HH:MM:SS)
	Comment       string `json:"comment"`        // 코멘트
	Duration      int    `json:"duration"`       // 소요시간 (분, 기본값 60분)
}

// SMSTestHandler SMS 테스트 발송 API (REST API)
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
		utils.JSONError(w, http.StatusBadRequest, "잘못된 요청 형식입니다")
		return
	}

	// 요청 데이터 검증
	err = ValidateSMSRequest(req.AccountID, req.Password, req.SenderPhone, req.ReceiverPhone, req.Message)
	if err != nil {
		log.Printf("SMS 요청 검증 실패: %v", err)
		utils.JSONError(w, http.StatusBadRequest, err.Error())
		return
	}

	// 요청 데이터 로깅
	log.Println("=== SMS 테스트 발송 요청 ===")
	log.Printf("환경: %s", config.GetEnvironment())
	log.Printf("계정 ID: %s", req.AccountID)
	log.Printf("비밀번호: %s", utils.MaskPassword(req.Password))
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
		utils.JSONError(w, http.StatusInternalServerError, err.Error())
		return
	}

	// 응답 반환
	if result.Success {
		utils.JSONSuccess(w, map[string]interface{}{
			"message": result.Message,
		})
	} else {
		utils.JSONError(w, http.StatusInternalServerError, result.Message)
	}
}

// ActivateHandler 연동 활성화 API (REST API)
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
		utils.JSONError(w, http.StatusBadRequest, "잘못된 요청 형식입니다")
		return
	}

	// 구글 캘린더는 OAuth 연동 페이지로 리다이렉트
	if req.ServiceID == "calendar" {
		utils.JSONError(w, http.StatusBadRequest, "구글 캘린더는 연동 설정 페이지에서 OAuth 인증을 진행해주세요")
		return
	}

	// 서비스 ID를 정수로 변환
	serviceID, err := ValidateServiceID(req.ServiceID)
	if err != nil {
		log.Printf("서비스 ID 검증 실패: %v", err)
		utils.JSONError(w, http.StatusBadRequest, err.Error())
		return
	}

	// 세션에서 선택된 지점 정보 가져오기 (seq)
	branchSeq := middleware.GetSelectedBranch(r)

	// Database를 통해 활성화
	if err := database.ActivateIntegration(branchSeq, serviceID); err != nil {
		log.Printf("활성화 오류: %v", err)
		utils.JSONError(w, http.StatusInternalServerError, "활성화 중 오류가 발생했습니다")
		return
	}

	// 성공 응답
	utils.JSONSuccessMessage(w, "활성화되었습니다")
}

// DisconnectHandler 연동 해제 (비활성화) API (REST API)
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
		utils.JSONError(w, http.StatusBadRequest, "잘못된 요청 형식입니다")
		return
	}

	// 구글 캘린더는 별도 해제 로직 사용
	if req.ServiceID == "calendar" {
		branchSeq := middleware.GetSelectedBranch(r)
		err := database.DisconnectCalendar(branchSeq)
		if err != nil {
			log.Printf("DisconnectHandler - calendar disconnect error: %v", err)
			utils.JSONError(w, http.StatusInternalServerError, "연동 해제 중 오류가 발생했습니다")
			return
		}
		utils.JSONSuccessMessage(w, "구글 캘린더 연동이 해제되었습니다")
		return
	}

	// 서비스 ID를 정수로 변환
	serviceID, err := ValidateServiceID(req.ServiceID)
	if err != nil {
		log.Printf("서비스 ID 검증 실패: %v", err)
		utils.JSONError(w, http.StatusBadRequest, err.Error())
		return
	}

	// 세션에서 선택된 지점 정보 가져오기 (seq)
	branchSeq := middleware.GetSelectedBranch(r)

	// Database를 통해 비활성화
	if err := database.DeactivateIntegration(branchSeq, serviceID); err != nil {
		log.Printf("비활성화 오류: %v", err)
		utils.JSONError(w, http.StatusInternalServerError, "비활성화 중 오류가 발생했습니다")
		return
	}

	// 성공 응답
	utils.JSONSuccessMessage(w, "연결이 해제되었습니다")
}

// DisconnectCalendarHandler 구글 캘린더 연동 해제 (REST API)
func DisconnectCalendarHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	branchSeq := middleware.GetSelectedBranch(r)

	// DB에서 토큰 정보 삭제
	err := database.DisconnectCalendar(branchSeq)
	if err != nil {
		log.Printf("DisconnectCalendarHandler - DB error: %v", err)
		utils.JSONError(w, http.StatusInternalServerError, "연동 해제 중 오류가 발생했습니다")
		return
	}

	utils.JSONSuccessMessage(w, "구글 캘린더 연동이 해제되었습니다")
}

// CreateCalendarEventHandler 구글 캘린더에 이벤트 생성 API (REST API)
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
		utils.JSONError(w, http.StatusBadRequest, "잘못된 요청 형식입니다")
		return
	}

	// 요청 데이터 검증
	err = ValidateCalendarEventRequest(req.CustomerName, req.PhoneNumber, req.InterviewDate, req.Duration)
	if err != nil {
		log.Printf("CreateCalendarEvent - 요청 검증 실패: %v", err)
		utils.JSONError(w, http.StatusBadRequest, err.Error())
		return
	}

	// 세션에서 지점 정보 가져오기
	branchSeq := middleware.GetSelectedBranch(r)

	// 캘린더 이벤트 생성
	link, err := CreateCalendarEvent(branchSeq, req)
	if err != nil {
		log.Printf("CreateCalendarEvent - 오류: %v", err)
		utils.JSONError(w, http.StatusInternalServerError, err.Error())
		return
	}

	// 성공 응답
	utils.JSONSuccess(w, map[string]interface{}{
		"message": "캘린더 이벤트가 생성되었습니다",
		"link":    link,
	})
}

// CreateCalendarEvent 구글 캘린더 이벤트 생성 (재사용 가능한 함수)
func CreateCalendarEvent(branchSeq int, req CreateCalendarEventRequest) (string, error) {
	// 필수 필드 검증
	err := ValidateCalendarEventRequest(req.CustomerName, req.PhoneNumber, req.InterviewDate, req.Duration)
	if err != nil {
		return "", err
	}

	// 소요시간 기본값 설정
	if req.Duration == 0 {
		req.Duration = 60 // 기본 60분
	}

	// 구글 캘린더 서비스 생성
	service, err := GetCalendarService(branchSeq)
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
