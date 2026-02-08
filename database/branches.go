package database

import (
	"fmt"
	"log"
)

// InsertBranch - 지점 추가
// 파라미터: name (지점명), alias (별칭), manager (담당자), address (주소), directions (오시는 길)
// 반환: 생성된 ID, 에러
func InsertBranch(name, alias, manager, address, directions string) (int64, error) {
	query := `INSERT INTO branches (branchName, alias, branch_manager, address, directions, createdDate, lastUpdateDate) 
	          VALUES (?, ?, ?, ?, ?, CURDATE(), CURDATE())`

	result, err := DB.Exec(query, name, alias, manager, address, directions)
	if err != nil {
		log.Printf("InsertBranch error: %v", err)
		return 0, err
	}

	id, err := result.LastInsertId()
	if err != nil {
		log.Printf("InsertBranch get last insert id error: %v", err)
		return 0, err
	}

	log.Printf("InsertBranch success - ID: %d, Name: %s, Alias: %s, Manager: %s", id, name, alias, manager)
	return id, nil
}

// UpdateBranch - 지점 수정
// 파라미터: id (지점 ID), name (지점명), alias (별칭), manager (담당자), address (주소), directions (오시는 길)
// 반환: 영향받은 행 수, 에러
func UpdateBranch(id int, name, alias, manager, address, directions string) (int64, error) {
	query := `UPDATE branches 
	          SET branchName = ?, alias = ?, branch_manager = ?, address = ?, directions = ?, lastUpdateDate = CURDATE() 
	          WHERE seq = ?`

	result, err := DB.Exec(query, name, alias, manager, address, directions, id)
	if err != nil {
		log.Printf("UpdateBranch error: %v", err)
		return 0, err
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		log.Printf("UpdateBranch get rows affected error: %v", err)
		return 0, err
	}

	log.Printf("UpdateBranch success - ID: %d, Name: %s, Alias: %s, Rows: %d", id, name, alias, rowsAffected)
	return rowsAffected, nil
}

// DeleteBranch - 지점 삭제
// 파라미터: id (지점 ID)
// 반환: 영향받은 행 수, 에러
func DeleteBranch(id int) (int64, error) {
	query := `DELETE FROM branches WHERE seq = ?`

	result, err := DB.Exec(query, id)
	if err != nil {
		log.Printf("DeleteBranch error: %v", err)
		return 0, err
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		log.Printf("DeleteBranch get rows affected error: %v", err)
		return 0, err
	}

	log.Printf("DeleteBranch success - ID: %d, Rows: %d", id, rowsAffected)
	return rowsAffected, nil
}

// GetBranchByID - ID로 지점 조회
// 파라미터: id (지점 ID)
// 반환: 지점 정보 (map), 에러
func GetBranchByID(id int) (map[string]interface{}, error) {
	query := `SELECT seq, branchName, alias, branch_manager, address, directions, 
	          DATE_FORMAT(createdDate, '%Y-%m-%d') as createdDate, 
	          DATE_FORMAT(lastUpdateDate, '%Y-%m-%d') as lastUpdateDate 
	          FROM branches 
	          WHERE seq = ?`

	var seq int
	var branchName, alias string
	var manager, address, directions *string
	var createdDate, lastUpdateDate string

	err := DB.QueryRow(query, id).Scan(&seq, &branchName, &alias, &manager, &address, &directions, &createdDate, &lastUpdateDate)
	if err != nil {
		log.Printf("GetBranchByID error: %v", err)
		return nil, err
	}

	branch := map[string]interface{}{
		"id":         seq,
		"name":       branchName,
		"alias":      alias,
		"manager":    manager,
		"address":    address,
		"directions": directions,
		"created_at": createdDate,
		"updated_at": lastUpdateDate,
	}

	log.Printf("GetBranchByID success - ID: %d, Name: %s", seq, branchName)
	return branch, nil
}

