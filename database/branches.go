package database

import (
	"log"
)

// InsertBranch - 지점 추가
// 파라미터: name (지점명), alias (별칭)
// 반환: 생성된 ID, 에러
func InsertBranch(name, alias string) (int64, error) {
	// TODO: 실제 쿼리 구현
	// 예시:
	// query := `INSERT INTO branches (name, alias, created_at) VALUES (?, ?, NOW())`
	// result, err := Exec(query, name, alias)
	// if err != nil {
	// 	return 0, err
	// }
	// return result.LastInsertId()

	log.Printf("[DB 추상화] InsertBranch 호출 - name: %s, alias: %s", name, alias)

	// 임시로 성공 응답 (실제 구현 전까지)
	return 1, nil
}

// UpdateBranch - 지점 수정
// 파라미터: id (지점 ID), name (지점명), alias (별칭)
// 반환: 영향받은 행 수, 에러
func UpdateBranch(id int, name, alias string) (int64, error) {
	// TODO: 실제 쿼리 구현
	// 예시:
	// query := `UPDATE branches SET name = ?, alias = ?, updated_at = NOW() WHERE id = ?`
	// result, err := Exec(query, name, alias, id)
	// if err != nil {
	// 	return 0, err
	// }
	// return result.RowsAffected()

	log.Printf("[DB 추상화] UpdateBranch 호출 - id: %d, name: %s, alias: %s", id, name, alias)

	// 임시로 성공 응답 (실제 구현 전까지)
	return 1, nil
}

// DeleteBranch - 지점 삭제
// 파라미터: id (지점 ID)
// 반환: 영향받은 행 수, 에러
func DeleteBranch(id int) (int64, error) {
	// TODO: 실제 쿼리 구현
	// 예시:
	// query := `DELETE FROM branches WHERE id = ?`
	// result, err := Exec(query, id)
	// if err != nil {
	// 	return 0, err
	// }
	// return result.RowsAffected()

	log.Printf("[DB 추상화] DeleteBranch 호출 - id: %d", id)

	// 임시로 성공 응답 (실제 구현 전까지)
	return 1, nil
}

// GetBranchByID - ID로 지점 조회
// 파라미터: id (지점 ID)
// 반환: 지점 정보 (map), 에러
func GetBranchByID(id int) (map[string]interface{}, error) {
	// TODO: 실제 쿼리 구현
	// 예시:
	// query := `SELECT id, name, alias, created_at FROM branches WHERE id = ?`
	// row := QueryRow(query, id)
	// var branch map[string]interface{}
	// err := row.Scan(&branch["id"], &branch["name"], &branch["alias"], &branch["created_at"])
	// return branch, err

	log.Printf("[DB 추상화] GetBranchByID 호출 - id: %d", id)

	// 임시로 더미 데이터 반환 (실제 구현 전까지)
	return map[string]interface{}{
		"id":    id,
		"name":  "테스트 지점",
		"alias": "test",
	}, nil
}

// GetAllBranches - 모든 지점 조회
// 반환: 지점 목록, 에러
func GetAllBranches() ([]map[string]interface{}, error) {
	// TODO: 실제 쿼리 구현
	// 예시:
	// query := `SELECT id, name, alias, created_at FROM branches ORDER BY created_at DESC`
	// rows, err := Query(query)
	// if err != nil {
	// 	return nil, err
	// }
	// defer rows.Close()
	//
	// var branches []map[string]interface{}
	// for rows.Next() {
	// 	var branch map[string]interface{}
	// 	err := rows.Scan(&branch["id"], &branch["name"], &branch["alias"], &branch["created_at"])
	// 	if err != nil {
	// 		return nil, err
	// 	}
	// 	branches = append(branches, branch)
	// }
	// return branches, nil

	log.Println("[DB 추상화] GetAllBranches 호출")

	// 임시 더미 데이터 반환 (페이지네이션 테스트를 위해 더 많은 데이터)
	dummyBranches := []map[string]interface{}{
		{"id": 1, "name": "가산점", "alias": "gasan", "created_at": "2025-01-15 10:30:00"},
		{"id": 2, "name": "강남점", "alias": "gangnam", "created_at": "2025-02-01 14:20:00"},
		{"id": 3, "name": "홍대점", "alias": "hongdae", "created_at": "2025-02-10 09:15:00"},
		{"id": 4, "name": "신촌점", "alias": "sinchon", "created_at": "2025-03-05 16:45:00"},
		{"id": 5, "name": "판교점", "alias": "pangyo", "created_at": "2025-03-15 11:00:00"},
		{"id": 6, "name": "부산점", "alias": "busan", "created_at": "2025-03-20 13:30:00"},
		{"id": 7, "name": "대구점", "alias": "daegu", "created_at": "2025-04-01 09:00:00"},
		{"id": 8, "name": "인천점", "alias": "incheon", "created_at": "2025-04-10 10:15:00"},
		{"id": 9, "name": "광주점", "alias": "gwangju", "created_at": "2025-04-15 14:40:00"},
		{"id": 10, "name": "대전점", "alias": "daejeon", "created_at": "2025-04-20 15:20:00"},
		{"id": 11, "name": "수원점", "alias": "suwon", "created_at": "2025-05-01 11:10:00"},
		{"id": 12, "name": "울산점", "alias": "ulsan", "created_at": "2025-05-05 12:00:00"},
		{"id": 13, "name": "청주점", "alias": "cheongju", "created_at": "2025-05-10 13:25:00"},
		{"id": 14, "name": "천안점", "alias": "cheonan", "created_at": "2025-05-15 14:50:00"},
		{"id": 15, "name": "전주점", "alias": "jeonju", "created_at": "2025-05-20 16:00:00"},
	}

	return dummyBranches, nil
}

// GetFirstBranchAlias - 첫 번째 지점의 alias(코드)를 반환
// 반환: 지점 alias, 에러
func GetFirstBranchAlias() (string, error) {
	// TODO: 실제 쿼리 구현
	// 예시:
	// query := `SELECT alias FROM branches ORDER BY created_at ASC LIMIT 1`
	// var alias string
	// err := QueryRow(query).Scan(&alias)
	// if err != nil {
	// 		return "", err
	// }
	// return alias, nil

	log.Println("[DB 추상화] GetFirstBranchAlias 호출")

	// 임시 더미 데이터: 첫 번째 지점의 alias 반환
	return "gasan", nil
}
