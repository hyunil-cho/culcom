package database

import (
	"database/sql"
	"fmt"
	"log"
)

// IntegrationStatus - 외부 연동 상태 구조체
type IntegrationStatus struct {
	BranchCode  string
	ServiceType string
	IsConnected bool
	HasConfig   bool // 설정이 존재하는지 여부 (매핑 테이블에 레코드가 있는지)
	ConfigData  map[string]interface{}
}

// GetIntegrationStatus - 특정 지점의 특정 서비스 연동 상태 조회
// 파라미터: branchSeq (지점 seq), serviceType (서비스 타입: sms, email 등)
// 반환: 연동 상태, 에러
func GetIntegrationStatus(branchSeq int, serviceType string) (*IntegrationStatus, error) {
	log.Printf("[DB] GetIntegrationStatus 호출 - branchSeq: %d, serviceType: %s", branchSeq, serviceType)

	// 지점 seq가 0이면 빈 상태 반환
	if branchSeq == 0 {
		log.Printf("GetIntegrationStatus - branchSeq is 0")
		return &IntegrationStatus{
			BranchCode:  "",
			ServiceType: serviceType,
			IsConnected: false,
			HasConfig:   false,
			ConfigData:  map[string]interface{}{},
		}, nil
	}

	// 서비스 타입으로 외부 서비스 조회
	var serviceSeq int
	var serviceName, description string
	serviceQuery := `
		SELECT 
			tps.seq,
			tps.name,
			tps.description
		FROM third_party_services tps
		LEFT JOIN external_service_type est ON tps.code_seq = est.seq
		WHERE est.code_name = ?
	`

	err := DB.QueryRow(serviceQuery, serviceType).Scan(&serviceSeq, &serviceName, &description)
	if err != nil {
		log.Printf("GetIntegrationStatus - service not found: %v", err)
		return nil, err
	}

	// 3단계: 지점-서비스 매핑 조회
	var isActive bool
	mappingQuery := `
		SELECT is_active 
		FROM ` + "`branch-third-party-mapping`" + `
		WHERE branch_id = ? AND third_party_id = ?
	`

	err = DB.QueryRow(mappingQuery, branchSeq, serviceSeq).Scan(&isActive)
	hasConfig := (err == nil) // 레코드가 존재하면 설정이 있음
	isConnected := (err == nil && isActive)

	status := &IntegrationStatus{
		BranchCode:  "",
		ServiceType: serviceType,
		IsConnected: isConnected,
		HasConfig:   hasConfig,
		ConfigData: map[string]interface{}{
			"service_id":   serviceSeq,
			"service_name": serviceName,
			"description":  description,
		},
	}

	log.Printf("[DB] GetIntegrationStatus 완료 - HasConfig: %v, Connected: %v", hasConfig, isConnected)
	return status, nil
}

