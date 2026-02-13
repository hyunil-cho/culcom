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
	"net/url"
	"time"
)

// SMSTestHandler godoc
// @Summary      SMS 테스트 발송
// @Description  SMS 테스트 메시지를 발송합니다
// @Tags         integrations
// @Accept       json
// @Produce      json
// @Param        request  body      object  true  "SMS 발송 정보"
// @Success      200      {object}  map[string]interface{}  "성공"
// @Failure      400      {string}  string  "잘못된 요청"
// @Failure      500      {string}  string  "서버 오류"
// @Security     SessionAuth
// @Router       /external/sms [post]
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
			"nums":    result.Nums,
			"cols":    result.Cols,
		})
	} else {
		utils.JSONError(w, http.StatusInternalServerError, result.Message)
	}
}

// ActivateHandler godoc
// @Summary      연동 활성화
// @Description  특정 서비스의 연동을 활성화합니다
// @Tags         integrations
// @Accept       json
// @Produce      json
// @Param        request  body      object  true  "service_id"
// @Success      200      {string}  string  "활성화되었습니다"
// @Failure      400      {string}  string  "잘못된 요청"
// @Failure      500      {string}  string  "서버 오류"
// @Security     SessionAuth
// @Router       /integrations/activate [post]
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

// DisconnectHandler godoc
// @Summary      연동 해제
// @Description  특정 서비스의 연동을 해제(비활성화)합니다
// @Tags         integrations
// @Accept       json
// @Produce      json
// @Param        request  body      object  true  "service_id"
// @Success      200      {string}  string  "연결이 해제되었습니다"
// @Failure      400      {string}  string  "잘못된 요청"
// @Failure      500      {string}  string  "서버 오류"
// @Security     SessionAuth
// @Router       /integrations/disconnect [post]
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

// CreateCalendarEventHandler godoc
// @Summary      구글 캘린더 이벤트 생성
// @Description  구글 캘린더에 새로운 이벤트를 생성합니다
// @Tags         integrations
// @Accept       json
// @Produce      json
// @Param        request  body      CreateCalendarEventRequest  true  "캘린더 이벤트 정보"
// @Success      200      {object}  map[string]interface{}  "성공"
// @Failure      400      {string}  string  "잘못된 요청"
// @Failure      500      {string}  string  "서버 오류"
// @Security     SessionAuth
// @Router       /calendar/create-event [post]
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

// CreateCalendarEvent 구글 캘린더 이벤트 생성 URL 반환 (OAuth 없이)
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

	// 한국 시간대 로드
	loc, err := time.LoadLocation("Asia/Seoul")
	if err != nil {
		return "", fmt.Errorf("시간대 로드 실패: %v", err)
	}

	// 인터뷰 일시 파싱 (한국 시간으로)
	interviewTime, err := time.ParseInLocation("2006-01-02 15:04:05", req.InterviewDate, loc)
	if err != nil {
		return "", fmt.Errorf("날짜 형식이 올바르지 않습니다")
	}

	// 종료 시간 계산
	endTime := interviewTime.Add(time.Duration(req.Duration) * time.Minute)

	// 지점 alias 조회
	branchAlias := ""
	if branchSeq > 0 {
		branches, err := database.GetBranchesForSelect()
		if err == nil {
			for _, branch := range branches {
				if branch["seq"] == fmt.Sprintf("%d", branchSeq) {
					branchAlias = branch["alias"]
					break
				}
			}
		}
	}

	// 이벤트 설명 구성
	description := ""

	// 광고명 및 광고 출처
	if req.CommercialName != "" {
		description += fmt.Sprintf("광고명: %s", req.CommercialName)
	}
	if req.AdSource != "" {
		if description != "" {
			description += "\n"
		}
		description += fmt.Sprintf("광고 출처: %s", req.AdSource)
	}

	// 코멘트
	if req.Comment != "" {
		if description != "" {
			description += "\n\n"
		}
		description += req.Comment
	}

	// Google Calendar "Add to Calendar" URL 생성
	// 형식: https://calendar.google.com/calendar/render?action=TEMPLATE&text=TITLE&dates=START/END&details=DESCRIPTION

	// 디버깅 로그
	log.Printf("[Calendar] 파싱된 인터뷰 시간 (한국): %s (Location: %s)", interviewTime.Format("2006-01-02 15:04:05"), interviewTime.Location())
	log.Printf("[Calendar] UTC로 변환: %s", interviewTime.UTC().Format("2006-01-02 15:04:05"))

	// 시간 형식: YYYYMMDDTHHMMSSZ (UTC)
	startTimeStr := interviewTime.UTC().Format("20060102T150405Z")
	endTimeStr := endTime.UTC().Format("20060102T150405Z")

	// 예약 확정일 (일만 추출)
	reservationDay := time.Now().Format("02")

	// 타이틀 생성: (일 참석) CALLER+통화횟수 고객명 전화번호
	// 예: (01 참석) H1 김미영 01099321967
	callerInfo := fmt.Sprintf("%s%d", req.Caller, req.CallCount)
	if req.Caller == "" {
		callerInfo = "" // CALLER 정보가 없으면 생략
	}
	titleText := fmt.Sprintf("(%s 참석) %s %s %s", reservationDay, callerInfo, req.CustomerName, req.PhoneNumber)
	title := url.QueryEscape(titleText)
	details := url.QueryEscape(description)
	location := url.QueryEscape(branchAlias)

	// Google Calendar URL 생성
	calendarURL := fmt.Sprintf(
		"https://calendar.google.com/calendar/render?action=TEMPLATE&text=%s&dates=%s/%s&details=%s&location=%s",
		title,
		startTimeStr,
		endTimeStr,
		details,
		location,
	)

	log.Printf("[Calendar] 캘린더 URL 생성 완료: %s", calendarURL)
	return calendarURL, nil
}

