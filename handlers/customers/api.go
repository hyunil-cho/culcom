package customers

import (
	"backoffice/config"
	"backoffice/database"
	"backoffice/handlers/integrations"
	"backoffice/middleware"
	"backoffice/utils"
	"log"
	"net/http"
)

// UpdateCommentHandler - 고객 코멘트 업데이트 핸들러 (REST API)
func UpdateCommentHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// 요청 파라미터 가져오기
	customerSeqStr := r.FormValue("customer_seq")
	comment := r.FormValue("comment")

	// 파라미터 검증
	customerSeq, err := ValidateCustomerSeq(customerSeqStr)
	if err != nil {
		log.Printf("customer_seq 검증 실패: %v", err)
		http.Error(w, "Invalid customer ID", http.StatusBadRequest)
		return
	}

	// 코멘트 업데이트
	err = database.UpdateCustomerComment(customerSeq, comment)
	if err != nil {
		log.Printf("코멘트 업데이트 오류: %v", err)
		http.Error(w, "Failed to update comment", http.StatusInternalServerError)
		return
	}

	// 성공 응답
	utils.JSONSuccess(w, map[string]interface{}{
		"success": true,
		"comment": comment,
	})
}

// IncrementCallCountHandler - 고객 통화 횟수 증가 핸들러 (REST API)
func IncrementCallCountHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// 요청 파라미터 가져오기
	customerSeqStr := r.FormValue("customer_seq")

	// 파라미터 검증
	customerSeq, err := ValidateCustomerSeq(customerSeqStr)
	if err != nil {
		log.Printf("customer_seq 검증 실패: %v", err)
		http.Error(w, "Invalid customer ID", http.StatusBadRequest)
		return
	}

	// 통화 횟수 증가
	callCount, lastUpdateDate, err := database.IncrementCallCount(customerSeq)
	if err != nil {
		log.Printf("통화 횟수 증가 오류: %v", err)
		http.Error(w, "Failed to increment call count", http.StatusInternalServerError)
		return
	}

	// 성공 응답
	utils.JSONSuccess(w, map[string]interface{}{
		"success":          true,
		"call_count":       callCount,
		"last_update_date": lastUpdateDate,
	})
}

// CreateReservationHandler - 예약 정보 생성 핸들러 (REST API)
func CreateReservationHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// 세션에서 선택된 지점 정보 가져오기 (seq)
	branchSeq := middleware.GetSelectedBranch(r)

	// 요청 파라미터 가져오기
	customerSeqStr := r.FormValue("customer_seq")
	caller := r.FormValue("caller")
	interviewDateStr := r.FormValue("interview_date")

	// 파라미터 검증
	customerSeq, callerValue, interviewDate, err := ValidateReservationParams(customerSeqStr, caller, interviewDateStr)
	if err != nil {
		log.Printf("예약 파라미터 검증 실패: %v", err)
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	caller = callerValue // validated caller

	// 세션에서 사용자 정보 가져오기
	session, err := config.SessionStore.Get(r, "user-session")
	if err != nil {
		log.Printf("세션 조회 오류: %v", err)
		http.Error(w, "Session error", http.StatusInternalServerError)
		return
	}

	userSeq, err := ValidateUserSeqFromSession(session.Values["user_seq"])
	if err != nil {
		log.Printf("세션 검증 실패: %v", err)
		http.Error(w, "User not found in session", http.StatusUnauthorized)
		return
	}

	// 예약 정보 저장
	reservationID, err := database.CreateReservation(branchSeq, customerSeq, userSeq, caller, interviewDate)
	if err != nil {
		log.Printf("예약 생성 오류: %v", err)
		http.Error(w, "Failed to create reservation", http.StatusInternalServerError)
		return
	}

	// 고객 정보 조회 (캘린더 이벤트 생성용)
	var customerName, phoneNumber, comment string
	customerQuery := `SELECT name, phone_number, COALESCE(comment, '') FROM customers WHERE seq = ?`
	err = database.DB.QueryRow(customerQuery, customerSeq).Scan(&customerName, &phoneNumber, &comment)
	if err != nil {
		log.Printf("고객 정보 조회 오류: %v", err)
		// 고객 정보 조회 실패해도 예약은 생성되었으므로 계속 진행
	}

	// 구글 캘린더 이벤트 생성 시도
	var calendarLink string
	calendarService, err := integrations.GetCalendarService(branchSeq)
	if err == nil && calendarService != nil {
		// 캘린더가 연동되어 있으면 이벤트 생성
		eventReq := integrations.CreateCalendarEventRequest{
			CustomerName:  customerName,
			PhoneNumber:   phoneNumber,
			InterviewDate: interviewDate.Format("2006-01-02 15:04:05"),
			Comment:       comment,
			Duration:      60, // 기본 60분
		}

		// 캘린더 이벤트 생성
		link, eventErr := integrations.CreateCalendarEvent(branchSeq, eventReq)
		if eventErr != nil {
			log.Printf("캘린더 이벤트 생성 실패: %v", eventErr)
			// 캘린더 생성 실패해도 예약은 성공으로 처리
		} else {
			calendarLink = link
			log.Printf("캘린더 이벤트 생성 완료: %s", link)
		}
	} else {
		log.Printf("캘린더 연동 안됨 또는 오류: %v", err)
	}

	// 성공 응답
	response := map[string]interface{}{
		"reservation_id": reservationID,
	}
	if calendarLink != "" {
		response["calendar_link"] = calendarLink
		response["message"] = "예약이 생성되고 구글 캘린더에 추가되었습니다"
	} else {
		response["message"] = "예약이 생성되었습니다"
	}
	utils.JSONSuccess(w, response)
}

// UpdateCustomerNameHandler - 고객 이름 업데이트 핸들러 (REST API)
func UpdateCustomerNameHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// 요청 파라미터 가져오기
	customerSeqStr := r.FormValue("customer_seq")
	name := r.FormValue("name")

	// 파라미터 검증
	customerSeq, err := ValidateCustomerSeq(customerSeqStr)
	if err != nil {
		log.Printf("customer_seq 검증 실패: %v", err)
		http.Error(w, "Invalid customer ID", http.StatusBadRequest)
		return
	}

	err = ValidateCustomerName(name)
	if err != nil {
		log.Printf("이름 검증 실패: %v", err)
		http.Error(w, "Name is required", http.StatusBadRequest)
		return
	}

	// 이름 업데이트
	err = database.UpdateCustomerName(customerSeq, name)
	if err != nil {
		log.Printf("이름 업데이트 오류: %v", err)
		http.Error(w, "Failed to update name", http.StatusInternalServerError)
		return
	}

	// 성공 응답
	utils.JSONSuccess(w, map[string]interface{}{"success": true})
}

// CheckSMSIntegrationHandler - SMS 연동 상태 확인 핸들러 (REST API)
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

// GetSMSSenderNumbersHandler - SMS 발신번호 목록 조회 핸들러 (REST API)
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

	if config == nil || len(config.SenderPhones) == 0 {
		utils.JSONError(w, http.StatusBadRequest, "등록된 발신번호가 없습니다.")
		return
	}

	// JSON 응답 생성 (활성화 상태도 포함)
	utils.JSONSuccess(w, map[string]interface{}{
		"isActive":     config.IsActive,
		"senderPhones": config.SenderPhones,
	})
}
