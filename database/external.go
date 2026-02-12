package database

import (
	"fmt"
	"log"
	"strings"
)

// InsertExternalCustomer 외부 API를 통한 고객 등록
func InsertExternalCustomer(branchSeq int, name, phone, adPlatform, adName string) (int64, error) {
	// 전화번호에서 숫자만 추출
	cleanPhone := strings.Map(func(r rune) rune {
		if r >= '0' && r <= '9' {
			return r
		}
		return -1
	}, phone)

	// 고객 등록
	query := `
		INSERT INTO customers (branch_seq, name, phone_number, commercial_name, ad_source, call_count, status)
		VALUES (?, ?, ?, ?, ?, 0, '신규')
	`

	result, err := DB.Exec(query, branchSeq, name, cleanPhone, adName, adPlatform)
	if err != nil {
		log.Printf("InsertExternalCustomer - 고객 등록 실패: %v", err)
		return 0, fmt.Errorf("고객 등록에 실패했습니다")
	}

	customerSeq, err := result.LastInsertId()
	if err != nil {
		log.Printf("InsertExternalCustomer - LastInsertId 실패: %v", err)
		return 0, fmt.Errorf("고객 등록 확인에 실패했습니다")
	}

	log.Printf("InsertExternalCustomer - 고객 등록 성공: seq=%d, branch_seq=%d, name=%s, phone=%s, adPlatform=%s, adName=%s",
		customerSeq, branchSeq, name, cleanPhone, adPlatform, adName)
	return customerSeq, nil
}

// RegisterExternalCustomer 외부 API를 통한 고객 등록
func RegisterExternalCustomer(name, phone, location, job, reading string, language int) (int64, error) {
	return 1, nil
}
