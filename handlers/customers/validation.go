package customers

import (
	"backoffice/utils"
	"fmt"
	"strconv"
	"time"
)

// ValidateCustomerSeq 고객 시퀀스 유효성 검증
func ValidateCustomerSeq(customerSeqStr string) (int, error) {
	customerSeq, err := strconv.Atoi(customerSeqStr)
	if err != nil || customerSeq <= 0 {
		return 0, fmt.Errorf("잘못된 customer_seq: %s", customerSeqStr)
	}
	return customerSeq, nil
}

// ValidateAddCustomerForm 고객 추가 폼 유효성 검증
func ValidateAddCustomerForm(name, phoneNumber string) error {
	if name == "" || phoneNumber == "" {
		return fmt.Errorf("필수 필드 누락")
	}

	if !utils.IsValidPhoneNumber(phoneNumber) {
		return fmt.Errorf("잘못된 전화번호 형식: %s", phoneNumber)
	}

	return nil
}

// ValidateCustomerName 고객 이름 유효성 검증
func ValidateCustomerName(name string) error {
	if name == "" {
		return fmt.Errorf("이름이 비어있음")
	}
	return nil
}

// ValidateReservationParams 예약 파라미터 유효성 검증
func ValidateReservationParams(customerSeqStr, caller, interviewDateStr string) (int, string, time.Time, error) {
	// 고객 시퀀스 검증
	customerSeq, err := ValidateCustomerSeq(customerSeqStr)
	if err != nil {
		return 0, "", time.Time{}, err
	}

	// caller 검증
	if caller == "" {
		return 0, "", time.Time{}, fmt.Errorf("caller가 비어있음")
	}

	// 날짜 파싱 및 검증
	interviewDate, err := time.Parse("2006-01-02T15:04:05", interviewDateStr)
	if err != nil {
		return 0, "", time.Time{}, fmt.Errorf("날짜 파싱 오류: %v, 입력값: %s", err, interviewDateStr)
	}

	return customerSeq, caller, interviewDate, nil
}

// ValidateUserSeqFromSession 세션에서 user_seq 유효성 검증
func ValidateUserSeqFromSession(userSeq interface{}) (int, error) {
	seq, ok := userSeq.(int)
	if !ok || seq <= 0 {
		return 0, fmt.Errorf("세션에서 user_seq를 찾을 수 없음")
	}
	return seq, nil
}
