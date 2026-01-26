package database

import (
	"log"
)

// IntegrationStatus - 외부 연동 상태 구조체
type IntegrationStatus struct {
	BranchCode  string
	ServiceType string
	IsConnected bool
	ConfigData  map[string]interface{}
}

// GetIntegrationStatus - 특정 지점의 특정 서비스 연동 상태 조회
// 파라미터: branchCode (지점 코드), serviceType (서비스 타입: sms, email 등)
// 반환: 연동 상태, 에러
func GetIntegrationStatus(branchCode, serviceType string) (*IntegrationStatus, error) {
	// TODO: 실제 쿼리 구현
	// 예시:
	// query := `SELECT branch_code, service_type, is_connected, config_data
	//           FROM integrations
	//           WHERE branch_code = ? AND service_type = ?`
	// row := QueryRow(query, branchCode, serviceType)
	// var status IntegrationStatus
	// err := row.Scan(&status.BranchCode, &status.ServiceType, &status.IsConnected, &status.ConfigData)
	// if err != nil {
	// 	return nil, err
	// }
	// return &status, nil

	log.Printf("[DB 추상화] GetIntegrationStatus 호출 - branchCode: %s, serviceType: %s", branchCode, serviceType)

	// 임시 더미 데이터 반환
	// gasan 지점은 SMS 연동되어 있고, 나머지는 연동 안 됨
	isConnected := false
	if branchCode == "gasan" && serviceType == "sms" {
		isConnected = true
	}

	return &IntegrationStatus{
		BranchCode:  branchCode,
		ServiceType: serviceType,
		IsConnected: isConnected,
		ConfigData: map[string]interface{}{
			"api_key":    "dummy-api-key",
			"sender_num": "1234567890",
		},
	}, nil
}

// GetAllIntegrationsByBranch - 특정 지점의 모든 서비스 연동 상태 조회
// 파라미터: branchCode (지점 코드)
// 반환: 연동 상태 목록, 에러
func GetAllIntegrationsByBranch(branchCode string) ([]IntegrationStatus, error) {
	// TODO: 실제 쿼리 구현
	// 예시:
	// query := `SELECT branch_code, service_type, is_connected, config_data
	//           FROM integrations
	//           WHERE branch_code = ?`
	// rows, err := Query(query, branchCode)
	// if err != nil {
	// 	return nil, err
	// }
	// defer rows.Close()
	//
	// var statuses []IntegrationStatus
	// for rows.Next() {
	// 	var status IntegrationStatus
	// 	err := rows.Scan(&status.BranchCode, &status.ServiceType, &status.IsConnected, &status.ConfigData)
	// 	if err != nil {
	// 		return nil, err
	// 	}
	// 	statuses = append(statuses, status)
	// }
	// return statuses, nil

	log.Printf("[DB 추상화] GetAllIntegrationsByBranch 호출 - branchCode: %s", branchCode)

	// 임시 더미 데이터: 지점별로 다른 연동 상태 반환
	var statuses []IntegrationStatus

	// SMS 연동 상태
	smsConnected := branchCode == "gasan" || branchCode == "gangnam"
	statuses = append(statuses, IntegrationStatus{
		BranchCode:  branchCode,
		ServiceType: "sms",
		IsConnected: smsConnected,
		ConfigData: map[string]interface{}{
			"api_key":    "dummy-sms-key",
			"sender_num": "02-1234-5678",
		},
	})

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
