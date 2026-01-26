package database

import (
	"log"
)

// SMSConfig SMS 연동 설정 정보
type SMSConfig struct {
	ID           int
	AccountID    string
	Password     string
	SenderPhones []string
	IsActive     bool
	CreatedAt    string
	UpdatedAt    string
}

// GetSMSConfig SMS 설정 조회
func GetSMSConfig() (*SMSConfig, error) {
	log.Println("=== SMS 설정 조회 ===")
	log.Println("현재 DB 연동 전 - 빈 설정 반환")
	return nil, nil
}

// SaveSMSConfig SMS 설정 저장 (INSERT 또는 UPDATE)
func SaveSMSConfig(accountID, password string, senderPhones []string, isActive bool) error {
	log.Println("=== SMS 설정 저장 ===")
	log.Printf("계정 ID: %s", accountID)
	log.Printf("비밀번호: %s", maskSMSPassword(password))
	log.Printf("발신번호: %v", senderPhones)
	log.Printf("활성화: %v", isActive)
	log.Println("저장 완료 (DB 연동 전 - 로그만 출력)")
	log.Println("==================")
	return nil
}

// maskSMSPassword 비밀번호 마스킹
func maskSMSPassword(password string) string {
	if len(password) <= 2 {
		return "**"
	}
	return password[:2] + "****"
}
