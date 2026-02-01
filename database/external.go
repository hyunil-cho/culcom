package database

import (
	"encoding/json"
	"fmt"
	"log"
)

// RegisterExternalCustomer 외부 API를 통한 고객 등록
func RegisterExternalCustomer(name, phone, location, job, reading string, language int) (int64, error) {
	// 기본 지점 (첫 번째 지점) 가져오기
	var branchSeq int
	err := db.QueryRow("SELECT seq FROM branches ORDER BY seq ASC LIMIT 1").Scan(&branchSeq)
	if err != nil {
		log.Printf("RegisterExternalCustomer - 기본 지점 조회 실패: %v", err)
		return 0, fmt.Errorf("기본 지점을 찾을 수 없습니다")
	}

	// 추가 정보를 JSON 형식으로 저장
	additionalInfo := map[string]interface{}{
		"location": location,
		"job":      job,
		"reading":  reading,
		"language": language,
	}

	infoJSON, err := json.Marshal(additionalInfo)
	if err != nil {
		log.Printf("RegisterExternalCustomer - JSON 변환 실패: %v", err)
		return 0, fmt.Errorf("고객 정보 처리에 실패했습니다")
	}

	// 전화번호에서 숫자만 추출
	cleanPhone := phone
	for _, char := range []string{"-", " ", "(", ")"} {
		cleanPhone = replaceAll(cleanPhone, char, "")
	}

	// 고객 등록
	query := `
		INSERT INTO customers (branch_seq, name, phone_number, comment, commercial_name)
		VALUES (?, ?, ?, ?, '')
	`

	result, err := db.Exec(query, branchSeq, name, cleanPhone, string(infoJSON))
	if err != nil {
		log.Printf("RegisterExternalCustomer - 고객 등록 실패: %v", err)
		return 0, fmt.Errorf("고객 등록에 실패했습니다")
	}

	customerSeq, err := result.LastInsertId()
	if err != nil {
		log.Printf("RegisterExternalCustomer - LastInsertId 실패: %v", err)
		return 0, fmt.Errorf("고객 등록 확인에 실패했습니다")
	}

	log.Printf("RegisterExternalCustomer - 고객 등록 성공: seq=%d, name=%s, phone=%s", customerSeq, name, cleanPhone)
	return customerSeq, nil
}

// replaceAll 간단한 문자열 치환 함수
func replaceAll(s, old, new string) string {
	result := ""
	for i := 0; i < len(s); i++ {
		if i+len(old) <= len(s) && s[i:i+len(old)] == old {
			result += new
			i += len(old) - 1
		} else {
			result += string(s[i])
		}
	}
	return result
}
