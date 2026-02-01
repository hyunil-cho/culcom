package integrations

import (
	"fmt"
	"strconv"
	"time"
)

// ValidateServiceID 서비스 ID 유효성 검증 (문자열 -> 정수 변환)
func ValidateServiceID(serviceIDStr string) (int, error) {
	var serviceID int
	_, err := fmt.Sscanf(serviceIDStr, "%d", &serviceID)
	if err != nil {
		return 0, fmt.Errorf("유효하지 않은 서비스 ID: %s", serviceIDStr)
	}
	if serviceID <= 0 {
		return 0, fmt.Errorf("서비스 ID는 0보다 커야 합니다")
	}
	return serviceID, nil
}

// ValidateSMSRequest SMS 요청 유효성 검증
func ValidateSMSRequest(accountID, password, senderPhone, receiverPhone, message string) error {
	if accountID == "" {
		return fmt.Errorf("계정 ID가 비어있음")
	}
	if password == "" {
		return fmt.Errorf("비밀번호가 비어있음")
	}
	if senderPhone == "" {
		return fmt.Errorf("발신번호가 비어있음")
	}
	if receiverPhone == "" {
		return fmt.Errorf("수신번호가 비어있음")
	}
	if message == "" {
		return fmt.Errorf("메시지가 비어있음")
	}
	return nil
}

// ValidateCalendarEventRequest 캘린더 이벤트 요청 유효성 검증
func ValidateCalendarEventRequest(customerName, phoneNumber, interviewDate string, duration int) error {
	if customerName == "" {
		return fmt.Errorf("고객 이름이 비어있음")
	}
	if phoneNumber == "" {
		return fmt.Errorf("전화번호가 비어있음")
	}
	if interviewDate == "" {
		return fmt.Errorf("인터뷰 일시가 비어있음")
	}

	// 날짜 파싱 검증
	_, err := time.Parse("2006-01-02 15:04:05", interviewDate)
	if err != nil {
		return fmt.Errorf("날짜 형식 오류: %v", err)
	}

	// Duration 검증 (0이면 기본값 60분 사용)
	if duration < 0 {
		return fmt.Errorf("소요시간은 0보다 커야 합니다")
	}

	return nil
}

// ValidateBranchSeq 지점 시퀀스 유효성 검증
func ValidateBranchSeq(branchSeqStr string) (int, error) {
	branchSeq, err := strconv.Atoi(branchSeqStr)
	if err != nil || branchSeq <= 0 {
		return 0, fmt.Errorf("잘못된 branch_seq: %s", branchSeqStr)
	}
	return branchSeq, nil
}
