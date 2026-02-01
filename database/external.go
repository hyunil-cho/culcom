package database

import (
	"encoding/json"
	"fmt"
	"log"
	"strings"
)

// GetBranchSeqByLocation location으로 branch_seq 조회
func GetBranchSeqByLocation(location string) (int, error) {
	var branchSeq int

	// location을 alias로 매칭 (대소문자 구분 없이)
	query := "SELECT seq FROM branches WHERE LOWER(alias) = LOWER(?)"

	err := DB.QueryRow(query, location).Scan(&branchSeq)
	if err != nil {
		log.Printf("GetBranchSeqByLocation - 조회 실패: location=%s, error=%v", location, err)
		return 0, fmt.Errorf("해당 위치의 지점을 찾을 수 없습니다: %s", location)
	}

	return branchSeq, nil
}

// InsertExternalCustomer 외부 API를 통한 고객 등록
func InsertExternalCustomer(branchSeq int, name, phone, job, adPlatform, adName string) (int64, error) {
	// 전화번호에서 숫자만 추출
	cleanPhone := strings.Map(func(r rune) rune {
		if r >= '0' && r <= '9' {
			return r
		}
		return -1
	}, phone)

	// 추가 정보를 JSON 형식으로 저장
	additionalInfo := map[string]interface{}{
		"job":         job,
		"ad_platform": adPlatform,
		"ad_name":     adName,
	}

	infoJSON, err := json.Marshal(additionalInfo)
	if err != nil {
		log.Printf("InsertExternalCustomer - JSON 변환 실패: %v", err)
		return 0, fmt.Errorf("고객 정보 처리에 실패했습니다")
	}

	// 고객 등록
	query := `
		INSERT INTO customers (branch_seq, name, phone_number, comment, commercial_name, ad_source, call_count)
		VALUES (?, ?, ?, ?, ?, ?, 0)
	`

	result, err := DB.Exec(query, branchSeq, name, cleanPhone, string(infoJSON), adName, adPlatform)
	if err != nil {
		log.Printf("InsertExternalCustomer - 고객 등록 실패: %v", err)
		return 0, fmt.Errorf("고객 등록에 실패했습니다")
	}

	customerSeq, err := result.LastInsertId()
	if err != nil {
		log.Printf("InsertExternalCustomer - LastInsertId 실패: %v", err)
		return 0, fmt.Errorf("고객 등록 확인에 실패했습니다")
	}

	log.Printf("InsertExternalCustomer - 고객 등록 성공: seq=%d, branch_seq=%d, name=%s, phone=%s, job=%s, adPlatform=%s, adName=%s",
		customerSeq, branchSeq, name, cleanPhone, job, adPlatform, adName)
	return customerSeq, nil
}

// RegisterExternalCustomer 외부 API를 통한 고객 등록
func RegisterExternalCustomer(name, phone, location, job, reading string, language int) (int64, error) {
	return 1, nil
}
