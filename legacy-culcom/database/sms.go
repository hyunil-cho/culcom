package database

import (
	"backoffice/utils"
	"database/sql"
	"fmt"
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

// getSMSMappingSeq SMS 서비스 매핑 seq 조회 (공통 함수)
func getSMSMappingSeq(branchSeq int) (int, error) {
	var mappingSeq int
	query := `
		SELECT btpm.mapping_seq
		FROM ` + "`branch-third-party-mapping`" + ` btpm
		INNER JOIN third_party_services tps ON btpm.third_party_id = tps.seq
		INNER JOIN external_service_type est ON tps.code_seq = est.seq
		WHERE btpm.branch_id = ? AND est.code_name = 'SMS'
		LIMIT 1
	`
	err := DB.QueryRow(query, branchSeq).Scan(&mappingSeq)
	return mappingSeq, err
}

// getSMSMappingInfo SMS 서비스 매핑 정보 조회 (공통 함수)
func getSMSMappingInfo(branchSeq int) (mappingSeq int, isActive bool, err error) {
	query := `
		SELECT btpm.mapping_seq, btpm.is_active
		FROM ` + "`branch-third-party-mapping`" + ` btpm
		INNER JOIN third_party_services tps ON btpm.third_party_id = tps.seq
		INNER JOIN external_service_type est ON tps.code_seq = est.seq
		WHERE btpm.branch_id = ? AND est.code_name = 'SMS'
		LIMIT 1
	`
	err = DB.QueryRow(query, branchSeq).Scan(&mappingSeq, &isActive)
	return
}

// getSMSServiceSeq SMS 서비스 seq 조회 (공통 함수)
func getSMSServiceSeq() (int, error) {
	var serviceSeq int
	query := `
		SELECT tps.seq
		FROM third_party_services tps
		INNER JOIN external_service_type est ON tps.code_seq = est.seq
		WHERE est.code_name = 'SMS'
		LIMIT 1
	`
	err := DB.QueryRow(query).Scan(&serviceSeq)
	return serviceSeq, err
}

// GetSMSConfig SMS 설정 조회
func GetSMSConfig(branchSeq int) (*SMSConfig, error) {
	log.Printf("=== SMS 설정 조회 - BranchSeq: %d ===", branchSeq)

	// SMS 서비스 매핑 조회
	mappingSeq, isActive, err := getSMSMappingInfo(branchSeq)
	if err != nil {
		log.Printf("GetSMSConfig - mapping not found: %v", err)
		return nil, nil // 설정이 없으면 nil 반환
	}

	// 4단계: SMS 설정 조회
	var configSeq int
	var accountID, password string
	var callbackNumber sql.NullString
	var createdAt sql.NullString
	var updatedAt sql.NullString
	configQuery := `
		SELECT seq, mymunja_id, mymunja_password, callback_number,
		       DATE_FORMAT(createdDate, '%Y-%m-%d') as createdDate,
		       DATE_FORMAT(lastUpdateDate, '%Y-%m-%d') as lastUpdateDate
		FROM mymunja_config_info 
		WHERE mapping_id = ?
	`
	err = DB.QueryRow(configQuery, mappingSeq).Scan(&configSeq, &accountID, &password, &callbackNumber, &createdAt, &updatedAt)
	if err != nil {
		log.Printf("GetSMSConfig - config not found: %v", err)
		return nil, nil
	}

	// NullString을 일반 string으로 변환
	var createdAtStr, updatedAtStr string
	if createdAt.Valid {
		createdAtStr = createdAt.String
	}
	if updatedAt.Valid {
		updatedAtStr = updatedAt.String
	}

	// 발신번호 배열로 변환 (하나만)
	var senderPhones []string
	if callbackNumber.Valid && callbackNumber.String != "" {
		senderPhones = append(senderPhones, callbackNumber.String)
	}

	config := &SMSConfig{
		ID:           configSeq,
		AccountID:    accountID,
		Password:     password,
		SenderPhones: senderPhones,
		IsActive:     isActive,
		CreatedAt:    createdAtStr,
		UpdatedAt:    updatedAtStr,
	}

	log.Printf("GetSMSConfig 완료 - 발신번호 수: %d", len(senderPhones))
	return config, nil
}

// SaveSMSConfig SMS 설정 저장 (INSERT 또는 UPDATE)
func SaveSMSConfig(branchSeq int, accountID, password string, senderPhones []string, isActive bool, remainingCountSMS, remainingCountLMS *int) error {
	log.Println("=== SMS 설정 저장 ===")
	log.Printf("지점 seq: %d", branchSeq)
	log.Printf("계정 ID: %s", accountID)
	log.Printf("비밀번호: %s", utils.MaskPassword(password))
	log.Printf("발신번호: %v", senderPhones)
	log.Printf("활성화: %v", isActive)
	if remainingCountSMS != nil {
		log.Printf("SMS 잔여건수: %d", *remainingCountSMS)
	}
	if remainingCountLMS != nil {
		log.Printf("LMS 잔여건수: %d", *remainingCountLMS)
	}

	// SMS 서비스 seq 조회
	serviceSeq, err := getSMSServiceSeq()
	if err != nil {
		log.Printf("SaveSMSConfig - service not found: %v", err)
		return err
	}

	// 트랜잭션 시작
	tx, err := DB.Begin()
	if err != nil {
		log.Printf("SaveSMSConfig - transaction begin error: %v", err)
		return err
	}
	defer func() {
		if err != nil {
			tx.Rollback()
			log.Printf("SaveSMSConfig - transaction rolled back due to error")
		}
	}()

	// 3단계: branch-third-party-mapping UPSERT (UNIQUE KEY: branch_id, third_party_id)
	upsertMappingQuery := `
		INSERT INTO ` + "`branch-third-party-mapping`" + ` 
			(branch_id, third_party_id, is_active, createdDate, lastUpdateDate)
		VALUES (?, ?, ?, CURDATE(), CURDATE())
		ON DUPLICATE KEY UPDATE 
			is_active = VALUES(is_active),
			lastUpdateDate = CURDATE()
	`
	result, err := tx.Exec(upsertMappingQuery, branchSeq, serviceSeq, isActive)
	if err != nil {
		log.Printf("SaveSMSConfig - upsert mapping error: %v", err)
		return err
	}

	// mapping_seq 조회 (INSERT된 경우 LastInsertId, UPDATE된 경우 기존 seq 조회)
	var mappingSeq int
	mappingSeq, err = getMappingSeqAfterUpsert(tx, branchSeq, serviceSeq, result)
	if err != nil {
		log.Printf("SaveSMSConfig - get mapping_seq error: %v", err)
		return err
	}
	log.Printf("SaveSMSConfig - mapping_seq: %d", mappingSeq)

	// 4단계: mymunja_config_info UPSERT (UNIQUE KEY: mapping_id)
	// 발신번호는 하나만 저장
	var callbackNumber string
	if len(senderPhones) > 0 {
		callbackNumber = senderPhones[0]
	}

	// 잔여건수 기본값 처리 (nil이면 기존 값 유지, INSERT 시에는 0)
	finalRemainingCountSMS := 0
	finalRemainingCountLMS := 0
	if remainingCountSMS != nil {
		finalRemainingCountSMS = *remainingCountSMS
	}
	if remainingCountLMS != nil {
		finalRemainingCountLMS = *remainingCountLMS
	}

	// mymunja_config_info UPSERT
	var execErr error
	if remainingCountSMS != nil || remainingCountLMS != nil {
		// 잔여건수 업데이트 포함
		if remainingCountSMS != nil && remainingCountLMS != nil {
			// 둘 다 업데이트
			upsertConfigQuery := `
				INSERT INTO mymunja_config_info (mapping_id, mymunja_id, mymunja_password, callback_number, remaining_count_sms, remaining_count_lms, lastUpdateDate)
				VALUES (?, ?, ?, ?, ?, ?, now())
				ON DUPLICATE KEY UPDATE 
					mymunja_id = VALUES(mymunja_id),
					mymunja_password = VALUES(mymunja_password),
					callback_number = VALUES(callback_number),
					remaining_count_sms = VALUES(remaining_count_sms),
					remaining_count_lms = VALUES(remaining_count_lms),
					lastUpdateDate = now()
			`
			_, execErr = tx.Exec(upsertConfigQuery, mappingSeq, accountID, password, callbackNumber, finalRemainingCountSMS, finalRemainingCountLMS)
		} else if remainingCountSMS != nil {
			// SMS만 업데이트
			upsertConfigQuery := `
				INSERT INTO mymunja_config_info (mapping_id, mymunja_id, mymunja_password, callback_number, remaining_count_sms, remaining_count_lms, lastUpdateDate)
				VALUES (?, ?, ?, ?, ?, 0, now())
				ON DUPLICATE KEY UPDATE 
					mymunja_id = VALUES(mymunja_id),
					mymunja_password = VALUES(mymunja_password),
					callback_number = VALUES(callback_number),
					remaining_count_sms = VALUES(remaining_count_sms),
					lastUpdateDate = now()
			`
			_, execErr = tx.Exec(upsertConfigQuery, mappingSeq, accountID, password, callbackNumber, finalRemainingCountSMS)
		} else {
			// LMS만 업데이트
			upsertConfigQuery := `
				INSERT INTO mymunja_config_info (mapping_id, mymunja_id, mymunja_password, callback_number, remaining_count_sms, remaining_count_lms, lastUpdateDate)
				VALUES (?, ?, ?, ?, 0, ?, now())
				ON DUPLICATE KEY UPDATE 
					mymunja_id = VALUES(mymunja_id),
					mymunja_password = VALUES(mymunja_password),
					callback_number = VALUES(callback_number),
					remaining_count_lms = VALUES(remaining_count_lms),
					lastUpdateDate = now()
			`
			_, execErr = tx.Exec(upsertConfigQuery, mappingSeq, accountID, password, callbackNumber, finalRemainingCountLMS)
		}
	} else {
		// 잔여건수는 업데이트하지 않음 (기존 값 유지)
		upsertConfigQuery := `
			INSERT INTO mymunja_config_info (mapping_id, mymunja_id, mymunja_password, callback_number, remaining_count_sms, remaining_count_lms, lastUpdateDate)
			VALUES (?, ?, ?, ?, 0, 0, now())
			ON DUPLICATE KEY UPDATE 
				mymunja_id = VALUES(mymunja_id),
				mymunja_password = VALUES(mymunja_password),
				callback_number = VALUES(callback_number),
				lastUpdateDate = now()
		`
		_, execErr = tx.Exec(upsertConfigQuery, mappingSeq, accountID, password, callbackNumber)
	}

	if execErr != nil {
		log.Printf("SaveSMSConfig - upsert config error: %v", execErr)
		err = execErr
		return err
	}
	log.Printf("SaveSMSConfig - config upserted for mapping: %d", mappingSeq)

	// 트랜잭션 커밋
	if err = tx.Commit(); err != nil {
		log.Printf("SaveSMSConfig - commit error: %v", err)
		return err
	}

	log.Println("저장 완료")
	log.Println("==================")
	return nil
}

// GetSMSRemainingCount SMS 잔여건수 조회 (대시보드용)
// branchSeq: 지점 seq
func GetSMSRemainingCount(branchSeq int) (int, error) {
	log.Printf("[SMS] GetSMSRemainingCount - BranchSeq: %d", branchSeq)

	// SMS 서비스 매핑 조회
	mappingSeq, err := getSMSMappingSeq(branchSeq)
	if err != nil {
		log.Printf("GetSMSRemainingCount - mapping not found: %v", err)
		return 0, nil // 설정이 없으면 0 반환
	}

	// 잔여건수 조회 (SMS + LMS 합계)
	var remainingCountSMS, remainingCountLMS int
	query := `
		SELECT COALESCE(remaining_count_sms, 0), COALESCE(remaining_count_lms, 0)
		FROM mymunja_config_info 
		WHERE mapping_id = ?
	`
	err = DB.QueryRow(query, mappingSeq).Scan(&remainingCountSMS, &remainingCountLMS)
	if err != nil {
		log.Printf("GetSMSRemainingCount - query error: %v", err)
		return 0, nil // 오류 시 0 반환
	}

	totalCount := remainingCountSMS + remainingCountLMS
	log.Printf("[SMS] GetSMSRemainingCount 완료 - SMS: %d, LMS: %d, Total: %d", remainingCountSMS, remainingCountLMS, totalCount)
	return totalCount, nil
}

// GetSMSAndLMSRemainingCount SMS와 LMS 잔여건수 각각 조회 (대시보드용)
// branchSeq: 지점 seq
// 반환: SMS 잔여건수, LMS 잔여건수, 에러
func GetSMSAndLMSRemainingCount(branchSeq int) (int, int, error) {
	log.Printf("[SMS] GetSMSAndLMSRemainingCount - BranchSeq: %d", branchSeq)

	// SMS 서비스 매핑 조회
	mappingSeq, err := getSMSMappingSeq(branchSeq)
	if err != nil {
		log.Printf("GetSMSAndLMSRemainingCount - mapping not found: %v", err)
		return 0, 0, nil // 설정이 없으면 0, 0 반환
	}

	// SMS와 LMS 잔여건수 각각 조회
	var remainingCountSMS, remainingCountLMS int
	query := `
		SELECT COALESCE(remaining_count_sms, 0), COALESCE(remaining_count_lms, 0)
		FROM mymunja_config_info 
		WHERE mapping_id = ?
	`
	err = DB.QueryRow(query, mappingSeq).Scan(&remainingCountSMS, &remainingCountLMS)
	if err != nil {
		log.Printf("GetSMSAndLMSRemainingCount - query error: %v", err)
		return 0, 0, nil // 오류 시 0, 0 반환
	}

	log.Printf("[SMS] GetSMSAndLMSRemainingCount 완료 - SMS: %d, LMS: %d", remainingCountSMS, remainingCountLMS)
	return remainingCountSMS, remainingCountLMS, nil
}

// UpdateRemainingCount SMS/LMS 잔여건수 업데이트
// branchSeq: 지점 seq, msgType: "SMS", "LMS", "BOTH", remainingCount: 업데이트할 건수
func UpdateRemainingCountByType(branchSeq int, msgType string, remainingCount int) error {
	log.Printf("[SMS] UpdateRemainingCountByType - BranchSeq: %d, Type: %s, Count: %d", branchSeq, msgType, remainingCount)

	// SMS 서비스 매핑 조회
	mappingSeq, err := getSMSMappingSeq(branchSeq)
	if err != nil {
		log.Printf("UpdateRemainingCount - mapping not found: %v", err)
		return err
	}

	// 잔여건수 업데이트 (타입에 따라 선택적 업데이트)
	var updateQuery string
	var result sql.Result

	switch msgType {
	case "SMS":
		// SMS만 업데이트
		updateQuery = `
			UPDATE mymunja_config_info 
			SET remaining_count_sms = ?
			WHERE mapping_id = ?
		`
		result, err = DB.Exec(updateQuery, remainingCount, mappingSeq)
	case "LMS":
		// LMS만 업데이트
		updateQuery = `
			UPDATE mymunja_config_info 
			SET remaining_count_lms = ?
			WHERE mapping_id = ?
		`
		result, err = DB.Exec(updateQuery, remainingCount, mappingSeq)
	default:
		return fmt.Errorf("지원하지 않는 메시지 타입: %s", msgType)
	}
	if err != nil {
		log.Printf("UpdateRemainingCountByType - update error: %v", err)
		return err
	}

	rowsAffected, _ := result.RowsAffected()
	log.Printf("[SMS] UpdateRemainingCountByType 완료 - Type: %s, Rows affected: %d", msgType, rowsAffected)
	return nil
}

// getMappingSeqAfterUpsert UPSERT 후 mapping_seq 조회
func getMappingSeqAfterUpsert(tx *sql.Tx, branchSeq, serviceSeq int, result sql.Result) (int, error) {
	// LastInsertId() 확인
	lastID, err := result.LastInsertId()
	if err == nil && lastID > 0 {
		// INSERT된 경우
		return int(lastID), nil
	}

	// UPDATE된 경우 - mapping_seq를 직접 조회
	var mappingSeq int
	query := `
		SELECT mapping_seq 
		FROM ` + "`branch-third-party-mapping`" + `
		WHERE branch_id = ? AND third_party_id = ?
	`
	err = tx.QueryRow(query, branchSeq, serviceSeq).Scan(&mappingSeq)
	if err != nil {
		return 0, err
	}
	return mappingSeq, nil
}