// GetIntegrationStatusByServiceID - 서비스 ID로 연동 상태 조회
// 파라미터: branchSeq (지점 seq), serviceID (서비스 ID)
// 반환: 연동 상태, 에러
func GetIntegrationStatusByServiceID(branchSeq, serviceID int) (*IntegrationStatus, error) {
	log.Printf("[DB] GetIntegrationStatusByServiceID 호출 - branchSeq: %d, serviceID: %d", branchSeq, serviceID)

	// 지점 seq가 0이면 빈 상태 반환
	if branchSeq == 0 {
		log.Printf("GetIntegrationStatusByServiceID - branchSeq is 0")
		return &IntegrationStatus{
			BranchCode:  "",
			ServiceType: "unknown",
			IsConnected: false,
			HasConfig:   false,
			ConfigData:  map[string]interface{}{},
		}, nil
	}

	// 서비스 ID로 외부 서비스 조회
	var serviceName, description string
	var codeNamePtr *string
	serviceQuery := `
		SELECT 
			tps.name,
			tps.description,
			est.code_name
		FROM third_party_services tps
		LEFT JOIN external_service_type est ON tps.code_seq = est.seq
		WHERE tps.seq = ?
	`

	err := DB.QueryRow(serviceQuery, serviceID).Scan(&serviceName, &description, &codeNamePtr)
	if err != nil {
		log.Printf("GetIntegrationStatusByServiceID - service not found: %v", err)
		return nil, err
	}

	codeName := "unknown"
	if codeNamePtr != nil {
		codeName = *codeNamePtr
	}

	// 3단계: 지점-서비스 매핑 조회
	var isActive bool
	mappingQuery := `
		SELECT is_active 
		FROM ` + "`branch-third-party-mapping`" + `
		WHERE branch_id = ? AND third_party_id = ?
	`

	err = DB.QueryRow(mappingQuery, branchSeq, serviceID).Scan(&isActive)
	hasConfig := (err == nil) // 매핑 레코드가 존재하면 설정이 있음
	isConnected := (err == nil && isActive)

	status := &IntegrationStatus{
		BranchCode:  "",
		ServiceType: codeName,
		IsConnected: isConnected,
		HasConfig:   hasConfig,
		ConfigData: map[string]interface{}{
			"service_id":   serviceID,
			"service_name": serviceName,
			"description":  description,
		},
	}

	log.Printf("[DB] GetIntegrationStatusByServiceID 완료 - Connected: %v", isConnected)
	return status, nil
}

// GetAllIntegrationsByBranch - 특정 지점의 모든 서비스 연동 상태 조회
// 파라미터: branchSeq (지점 seq)
// 반환: 연동 상태 목록, 에러
func GetAllIntegrationsByBranch(branchSeq int) ([]IntegrationStatus, error) {
	log.Printf("[DB] GetAllIntegrationsByBranch 호출 - branchSeq: %d", branchSeq)

	// 지점 seq가 0이면 빈 배열 반환
	if branchSeq == 0 {
		log.Printf("GetAllIntegrationsByBranch - branchSeq is 0")
		return []IntegrationStatus{}, nil
	}

	// 모든 외부 서비스 목록 조회
	servicesQuery := `
		SELECT 
			tps.seq,
			tps.name,
			tps.description,
			est.code_name
		FROM third_party_services tps
		LEFT JOIN external_service_type est ON tps.code_seq = est.seq
	`

	rows, err := DB.Query(servicesQuery)
	if err != nil {
		log.Printf("GetAllIntegrationsByBranch - query error: %v", err)
		return nil, err
	}
	defer rows.Close()

	var statuses []IntegrationStatus

	for rows.Next() {
		var serviceSeq int
		var serviceName, description string
		var codeNamePtr *string

		err := rows.Scan(&serviceSeq, &serviceName, &description, &codeNamePtr)
		if err != nil {
			log.Printf("GetAllIntegrationsByBranch - scan error: %v", err)
			continue
		}

		codeName := "unknown"
		if codeNamePtr != nil {
			codeName = *codeNamePtr
		}

		// 3단계: 각 서비스별로 해당 지점의 연동 상태 확인
		var isActive bool
		mappingQuery := `
			SELECT is_active 
			FROM ` + "`branch-third-party-mapping`" + `
			WHERE branch_id = ? AND third_party_id = ?
		`

		err = DB.QueryRow(mappingQuery, branchSeq, serviceSeq).Scan(&isActive)
		hasConfig := (err == nil) // 매핑 레코드가 존재하면 설정이 있음
		isConnected := (err == nil && isActive)

		statuses = append(statuses, IntegrationStatus{
			BranchCode:  "",
			ServiceType: codeName,
			IsConnected: isConnected,
			HasConfig:   hasConfig,
			ConfigData: map[string]interface{}{
				"service_id":   serviceSeq,
				"service_name": serviceName,
				"description":  description,
			},
		})
	}

	if err = rows.Err(); err != nil {
		log.Printf("GetAllIntegrationsByBranch - rows error: %v", err)
		return nil, err
	}

	log.Printf("[DB] GetAllIntegrationsByBranch 완료 - %d개 서비스 조회", len(statuses))
	return statuses, nil
}