// CheckSMSIntegrationHandler godoc
// @Summary      SMS 연동 상태 확인
// @Description  현재 지점의 SMS 연동 상태를 확인합니다
// @Tags         integrations
// @Produce      json
// @Success      200  {object}  map[string]interface{}  "성공"
// @Failure      400  {string}  string  "연동 안됨"
// @Failure      401  {string}  string  "인증 실패"
// @Failure      500  {string}  string  "서버 오류"
// @Security     SessionAuth
// @Router       /integrations/check-sms [get]
func CheckSMSIntegrationHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// 세션에서 선택된 지점 정보 가져오기 (seq)
	branchSeq := middleware.GetSelectedBranch(r)
	if branchSeq == 0 {
		log.Println("지점 정보 없음")
		utils.JSONError(w, http.StatusUnauthorized, "지점 정보가 없습니다.")
		return
	}

	// SMS 연동 상태 조회
	status, err := database.GetIntegrationStatus(branchSeq, "sms")
	if err != nil {
		log.Printf("SMS 연동 상태 조회 오류: %v", err)
		utils.JSONError(w, http.StatusInternalServerError, "SMS 연동 정보를 확인할 수 없습니다.")
		return
	}

	// 연동 상태 확인
	if !status.HasConfig {
		utils.JSONError(w, http.StatusBadRequest, "SMS 연동이 설정되지 않았습니다.\n연동 관리 페이지에서 마이문자 서비스를 먼저 연동해주세요.")
		return
	}

	if !status.IsConnected {
		utils.JSONError(w, http.StatusBadRequest, "마이문자 연동이 비활성화 상태입니다.\n연동 관리 페이지에서 마이문자를 활성화해주세요.")
		return
	}

	// 연동 상태 정상
	utils.JSONSuccessMessage(w, "SMS 연동이 정상적으로 설정되어 있습니다.")
}

// GetSMSSenderNumbersHandler godoc
// @Summary      SMS 발신번호 목록 조회
// @Description  현재 지점의 SMS 발신번호 목록을 조회합니다
// @Tags         integrations
// @Produce      json
// @Success      200  {object}  map[string]interface{}  "성공"
// @Failure      400  {string}  string  "발신번호 없음"
// @Failure      401  {string}  string  "인증 실패"
// @Failure      500  {string}  string  "서버 오류"
// @Security     SessionAuth
// @Router       /integrations/sms-senders [get]
func GetSMSSenderNumbersHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// 세션에서 선택된 지점 정보 가져오기 (seq)
	branchSeq := middleware.GetSelectedBranch(r)
	if branchSeq == 0 {
		log.Println("지점 정보 없음")
		utils.JSONError(w, http.StatusUnauthorized, "지점 정보가 없습니다.")
		return
	}

	// SMS 설정 조회
	config, err := database.GetSMSConfig(branchSeq)
	if err != nil {
		log.Printf("SMS 설정 조회 오류: %v", err)
		utils.JSONError(w, http.StatusInternalServerError, "SMS 설정을 조회할 수 없습니다.")
		return
	}

	if config == nil {
		log.Printf("SMS 설정이 없음 - BranchSeq: %d", branchSeq)
		utils.JSONError(w, http.StatusBadRequest, "SMS 연동 설정이 없습니다. 연동 관리 페이지에서 마이문자를 설정해주세요.")
		return
	}

	if len(config.SenderPhones) == 0 {
		log.Printf("발신번호가 등록되지 않음 - BranchSeq: %d", branchSeq)
		utils.JSONError(w, http.StatusBadRequest, "등록된 발신번호가 없습니다. 연동 관리 페이지에서 발신번호를 등록해주세요.")
		return
	}

	log.Printf("발신번호 조회 성공 - BranchSeq: %d, Count: %d, Active: %v", branchSeq, len(config.SenderPhones), config.IsActive)

	// JSON 응답 생성 (활성화 상태도 포함)
	utils.JSONSuccess(w, map[string]interface{}{
		"isActive":     config.IsActive,
		"senderPhones": config.SenderPhones,
	})
}
