package services

import (
	"backoffice/database"
	"backoffice/middleware"
	"backoffice/services/sms"
	"fmt"
	"log"
	"net/http"
	"strconv"
)

// SendSMSHandler - SMS 메시지 전송 핸들러
func SendSMSHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// 세션에서 선택된 지점 정보 가져오기
	branchSeq := middleware.GetSelectedBranch(r)
	if branchSeq == 0 {
		log.Println("지점 정보 없음")
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		w.Write([]byte(`{"success": false, "error": "지점 정보가 없습니다."}`))
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
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		w.Write([]byte(`{"success": false, "error": "잘못된 고객 정보입니다."}`))
		return
	}

	if senderPhone == "" {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		w.Write([]byte(`{"success": false, "error": "발신번호를 입력해주세요."}`))
		return
	}

	if receiverPhone == "" {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		w.Write([]byte(`{"success": false, "error": "수신번호가 없습니다."}`))
		return
	}

	if message == "" {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		w.Write([]byte(`{"success": false, "error": "메시지 내용을 입력해주세요."}`))
		return
	}

	// SMS 설정 조회
	smsConfig, err := database.GetSMSConfig(branchSeq)
	if err != nil {
		log.Printf("SMS 설정 조회 오류: %v", err)
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		w.Write([]byte(`{"success": false, "error": "SMS 설정을 조회할 수 없습니다."}`))
		return
	}

	if smsConfig == nil {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		w.Write([]byte(`{"success": false, "error": "SMS 설정이 등록되지 않았습니다."}`))
		return
	}

	// 활성화 상태 확인
	if !smsConfig.IsActive {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		w.Write([]byte(`{"success": false, "error": "마이문자 연동이 비활성화 상태입니다.\n연동 관리 페이지에서 마이문자를 활성화해주세요."}`))
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
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		w.Write([]byte(`{"success": false, "error": "SMS 전송 중 오류가 발생했습니다."}`))
		return
	}

	if !sendResp.Success {
		log.Printf("SMS 전송 실패: %s (코드: %s)", sendResp.Message, sendResp.Code)
		errorMsg := fmt.Sprintf("SMS 전송 실패: %s", sendResp.Message)
		response := fmt.Sprintf(`{"success": false, "error": %q}`, errorMsg)
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		w.Write([]byte(response))
		return
	}

	// 성공 응답
	log.Printf("SMS 전송 성공 - 고객 ID: %d, 수신번호: %s", customerSeq, receiverPhone)
	response := fmt.Sprintf(`{"success": true, "message": "메시지가 성공적으로 전송되었습니다.", "nums": %q, "cols": %q}`, sendResp.Nums, sendResp.Cols)
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	w.Write([]byte(response))
}
