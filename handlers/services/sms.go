package services

import (
	"backoffice/database"
	"backoffice/middleware"
	"backoffice/services/sms"
	"backoffice/utils"
	"fmt"
	"log"
	"net/http"
	"strconv"
)

// SendSMSHandler godoc
// @Summary      SMS 메시지 전송
// @Description  고객에게 SMS 메시지를 전송하고 이력을 저장합니다
// @Tags         services
// @Accept       x-www-form-urlencoded
// @Produce      json
// @Param        customer_seq    formData  string  true  "고객 시퀀스"
// @Param        sender_phone    formData  string  true  "발신번호"
// @Param        receiver_phone  formData  string  true  "수신번호"
// @Param        message         formData  string  true  "메시지 내용"
// @Success      200  {object}  map[string]interface{}  "성공"
// @Failure      400  {string}  string  "잘못된 요청"
// @Failure      401  {string}  string  "인증 실패"
// @Failure      500  {string}  string  "서버 오류"
// @Security     SessionAuth
// @Router       /service/sms [post]
func SendSMSHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// 세션에서 선택된 지점 정보 가져오기
	branchSeq := middleware.GetSelectedBranch(r)
	if branchSeq == 0 {
		log.Println("지점 정보 없음")
		utils.JSONError(w, http.StatusUnauthorized, "지점 정보가 없습니다.")
		return
	}

	// 요청 파라미터 가져오기
	customerSeqStr := r.FormValue("customer_seq")
	senderPhone := r.FormValue("sender_phone")
	receiverPhone := r.FormValue("receiver_phone")
	message := r.FormValue("message")

	// 파라미터 검증
	customerSeq, err := strconv.Atoi(customerSeqStr)
	if err != nil || customerSeq <= 0 {
		log.Printf("잘못된 customer_seq: %s", customerSeqStr)
		utils.JSONError(w, http.StatusBadRequest, "잘못된 고객 정보입니다.")
		return
	}

	if senderPhone == "" {
		utils.JSONError(w, http.StatusBadRequest, "발신번호를 입력해주세요.")
		return
	}

	if receiverPhone == "" {
		utils.JSONError(w, http.StatusBadRequest, "수신번호가 없습니다.")
		return
	}

	if message == "" {
		utils.JSONError(w, http.StatusBadRequest, "메시지 내용을 입력해주세요.")
		return
	}

	// SMS 설정 조회
	smsConfig, err := database.GetSMSConfig(branchSeq)
	if err != nil {
		log.Printf("SMS 설정 조회 오류: %v", err)
		utils.JSONError(w, http.StatusInternalServerError, "SMS 설정을 조회할 수 없습니다.")
		return
	}

	if smsConfig == nil {
		utils.JSONError(w, http.StatusBadRequest, "SMS 설정이 등록되지 않았습니다.")
		return
	}

	// 활성화 상태 확인
	if !smsConfig.IsActive {
		utils.JSONError(w, http.StatusBadRequest, "마이문자 연동이 비활성화 상태입니다.\n연동 관리 페이지에서 마이문자를 활성화해주세요.")
		return
	}

	// SMS 전송
	sendReq := sms.SendRequest{
		AccountID:     smsConfig.AccountID,
		Password:      smsConfig.Password,
		SenderPhone:   senderPhone,
		ReceiverPhone: receiverPhone,
		Message:       message,
	}

	sendResp, err := sms.Send(sendReq)
	if err != nil {
		log.Printf("SMS 전송 오류: %v", err)
		utils.JSONError(w, http.StatusInternalServerError, "SMS 전송 중 오류가 발생했습니다.")
		return
	}

	if !sendResp.Success {
		log.Printf("SMS 전송 실패: %s (코드: %s)", sendResp.Message, sendResp.Code)
		errorMsg := fmt.Sprintf("SMS 전송 실패: %s", sendResp.Message)
		utils.JSONError(w, http.StatusInternalServerError, errorMsg)
		return
	}

	// 성공 응답
	log.Printf("SMS 전송 성공 - 고객 ID: %d, 수신번호: %s", customerSeq, receiverPhone)
	utils.JSONSuccess(w, map[string]interface{}{
		"message": "메시지가 성공적으로 전송되었습니다.",
		"nums":    sendResp.Nums,
		"cols":    sendResp.Cols,
	})
}

// GetReservationSMSConfigHandler godoc
// @Summary      예약 SMS 설정 조회
// @Description  예약 확정 시 사용할 SMS 설정 정보를 조회합니다
// @Tags         services
// @Produce      json
// @Success      200  {object}  map[string]interface{}  "성공"
// @Failure      400  {string}  string  "설정 없음"
// @Failure      401  {string}  string  "인증 실패"
// @Failure      500  {string}  string  "서버 오류"
// @Security     SessionAuth
// @Router       /service/reservation-sms-config [get]
func GetReservationSMSConfigHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// 세션에서 선택된 지점 정보 가져오기
	branchSeq := middleware.GetSelectedBranch(r)
	if branchSeq == 0 {
		log.Println("지점 정보 없음")
		utils.JSONError(w, http.StatusUnauthorized, "지점 정보가 없습니다")
		return
	}

	// 예약 SMS 설정 조회
	config, err := database.GetReservationSMSConfig(branchSeq)
	if err != nil || config == nil {
		log.Printf("예약 SMS 설정 없음: %v", err)
		utils.JSONError(w, http.StatusBadRequest, "예약 SMS 설정이 없습니다")
		return
	}

	// 메시지 템플릿 조회
	template, err := database.GetMessageTemplateByID(config.TemplateSeq)
	if err != nil || template == nil {
		log.Printf("메시지 템플릿 조회 실패: %v", err)
		utils.JSONError(w, http.StatusInternalServerError, "메시지 템플릿을 찾을 수 없습니다")
		return
	}

	// 응답 반환
	utils.JSONSuccess(w, map[string]interface{}{
		"template_seq":     config.TemplateSeq,
		"template_name":    config.TemplateName,
		"template_content": template.Content,
		"sender_number":    config.SenderNumber,
		"auto_send":        config.AutoSend,
	})
}