// UpdateIntegrationStatus - 연동 상태 업데이트
// 파라미터: branchCode, serviceType, isConnected, configData
// 반환: 영향받은 행 수, 에러
func UpdateIntegrationStatus(branchCode, serviceType string, isConnected bool, configData map[string]interface{}) (int64, error) {
	// TODO: 실제 쿼리 구현
	// 예시:
	// query := `INSERT INTO integrations (branch_code, service_type, is_connected, config_data, updated_at)
	//           VALUES (?, ?, ?, ?, NOW())
	//           ON DUPLICATE KEY UPDATE is_connected = ?, config_data = ?, updated_at = NOW()`
	// result, err := Exec(query, branchCode, serviceType, isConnected, configData, isConnected, configData)
	// if err != nil {
	// 	return 0, err
	// }
	// return result.RowsAffected()

	log.Printf("[DB 추상화] UpdateIntegrationStatus 호출 - branchCode: %s, serviceType: %s, isConnected: %v", branchCode, serviceType, isConnected)

	// 임시로 성공 응답
	return 1, nil
}

// ActivateIntegration - 연동 활성화
// 파라미터: branchSeq (지점 seq), serviceID (서비스 ID)
// 반환: 에러
func ActivateIntegration(branchSeq, serviceID int) error {
	log.Printf("[DB] ActivateIntegration 호출 - branchSeq: %d, serviceID: %d", branchSeq, serviceID)

	// branch-third-party-mapping의 is_active를 true로 업데이트
	updateQuery := `
		UPDATE ` + "`branch-third-party-mapping`" + `
		SET is_active = 1, lastUpdateDate = CURDATE()
		WHERE branch_id = ? AND third_party_id = ?
	`
	result, err := DB.Exec(updateQuery, branchSeq, serviceID)
	if err != nil {
		log.Printf("ActivateIntegration - update error: %v", err)
		return err
	}

	rowsAffected, _ := result.RowsAffected()
	if rowsAffected == 0 {
		log.Printf("ActivateIntegration - no rows affected (mapping not found)")
		return fmt.Errorf("매핑 정보를 찾을 수 없습니다")
	}

	log.Printf("[DB] ActivateIntegration 완료 - rows affected: %d", rowsAffected)
	return nil
}

// DeactivateIntegration - 연동 비활성화 (연결 해제)
// 파라미터: branchSeq (지점 seq), serviceID (서비스 ID)
// 반환: 에러
func DeactivateIntegration(branchSeq, serviceID int) error {
	log.Printf("[DB] DeactivateIntegration 호출 - branchSeq: %d, serviceID: %d", branchSeq, serviceID)

	// branch-third-party-mapping의 is_active를 false로 업데이트
	updateQuery := `
		UPDATE ` + "`branch-third-party-mapping`" + `
		SET is_active = 0, lastUpdateDate = CURDATE()
		WHERE branch_id = ? AND third_party_id = ?
	`
	result, err := DB.Exec(updateQuery, branchSeq, serviceID)
	if err != nil {
		log.Printf("DeactivateIntegration - update error: %v", err)
		return err
	}

	rowsAffected, _ := result.RowsAffected()
	if rowsAffected == 0 {
		log.Printf("DeactivateIntegration - no rows affected (mapping not found)")
		return fmt.Errorf("매핑 정보를 찾을 수 없습니다")
	}

	log.Printf("[DB] DeactivateIntegration 완료 - rows affected: %d", rowsAffected)
	return nil
}

// MymunjaConfig - 마이문자 설정 구조체
type MymunjaConfig struct {
	ConfigSeq       int
	MappingSeq      int
	MymunjaID       string
	MymunjaPassword string
	CallbackNumbers []string
	IsActive        bool
}

