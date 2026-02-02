package database

import (
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

// GetSMSConfig SMS 설정 조회
func GetSMSConfig(branchSeq int) (*SMSConfig, error) {
	log.Printf("=== SMS 설정 조회 - BranchSeq: %d ===", branchSeq)

	// SMS 서비스 seq 조회
	var serviceSeq int
	serviceQuery := `
		SELECT tps.seq
		FROM third_party_services tps
		LEFT JOIN external_service_type est ON tps.code_seq = est.seq
		WHERE est.code_name = 'SMS'
		LIMIT 1
	`
	err := DB.QueryRow(serviceQuery).Scan(&serviceSeq)
	if err != nil {
		log.Printf("GetSMSConfig - service not found: %v", err)
		return nil, err
	}

	// 3단계: 매핑 조회
	var mappingSeq int
	var isActive bool
	mappingQuery := `
		SELECT mapping_seq, is_active 
		FROM ` + "`branch-third-party-mapping`" + `
		WHERE branch_id = ? AND third_party_id = ?
	`
	err = DB.QueryRow(mappingQuery, branchSeq, serviceSeq).Scan(&mappingSeq, &isActive)
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
func SaveSMSConfig(branchSeq int, accountID, password string, senderPhones []string, isActive bool) error {
	log.Println("=== SMS 설정 저장 ===")
	log.Printf("지점 seq: %d", branchSeq)
	log.Printf("계정 ID: %s", accountID)
	log.Printf("비밀번호: %s", maskSMSPassword(password))
	log.Printf("발신번호: %v", senderPhones)
	log.Printf("활성화: %v", isActive)

	// 마이문자 서비스 seq 조회 (code_name = 'SMS')
	var serviceSeq int
	serviceQuery := `
		SELECT tps.seq
		FROM third_party_services tps
		LEFT JOIN external_service_type est ON tps.code_seq = est.seq
		WHERE est.code_name = 'SMS'
		LIMIT 1
	`
	err := DB.QueryRow(serviceQuery).Scan(&serviceSeq)
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

	// 3단계: branch-third-party-mapping 확인 및 생성/업데이트
	var mappingSeq int
	mappingQuery := `SELECT mapping_seq FROM ` + "`branch-third-party-mapping`" + `
		WHERE branch_id = ? AND third_party_id = ?`
	err = tx.QueryRow(mappingQuery, branchSeq, serviceSeq).Scan(&mappingSeq)

	if err != nil {
		// 매핑이 없으면 생성
		insertMappingQuery := `
			INSERT INTO ` + "`branch-third-party-mapping`" + ` 
			(branch_id, third_party_id, is_active, createdDate, lastUpdateDate)
			VALUES (?, ?, ?, CURDATE(), CURDATE())
		`
		result, err := tx.Exec(insertMappingQuery, branchSeq, serviceSeq, isActive)
		if err != nil {
			log.Printf("SaveSMSConfig - insert mapping error: %v", err)
			return err
		}
		id, _ := result.LastInsertId()
		mappingSeq = int(id)
		log.Printf("SaveSMSConfig - new mapping created: %d", mappingSeq)
	} else {
		// 매핑이 있으면 업데이트
		updateMappingQuery := `
			UPDATE ` + "`branch-third-party-mapping`" + `
			SET is_active = ?, lastUpdateDate = CURDATE()
			WHERE mapping_seq = ?
		`
		_, err = tx.Exec(updateMappingQuery, isActive, mappingSeq)
		if err != nil {
			log.Printf("SaveSMSConfig - update mapping error: %v", err)
			return err
		}
		log.Printf("SaveSMSConfig - mapping updated: %d", mappingSeq)
	}

	// 4단계: mymunja_config_info 확인 및 생성/업데이트
	var configSeq int
	configQuery := `SELECT seq FROM mymunja_config_info WHERE mapping_id = ?`
	configErr := tx.QueryRow(configQuery, mappingSeq).Scan(&configSeq)

	// 발신번호는 하나만 저장
	var callbackNumber string
	if len(senderPhones) > 0 {
		callbackNumber = senderPhones[0]
	}

	if configErr != nil {
		// 설정이 없으면 생성
		insertConfigQuery := `
			INSERT INTO mymunja_config_info (mapping_id, mymunja_id, mymunja_password, callback_number)
			VALUES (?, ?, ?, ?)
		`
		result, execErr := tx.Exec(insertConfigQuery, mappingSeq, accountID, password, callbackNumber)
		if execErr != nil {
			log.Printf("SaveSMSConfig - insert config error: %v", execErr)
			err = execErr
			return err
		}
		id, _ := result.LastInsertId()
		configSeq = int(id)
		log.Printf("SaveSMSConfig - new config created: %d", configSeq)
	} else {
		// 설정이 있으면 업데이트
		updateConfigQuery := `
			UPDATE mymunja_config_info
			SET mymunja_id = ?, mymunja_password = ?, callback_number = ?
			WHERE seq = ?
		`
		result, execErr := tx.Exec(updateConfigQuery, accountID, password, callbackNumber, configSeq)
		if execErr != nil {
			log.Printf("SaveSMSConfig - update config error: %v", execErr)
			err = execErr
			return err
		}
		rowsAffected, _ := result.RowsAffected()
		log.Printf("SaveSMSConfig - config updated: %d, rows affected: %d", configSeq, rowsAffected)
	}

	// configSeq 유효성 검증
	if configSeq == 0 {
		log.Printf("SaveSMSConfig - invalid configSeq: %d", configSeq)
		err = fmt.Errorf("invalid config sequence: %d", configSeq)
		return err
	}

	log.Printf("SaveSMSConfig - callback_number saved: %s for config: %d", callbackNumber, configSeq)

	// 트랜잭션 커밋
	if err = tx.Commit(); err != nil {
		log.Printf("SaveSMSConfig - commit error: %v", err)
		return err
	}

	log.Println("저장 완료")
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

// GetSMSRemainingCount SMS 잔여건수 조회 (대시보드용)
// branchSeq: 지점 seq
func GetSMSRemainingCount(branchSeq int) (int, error) {
	log.Printf("[SMS] GetSMSRemainingCount - BranchSeq: %d", branchSeq)

	// SMS 서비스 seq 조회
	var serviceSeq int
	serviceQuery := `
		SELECT tps.seq
		FROM third_party_services tps
		LEFT JOIN external_service_type est ON tps.code_seq = est.seq
		WHERE est.code_name = 'SMS'
		LIMIT 1
	`
	err := DB.QueryRow(serviceQuery).Scan(&serviceSeq)
	if err != nil {
		log.Printf("GetSMSRemainingCount - service not found: %v", err)
		return 0, err
	}

	// 매핑 seq 조회
	var mappingSeq int
	mappingQuery := `
		SELECT mapping_seq 
		FROM ` + "`branch-third-party-mapping`" + `
		WHERE branch_id = ? AND third_party_id = ?
	`
	err = DB.QueryRow(mappingQuery, branchSeq, serviceSeq).Scan(&mappingSeq)
	if err != nil {
		log.Printf("GetSMSRemainingCount - mapping not found: %v", err)
		return 0, nil // 설정이 없으면 0 반환
	}

	// 잔여건수 조회
	var remainingCount int
	query := `
		SELECT COALESCE(remaining_count, 0)
		FROM mymunja_config_info 
		WHERE mapping_id = ?
	`
	err = DB.QueryRow(query, mappingSeq).Scan(&remainingCount)
	if err != nil {
		log.Printf("GetSMSRemainingCount - query error: %v", err)
		return 0, nil // 오류 시 0 반환
	}

	log.Printf("[SMS] GetSMSRemainingCount 완료 - Count: %d", remainingCount)
	return remainingCount, nil
}

// UpdateRemainingCount SMS 잔여건수 업데이트
// branchSeq: 지점 seq, remainingCount: 남은 건수
func UpdateRemainingCount(branchSeq int, remainingCount int) error {
	log.Printf("[SMS] UpdateRemainingCount - BranchSeq: %d, RemainingCount: %d", branchSeq, remainingCount)

	// SMS 서비스 seq 조회
	var serviceSeq int
	serviceQuery := `
		SELECT tps.seq
		FROM third_party_services tps
		LEFT JOIN external_service_type est ON tps.code_seq = est.seq
		WHERE est.code_name = 'SMS'
		LIMIT 1
	`
	err := DB.QueryRow(serviceQuery).Scan(&serviceSeq)
	if err != nil {
		log.Printf("UpdateRemainingCount - service not found: %v", err)
		return err
	}

	// 매핑 seq 조회
	var mappingSeq int
	mappingQuery := `
		SELECT mapping_seq 
		FROM ` + "`branch-third-party-mapping`" + `
		WHERE branch_id = ? AND third_party_id = ?
	`
	err = DB.QueryRow(mappingQuery, branchSeq, serviceSeq).Scan(&mappingSeq)
	if err != nil {
		log.Printf("UpdateRemainingCount - mapping not found: %v", err)
		return err
	}

	// 잔여건수 업데이트
	updateQuery := `
		UPDATE mymunja_config_info 
		SET remaining_count = ?
		WHERE mapping_id = ?
	`
	result, err := DB.Exec(updateQuery, remainingCount, mappingSeq)
	if err != nil {
		log.Printf("UpdateRemainingCount - update error: %v", err)
		return err
	}

	rowsAffected, _ := result.RowsAffected()
	log.Printf("[SMS] UpdateRemainingCount 완료 - Rows affected: %d", rowsAffected)
	return nil
}
