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

	// JOIN을 사용해 한 번의 쿼리로 모든 서비스와 매핑 정보 조회
	query := `
		SELECT 
			tps.seq,
			tps.name,
			tps.description,
			est.code_name,
			btpm.is_active
		FROM third_party_services tps
		LEFT JOIN external_service_type est ON tps.code_seq = est.seq
		LEFT JOIN ` + "`branch-third-party-mapping`" + ` btpm 
			ON btpm.third_party_id = tps.seq AND btpm.branch_id = ?
	`

	rows, err := DB.Query(query, branchSeq)
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
		var isActivePtr *bool // NULL 가능 (매핑이 없으면 NULL)

		err := rows.Scan(&serviceSeq, &serviceName, &description, &codeNamePtr, &isActivePtr)
		if err != nil {
			log.Printf("GetAllIntegrationsByBranch - scan error: %v", err)
			continue
		}

		codeName := "unknown"
		if codeNamePtr != nil {
			codeName = *codeNamePtr
		}

		// is_active가 NULL이면 매핑이 없음, 아니면 매핑 존재
		hasConfig := (isActivePtr != nil)
		isConnected := (isActivePtr != nil && *isActivePtr)

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

	log.Printf("[DB] GetAllIntegrationsByBranch 완료 - %d개 서비스 조회 (단일 쿼리)", len(statuses))
	return statuses, nil
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
	LastUpdateDate  string
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
	var configLastUpdateDate sql.NullString
	configQuery := `
		SELECT seq, mymunja_id, mymunja_password, callback_number, lastUpdateDate
		FROM mymunja_config_info
		WHERE mapping_id = ?
	`
	err = DB.QueryRow(configQuery, mappingSeq).Scan(&configSeq, &mymunjaID, &mymunjaPassword, &callbackNumber, &configLastUpdateDate)
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
		LastUpdateDate:  configLastUpdateDate.String,
	}

	log.Printf("[DB] GetMymunjaConfig 완료 - ID: %s, 회신번호: %d개", mymunjaID, len(callbackNumbers))
	return config, nil
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