// GetMymunjaConfig - 특정 지점과 서비스의 마이문자 설정 조회
// 파라미터: branchSeq (지점 seq), serviceID (서비스 ID)
// 반환: 마이문자 설정 정보, 에러
func GetMymunjaConfig(branchSeq, serviceID int) (*MymunjaConfig, error) {
	log.Printf("[DB] GetMymunjaConfig 호출 - branchSeq: %d, serviceID: %d", branchSeq, serviceID)

	// branch-third-party-mapping 조회
	var mappingSeq int
	var isActive bool
	mappingQuery := `
		SELECT mapping_seq, is_active
		FROM ` + "`branch-third-party-mapping`" + `
		WHERE branch_id = ? AND third_party_id = ?
	`
	err := DB.QueryRow(mappingQuery, branchSeq, serviceID).Scan(&mappingSeq, &isActive)
	if err != nil {
		log.Printf("GetMymunjaConfig - mapping not found: %v", err)
		return nil, err
	}

	// 3단계: mymunja_config_info 조회
	var configSeq int
	var mymunjaID, mymunjaPassword string
	var callbackNumber sql.NullString
	configQuery := `
		SELECT seq, mymunja_id, mymunja_password, callback_number
		FROM mymunja_config_info
		WHERE mapping_id = ?
	`
	err = DB.QueryRow(configQuery, mappingSeq).Scan(&configSeq, &mymunjaID, &mymunjaPassword, &callbackNumber)
	if err != nil {
		log.Printf("GetMymunjaConfig - config not found: %v", err)
		return nil, err
	}

	// 발신번호 배열로 변환
	var callbackNumbers []string
	if callbackNumber.Valid && callbackNumber.String != "" {
		callbackNumbers = append(callbackNumbers, callbackNumber.String)
	}

	config := &MymunjaConfig{
		ConfigSeq:       configSeq,
		MappingSeq:      mappingSeq,
		MymunjaID:       mymunjaID,
		MymunjaPassword: mymunjaPassword,
		CallbackNumbers: callbackNumbers,
		IsActive:        isActive,
	}

	log.Printf("[DB] GetMymunjaConfig 완료 - ID: %s, 회신번호: %d개", mymunjaID, len(callbackNumbers))
	return config, nil
}

// CalendarConfig - 구글 캘린더 설정 구조체
type CalendarConfig struct {
	Seq            int
	BranchSeq      int
	AccessToken    string
	RefreshToken   string
	TokenExpiry    string // datetime 문자열
	ConnectedEmail string
	IsActive       bool
}

// GetCalendarConfig - 지점의 구글 캘린더 설정 조회
func GetCalendarConfig(branchSeq int) (*CalendarConfig, error) {
	log.Printf("[DB] GetCalendarConfig 호출 - branchSeq: %d", branchSeq)

	// calendar_config 조회
	var config CalendarConfig
	configQuery := `
		SELECT seq, branch_seq,
		       COALESCE(access_token, ''), COALESCE(refresh_token, ''),
		       COALESCE(token_expiry, ''), COALESCE(connected_email, ''),
		       is_active
		FROM calendar_config
		WHERE branch_seq = ?
	`
	err := DB.QueryRow(configQuery, branchSeq).Scan(
		&config.Seq, &config.BranchSeq,
		&config.AccessToken, &config.RefreshToken, &config.TokenExpiry,
		&config.ConnectedEmail, &config.IsActive,
	)
	if err != nil {
		log.Printf("GetCalendarConfig - config not found: %v", err)
		return nil, err
	}

	log.Printf("[DB] GetCalendarConfig 완료 - Email: %s, Active: %v", config.ConnectedEmail, config.IsActive)
	return &config, nil
}