// GetAllBranches - 모든 지점 조회
// 반환: 지점 목록, 에러
func GetAllBranches() ([]map[string]interface{}, error) {
	query := `SELECT seq, branchName, alias, branch_manager, address, directions, 
	          DATE_FORMAT(createdDate, '%Y-%m-%d') as createdDate, 
	          DATE_FORMAT(lastUpdateDate, '%Y-%m-%d') as lastUpdateDate 
	          FROM branches 
	          ORDER BY createdDate DESC`

	rows, err := DB.Query(query)
	if err != nil {
		log.Printf("GetAllBranches query error: %v", err)
		return nil, err
	}
	defer rows.Close()

	var branches []map[string]interface{}
	for rows.Next() {
		var seq int
		var branchName, alias string
		var manager, address, directions *string
		var createdDate, lastUpdateDate string

		err := rows.Scan(&seq, &branchName, &alias, &manager, &address, &directions, &createdDate, &lastUpdateDate)
		if err != nil {
			log.Printf("GetAllBranches scan error: %v", err)
			return nil, err
		}

		branch := map[string]interface{}{
			"id":         seq,
			"name":       branchName,
			"alias":      alias,
			"manager":    manager,
			"address":    address,
			"directions": directions,
			"created_at": createdDate,
			"updated_at": lastUpdateDate,
		}
		branches = append(branches, branch)
	}

	if err = rows.Err(); err != nil {
		log.Printf("GetAllBranches rows error: %v", err)
		return nil, err
	}

	log.Printf("GetAllBranches: %d branches loaded", len(branches))
	return branches, nil
}

// GetFirstBranchAlias - 첫 번째 지점의 alias(코드)를 반환
// 반환: 지점 alias, 에러
func GetFirstBranchAlias() (string, error) {
	query := `SELECT alias FROM branches ORDER BY seq ASC LIMIT 1`

	var alias string
	err := DB.QueryRow(query).Scan(&alias)
	if err != nil {
		log.Printf("GetFirstBranchAlias error: %v", err)
		return "", err
	}

	log.Printf("GetFirstBranchAlias success - Alias: %s", alias)
	return alias, nil
}

// GetBranchesForSelect - 헤더 선택박스용 지점 목록 조회 (간단한 형태)
// 반환: [{seq, alias, name, manager, address, directions}] 형태의 지점 목록
func GetBranchesForSelect() ([]map[string]string, error) {
	query := `SELECT seq, alias, branchName, branch_manager, address, directions FROM branches ORDER BY seq ASC`

	rows, err := DB.Query(query)
	if err != nil {
		log.Printf("GetBranchesForSelect error: %v", err)
		return nil, err
	}
	defer rows.Close()

	var branches []map[string]string
	for rows.Next() {
		var seq int
		var alias, branchName string
		var manager, address, directions *string
		if err := rows.Scan(&seq, &alias, &branchName, &manager, &address, &directions); err != nil {
			log.Printf("GetBranchesForSelect scan error: %v", err)
			return nil, err
		}

		managerStr := ""
		if manager != nil {
			managerStr = *manager
		}

		addressStr := ""
		if address != nil {
			addressStr = *address
		}

		directionsStr := ""
		if directions != nil {
			directionsStr = *directions
		}

		log.Printf("GetBranchesForSelect - Branch %d (%s): manager='%s', address='%s', directions='%s'", 
			seq, alias, managerStr, addressStr, directionsStr)

		branches = append(branches, map[string]string{
			"seq":        fmt.Sprintf("%d", seq),
			"alias":      alias,
			"name":       branchName,
			"manager":    managerStr,
			"address":    addressStr,
			"directions": directionsStr,
		})
	}

	if err = rows.Err(); err != nil {
		log.Printf("GetBranchesForSelect rows error: %v", err)
		return nil, err
	}

	log.Printf("GetBranchesForSelect: %d branches loaded", len(branches))
	return branches, nil
}
