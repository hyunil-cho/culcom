package database

import (
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
// 파라미터: branchCode (지점 코드), serviceType (서비스 타입: sms, email 등)
// 반환: 연동 상태, 에러
func GetIntegrationStatus(branchCode, serviceType string) (*IntegrationStatus, error) {
	log.Printf("[DB] GetIntegrationStatus 호출 - branchCode: %s, serviceType: %s", branchCode, serviceType)

	// 지점 코드가 없으면 빈 상태 반환
	if branchCode == "" {
		log.Printf("GetIntegrationStatus - branchCode is empty")
		return &IntegrationStatus{
			BranchCode:  branchCode,
			ServiceType: serviceType,
			IsConnected: false,
			HasConfig:   false,
			ConfigData:  map[string]interface{}{},
		}, nil
	}

	// 1단계: 지점 seq 조회
	var branchSeq int
	branchQuery := `SELECT seq FROM branches WHERE alias = ?`
	err := DB.QueryRow(branchQuery, branchCode).Scan(&branchSeq)
	if err != nil {
		log.Printf("GetIntegrationStatus - branch not found: %v", err)
		return &IntegrationStatus{
			BranchCode:  branchCode,
			ServiceType: serviceType,
			IsConnected: false,
			HasConfig:   false,
			ConfigData:  map[string]interface{}{},
		}, nil
	}

	// 2단계: 서비스 타입으로 외부 서비스 조회
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

	err = DB.QueryRow(serviceQuery, serviceType).Scan(&serviceSeq, &serviceName, &description)
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
		BranchCode:  branchCode,
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
// 파라미터: branchCode (지점 코드), serviceID (서비스 ID)
// 반환: 연동 상태, 에러
func GetIntegrationStatusByServiceID(branchCode string, serviceID int) (*IntegrationStatus, error) {
	log.Printf("[DB] GetIntegrationStatusByServiceID 호출 - branchCode: %s, serviceID: %d", branchCode, serviceID)

	// 지점 코드가 없으면 빈 상태 반환
	if branchCode == "" {
		log.Printf("GetIntegrationStatusByServiceID - branchCode is empty")
		return &IntegrationStatus{
			BranchCode:  branchCode,
			ServiceType: "unknown",
			IsConnected: false,
			HasConfig:   false,
			ConfigData:  map[string]interface{}{},
		}, nil
	}

	// 1단계: 지점 seq 조회
	var branchSeq int
	branchQuery := `SELECT seq FROM branches WHERE alias = ?`
	err := DB.QueryRow(branchQuery, branchCode).Scan(&branchSeq)
	if err != nil {
		log.Printf("GetIntegrationStatusByServiceID - branch not found: %v", err)
		return &IntegrationStatus{
			BranchCode:  branchCode,
			ServiceType: "unknown",
			IsConnected: false,
			HasConfig:   false,
			ConfigData:  map[string]interface{}{},
		}, nil
	}

	// 2단계: 서비스 ID로 외부 서비스 조회
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

	err = DB.QueryRow(serviceQuery, serviceID).Scan(&serviceName, &description, &codeNamePtr)
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
		BranchCode:  branchCode,
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
// 파라미터: branchCode (지점 코드)
// 반환: 연동 상태 목록, 에러
func GetAllIntegrationsByBranch(branchCode string) ([]IntegrationStatus, error) {
	log.Printf("[DB] GetAllIntegrationsByBranch 호출 - branchCode: %s", branchCode)

	// 지점 코드가 없으면 빈 배열 반환
	if branchCode == "" {
		log.Printf("GetAllIntegrationsByBranch - branchCode is empty")
		return []IntegrationStatus{}, nil
	}

	// 1단계: 지점 seq 조회
	var branchSeq int
	branchQuery := `SELECT seq FROM branches WHERE alias = ?`
	err := DB.QueryRow(branchQuery, branchCode).Scan(&branchSeq)
	if err != nil {
		log.Printf("GetAllIntegrationsByBranch - branch not found: %v", err)
		return []IntegrationStatus{}, nil // 지점이 없으면 빈 배열 반환 (에러 아님)
	}

	// 2단계: 모든 외부 서비스 목록 조회
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
			BranchCode:  branchCode,
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
// 파라미터: branchCode (지점 코드), serviceID (서비스 ID)
// 반환: 에러
func ActivateIntegration(branchCode string, serviceID int) error {
	log.Printf("[DB] ActivateIntegration 호출 - branchCode: %s, serviceID: %d", branchCode, serviceID)

	// 1단계: 지점 seq 조회
	var branchSeq int
	branchQuery := `SELECT seq FROM branches WHERE alias = ?`
	err := DB.QueryRow(branchQuery, branchCode).Scan(&branchSeq)
	if err != nil {
		log.Printf("ActivateIntegration - branch not found: %v", err)
		return err
	}

	// 2단계: branch-third-party-mapping의 is_active를 true로 업데이트
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
// 파라미터: branchCode (지점 코드), serviceID (서비스 ID)
// 반환: 에러
func DeactivateIntegration(branchCode string, serviceID int) error {
	log.Printf("[DB] DeactivateIntegration 호출 - branchCode: %s, serviceID: %d", branchCode, serviceID)

	// 1단계: 지점 seq 조회
	var branchSeq int
	branchQuery := `SELECT seq FROM branches WHERE alias = ?`
	err := DB.QueryRow(branchQuery, branchCode).Scan(&branchSeq)
	if err != nil {
		log.Printf("DeactivateIntegration - branch not found: %v", err)
		return err
	}

	// 2단계: branch-third-party-mapping의 is_active를 false로 업데이트
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
// 파라미터: branchCode (지점 코드), serviceID (서비스 ID)
// 반환: 마이문자 설정 정보, 에러
func GetMymunjaConfig(branchCode string, serviceID int) (*MymunjaConfig, error) {
	log.Printf("[DB] GetMymunjaConfig 호출 - branchCode: %s, serviceID: %d", branchCode, serviceID)

	// 1단계: 지점 seq 조회
	var branchSeq int
	branchQuery := `SELECT seq FROM branches WHERE alias = ?`
	err := DB.QueryRow(branchQuery, branchCode).Scan(&branchSeq)
	if err != nil {
		log.Printf("GetMymunjaConfig - branch not found: %v", err)
		return nil, err
	}

	// 2단계: branch-third-party-mapping 조회
	var mappingSeq int
	var isActive bool
	mappingQuery := `
		SELECT mapping_seq, is_active
		FROM ` + "`branch-third-party-mapping`" + `
		WHERE branch_id = ? AND third_party_id = ?
	`
	err = DB.QueryRow(mappingQuery, branchSeq, serviceID).Scan(&mappingSeq, &isActive)
	if err != nil {
		log.Printf("GetMymunjaConfig - mapping not found: %v", err)
		return nil, err
	}

	// 3단계: mymunja_config_info 조회
	var configSeq int
	var mymunjaID, mymunjaPassword string
	configQuery := `
		SELECT seq, mymunja_id, mymunja_password
		FROM mymunja_config_info
		WHERE mapping_id = ?
	`
	err = DB.QueryRow(configQuery, mappingSeq).Scan(&configSeq, &mymunjaID, &mymunjaPassword)
	if err != nil {
		log.Printf("GetMymunjaConfig - config not found: %v", err)
		return nil, err
	}

	// 4단계: mymunja_callback_number 조회
	var callbackNumbers []string
	callbackQuery := `
		SELECT number
		FROM mymunja_callback_number
		WHERE config_id = ?
	`
	rows, err := DB.Query(callbackQuery, configSeq)
	if err != nil {
		log.Printf("GetMymunjaConfig - callback query error: %v", err)
		return nil, err
	}
	defer rows.Close()

	for rows.Next() {
		var number string
		if err := rows.Scan(&number); err != nil {
			log.Printf("GetMymunjaConfig - callback scan error: %v", err)
			continue
		}
		callbackNumbers = append(callbackNumbers, number)
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