// SaveCalendarTokens - OAuth 인증 후 토큰 정보 저장
func SaveCalendarTokens(branchSeq int, accessToken, refreshToken, tokenExpiry, email string) error {
	log.Printf("[DB] SaveCalendarTokens 호출 - branchSeq: %d, email: %s", branchSeq, email)

	// 기존 설정 확인 (UPSERT)
	var existingSeq int
	checkQuery := `SELECT seq FROM calendar_config WHERE branch_seq = ?`
	err := DB.QueryRow(checkQuery, branchSeq).Scan(&existingSeq)

	if err != nil {
		// 레코드가 없으면 INSERT
		insertQuery := `
			INSERT INTO calendar_config (branch_seq, access_token, refresh_token, token_expiry, connected_email, is_active)
			VALUES (?, ?, ?, ?, ?, 1)
		`
		_, err = DB.Exec(insertQuery, branchSeq, accessToken, refreshToken, tokenExpiry, email)
		if err != nil {
			log.Printf("SaveCalendarTokens - insert error: %v", err)
			return err
		}
		log.Printf("[DB] SaveCalendarTokens - 신규 생성 완료")
	} else {
		// 레코드가 있으면 UPDATE
		updateQuery := `
			UPDATE calendar_config 
			SET access_token = ?, refresh_token = ?, token_expiry = ?, 
			    connected_email = ?, is_active = 1
			WHERE seq = ?
		`
		_, err = DB.Exec(updateQuery, accessToken, refreshToken, tokenExpiry, email, existingSeq)
		if err != nil {
			log.Printf("SaveCalendarTokens - update error: %v", err)
			return err
		}
		log.Printf("[DB] SaveCalendarTokens - 업데이트 완료")
	}

	return nil
}

// DisconnectCalendar - 구글 캘린더 연동 해제
func DisconnectCalendar(branchSeq int) error {
	log.Printf("[DB] DisconnectCalendar 호출 - branchSeq: %d", branchSeq)

	// 토큰 정보 삭제 및 비활성화
	updateQuery := `
		UPDATE calendar_config 
		SET access_token = NULL, refresh_token = NULL, token_expiry = NULL,
		    connected_email = NULL, is_active = 0
		WHERE branch_seq = ?
	`
	_, err := DB.Exec(updateQuery, branchSeq)
	if err != nil {
		log.Printf("DisconnectCalendar - update error: %v", err)
		return err
	}

	log.Printf("[DB] DisconnectCalendar 완료")
	return nil
}

// GetSMSSenderNumbers SMS 발신번호 목록 조회
func GetSMSSenderNumbers(branchSeq int) ([]string, error) {
	log.Printf("[DB] GetSMSSenderNumbers 호출 - branchSeq: %d", branchSeq)

	// 발신번호 목록 조회 (callback_number 필드에서)
	query := `
		SELECT mci.callback_number
		FROM mymunja_config_info mci
		INNER JOIN ` + "`branch-third-party-mapping`" + ` btpm ON mci.mapping_id = btpm.mapping_seq
		WHERE btpm.branch_id = ? AND mci.callback_number IS NOT NULL AND mci.callback_number != ''
	`

	log.Printf("[DB] GetSMSSenderNumbers - 쿼리 실행: %s", query)

	rows, err := DB.Query(query, branchSeq)
	if err != nil {
		log.Printf("GetSMSSenderNumbers - query error: %v", err)
		return []string{}, err
	}
	defer rows.Close()

	var numbers []string
	for rows.Next() {
		var number string
		if err := rows.Scan(&number); err != nil {
			log.Printf("GetSMSSenderNumbers - scan error: %v", err)
			continue
		}
		numbers = append(numbers, number)
		log.Printf("[DB] GetSMSSenderNumbers - 발신번호 추가: %s", number)
	}

	log.Printf("[DB] GetSMSSenderNumbers 완료 - %d개 조회", len(numbers))
	return numbers, nil
}
