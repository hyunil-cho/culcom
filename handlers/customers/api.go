package customers

import (
	"backoffice/config"
	"backoffice/database"
	"backoffice/middleware"
	"backoffice/utils"
	"log"
	"net/http"
	"strconv"
)

// UpdateCommentHandler godoc
// @Summary      고객 코멘트 업데이트
// @Description  고객의 코멘트를 업데이트합니다
// @Tags         customers
// @Accept       x-www-form-urlencoded
// @Produce      json
// @Param        customer_seq  formData  string  true  "고객 시퀀스"
// @Param        comment       formData  string  true  "코멘트"
// @Success      200  {object}  map[string]interface{}  "성공"
// @Failure      400  {string}  string  "잘못된 요청"
// @Failure      401  {string}  string  "인증 실패"
// @Failure      500  {string}  string  "서버 오류"
// @Security     SessionAuth
// @Router       /customers/comment [post]
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

// ProcessCallHandler godoc
// @Summary      통화 처리 (CALLER 선택 + 통화 횟수 증가)
// @Description  CALLER 선택 이력을 저장하고 통화 횟수를 증가시킵니다 (트랜잭션)
// @Tags         customers
// @Accept       x-www-form-urlencoded
// @Produce      json
// @Param        customer_seq  formData  string  true  "고객 시퀀스"
// @Param        caller        formData  string  true  "CALLER 문자 (A-Z)"
// @Success      200  {object}  map[string]interface{}  "성공"
// @Failure      400  {string}  string  "잘못된 요청"
// @Failure      500  {string}  string  "서버 오류"
// @Security     SessionAuth
// @Router       /customers/process-call [post]
func ProcessCallHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// 요청 파라미터 가져오기
	customerSeqStr := r.FormValue("customer_seq")
	caller := r.FormValue("caller")
	branchSeq := middleware.GetSelectedBranch(r)

	// 파라미터 검증
	customerSeq, err := ValidateCustomerSeq(customerSeqStr)
	if err != nil {
		log.Printf("customer_seq 검증 실패: %v", err)
		utils.JSONError(w, http.StatusBadRequest, "Invalid customer ID")
		return
	}

	if caller == "" {
		utils.JSONError(w, http.StatusBadRequest, "Caller is required")
		return
	}

	// CALLER 선택 이력 저장 + 통화 횟수 증가 (트랜잭션)
	callCount, lastUpdateDate, err := database.ProcessCallWithCallerSelection(customerSeq, branchSeq, caller)
	if err != nil {
		log.Printf("통화 처리 오류: %v", err)
		utils.JSONError(w, http.StatusInternalServerError, "Failed to process call")
		return
	}

	log.Printf("통화 처리 완료 - CustomerSeq: %d, Caller: %s, CallCount: %d", customerSeq, caller, callCount)

	// 성공 응답
	utils.JSONSuccess(w, map[string]interface{}{
		"success":          true,
		"call_count":       callCount,
		"last_update_date": lastUpdateDate,
		"message":          "통화 처리가 완료되었습니다",
	})
}

// CreateReservationHandler godoc
// @Summary      예약 정보 생성
// @Description  새로운 예약 정보를 생성합니다
// @Tags         customers
// @Accept       x-www-form-urlencoded
// @Produce      json
// @Param        customer_seq    formData  string  true  "고객 시퀀스"
// @Param        caller          formData  string  true  "발신자"
// @Param        interview_date  formData  string  true  "인터뷰 일시 (2006-01-02T15:04:05)"
// @Success      200  {object}  map[string]interface{}  "성공"
// @Failure      400  {string}  string  "잘못된 요청"
// @Failure      401  {string}  string  "인증 실패"
// @Failure      500  {string}  string  "서버 오류"
// @Security     SessionAuth
// @Router       /customers/reservation [post]
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

	// 성공 응답
	utils.JSONSuccess(w, map[string]interface{}{
		"reservation_id": reservationID,
		"customer_seq":   customerSeq,
		"interview_date": interviewDate.Format("2006-01-02 15:04:05"),
		"message":        "예약이 생성되었습니다",
	})
}

// UpdateCustomerNameHandler godoc
// @Summary      고객 이름 업데이트
// @Description  고객의 이름을 업데이트합니다
// @Tags         customers
// @Accept       x-www-form-urlencoded
// @Produce      json
// @Param        customer_seq  formData  string  true  "고객 시퀀스"
// @Param        name          formData  string  true  "고객 이름"
// @Success      200  {object}  map[string]interface{}  "성공"
// @Failure      400  {string}  string  "잘못된 요청"
// @Failure      500  {string}  string  "서버 오류"
// @Security     SessionAuth
// @Router       /customers/update-name [post]
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

// DeleteCustomerHandler - 고객 삭제 API
// DELETE /api/customers/delete
func DeleteCustomerHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// 고객 seq 추출
	customerSeqStr := r.FormValue("customer_seq")
	if customerSeqStr == "" {
		log.Printf("customer_seq 누락")
		utils.JSONError(w, http.StatusBadRequest, "customer_seq is required")
		return
	}

	customerSeq, err := strconv.Atoi(customerSeqStr)
	if err != nil {
		log.Printf("customer_seq 변환 오류: %v", err)
		utils.JSONError(w, http.StatusBadRequest, "Invalid customer_seq")
		return
	}

	// 고객 삭제 (reservation_info는 FK constraint에 의해 자동으로 customer_id가 NULL로 변경됨)
	err = database.DeleteCustomer(customerSeq)
	if err != nil {
		log.Printf("고객 삭제 오류: %v", err)
		utils.JSONError(w, http.StatusInternalServerError, "Failed to delete customer")
		return
	}

	log.Printf("고객 삭제 완료 - CustomerSeq: %d", customerSeq)
	utils.JSONSuccess(w, map[string]interface{}{
		"message": "고객이 삭제되었습니다",
	})
}
