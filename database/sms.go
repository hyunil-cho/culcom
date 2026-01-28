package database

import (
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
func GetSMSConfig(branchCode string) (*SMSConfig, error) {
	log.Printf("=== SMS 설정 조회 - BranchCode: %s ===", branchCode)
	log.Println("현재 DB 연동 전 - 빈 설정 반환")
	return nil, nil
}

// SaveSMSConfig SMS 설정 저장 (INSERT 또는 UPDATE)
func SaveSMSConfig(branchCode, accountID, password string, senderPhones []string, isActive bool) error {
	log.Println("=== SMS 설정 저장 ===")
	log.Printf("지점 코드: %s", branchCode)
	log.Printf("계정 ID: %s", accountID)
	log.Printf("비밀번호: %s", maskSMSPassword(password))
	log.Printf("발신번호: %v", senderPhones)
	log.Printf("활성화: %v", isActive)

	// 1단계: 지점 seq 조회
	var branchSeq int
	branchQuery := `SELECT seq FROM branches WHERE alias = ?`
	err := DB.QueryRow(branchQuery, branchCode).Scan(&branchSeq)
	if err != nil {
		log.Printf("SaveSMSConfig - branch not found: %v", err)
		return err
	}

	// 2단계: 마이문자 서비스 seq 조회 (code_name = 'SMS')
	var serviceSeq int
	serviceQuery := `
		SELECT tps.seq
		FROM third_party_services tps
		LEFT JOIN external_service_type est ON tps.code_seq = est.seq
		WHERE est.code_name = 'SMS'
		LIMIT 1
	`
	err = DB.QueryRow(serviceQuery).Scan(&serviceSeq)
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

	if configErr != nil {
		// 설정이 없으면 생성
		insertConfigQuery := `
			INSERT INTO mymunja_config_info (mapping_id, mymunja_id, mymunja_password)
			VALUES (?, ?, ?)
		`
		result, execErr := tx.Exec(insertConfigQuery, mappingSeq, accountID, password)
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
			SET mymunja_id = ?, mymunja_password = ?
			WHERE seq = ?
		`
		result, execErr := tx.Exec(updateConfigQuery, accountID, password, configSeq)
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

	// 5단계: 기존 회신번호 삭제
	deleteCallbackQuery := `DELETE FROM mymunja_callback_number WHERE config_id = ?`
	_, execErr := tx.Exec(deleteCallbackQuery, configSeq)
	if execErr != nil {
		log.Printf("SaveSMSConfig - delete callbacks error: %v", execErr)
		err = execErr
		return err
	}
	log.Printf("SaveSMSConfig - deleted existing callbacks for config: %d", configSeq)

	// 6단계: 새 회신번호 삽입
	insertCallbackQuery := `
		INSERT INTO mymunja_callback_number (config_id, number, createdDate, lastUpdateDate)
		VALUES (?, ?, CURDATE(), CURDATE())
	`
	for _, phone := range senderPhones {
		if phone != "" {
			_, execErr := tx.Exec(insertCallbackQuery, configSeq, phone)
			if execErr != nil {
				log.Printf("SaveSMSConfig - insert callback error: %v (configSeq: %d, phone: %s)", execErr, configSeq, phone)
				err = execErr
				return err
			}
			log.Printf("SaveSMSConfig - inserted callback: %s for config: %d", phone, configSeq)
		}
	}

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
