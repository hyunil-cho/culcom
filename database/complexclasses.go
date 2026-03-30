package database

import (
	"database/sql"
	"log"
)

// InsertComplexClass - 수업 추가
func InsertComplexClass(branchSeq, timeSlotSeq int, staffSeq *int, name, description string, capacity int) (int64, error) {
	query := `INSERT INTO complex_classes (branch_seq, time_slot_seq, staff_seq, name, description, capacity)
	          VALUES (?, ?, ?, ?, ?, ?)`

	result, err := DB.Exec(query, branchSeq, timeSlotSeq, staffSeq, name, description, capacity)
	if err != nil {
		log.Printf("InsertComplexClass error: %v", err)
		return 0, err
	}

	id, err := result.LastInsertId()
	if err != nil {
		log.Printf("InsertComplexClass get last insert id error: %v", err)
		return 0, err
	}

	return id, nil
}

// UpdateComplexClass - 수업 수정
func UpdateComplexClass(seq, timeSlotSeq int, staffSeq *int, name, description string, capacity int) (int64, error) {
	query := `UPDATE complex_classes
	          SET time_slot_seq = ?, staff_seq = ?, name = ?, description = ?, capacity = ?
	          WHERE seq = ?`

	result, err := DB.Exec(query, timeSlotSeq, staffSeq, name, description, capacity, seq)
	if err != nil {
		log.Printf("UpdateComplexClass error: %v", err)
		return 0, err
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		log.Printf("UpdateComplexClass get rows affected error: %v", err)
		return 0, err
	}

	return rowsAffected, nil
}

// DeleteComplexClass - 수업 삭제
func DeleteComplexClass(seq int) (int64, error) {
	query := `DELETE FROM complex_classes WHERE seq = ?`

	result, err := DB.Exec(query, seq)
	if err != nil {
		log.Printf("DeleteComplexClass error: %v", err)
		return 0, err
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		log.Printf("DeleteComplexClass get rows affected error: %v", err)
		return 0, err
	}

	return rowsAffected, nil
}

// GetComplexClassBySeq - ID로 수업 조회 (시간대, 스태프 JOIN)
func GetComplexClassBySeq(seq int) (map[string]interface{}, error) {
	query := `SELECT c.seq, c.branch_seq, c.time_slot_seq, c.staff_seq,
	          c.name, c.description, c.capacity,
	          ts.name AS time_slot_name, ts.days_of_week,
	          TIME_FORMAT(ts.start_time, '%H:%i') AS start_time,
	          TIME_FORMAT(ts.end_time, '%H:%i') AS end_time,
	          s.name AS staff_name
	          FROM complex_classes c
	          JOIN class_time_slots ts ON c.time_slot_seq = ts.seq
	          LEFT JOIN complex_staffs s ON c.staff_seq = s.seq
	          WHERE c.seq = ?`

	var cSeq, branchSeq, timeSlotSeq, capacity int
	var staffSeq sql.NullInt64
	var name, description, timeSlotName, daysOfWeek, startTime, endTime string
	var staffName sql.NullString

	err := DB.QueryRow(query, seq).Scan(
		&cSeq, &branchSeq, &timeSlotSeq, &staffSeq,
		&name, &description, &capacity,
		&timeSlotName, &daysOfWeek, &startTime, &endTime,
		&staffName,
	)
	if err != nil {
		log.Printf("GetComplexClassBySeq error: %v", err)
		return nil, err
	}

	result := map[string]interface{}{
		"seq":            cSeq,
		"branch_seq":     branchSeq,
		"time_slot_seq":  timeSlotSeq,
		"staff_seq":      0,
		"name":           name,
		"description":    description,
		"capacity":       capacity,
		"time_slot_name": timeSlotName,
		"days_of_week":   daysOfWeek,
		"start_time":     startTime,
		"end_time":       endTime,
		"staff_name":     "",
	}

	if staffSeq.Valid {
		result["staff_seq"] = int(staffSeq.Int64)
	}
	if staffName.Valid {
		result["staff_name"] = staffName.String
	}

	return result, nil
}

// GetComplexClassesByBranch - 지점별 수업 목록 조회
func GetComplexClassesByBranch(branchSeq int) ([]map[string]interface{}, error) {
	query := `SELECT c.seq, c.branch_seq, c.time_slot_seq, c.staff_seq,
	          c.name, c.description, c.capacity,
	          ts.name AS time_slot_name, ts.days_of_week,
	          TIME_FORMAT(ts.start_time, '%H:%i') AS start_time,
	          TIME_FORMAT(ts.end_time, '%H:%i') AS end_time,
	          s.name AS staff_name
	          FROM complex_classes c
	          JOIN class_time_slots ts ON c.time_slot_seq = ts.seq
	          LEFT JOIN complex_staffs s ON c.staff_seq = s.seq
	          WHERE c.branch_seq = ?
	          ORDER BY ts.start_time ASC, c.name ASC`

	rows, err := DB.Query(query, branchSeq)
	if err != nil {
		log.Printf("GetComplexClassesByBranch error: %v", err)
		return nil, err
	}
	defer rows.Close()

	var classes []map[string]interface{}
	for rows.Next() {
		var cSeq, branchSeq, timeSlotSeq, capacity int
		var staffSeq sql.NullInt64
		var name, description, timeSlotName, daysOfWeek, startTime, endTime string
		var staffName sql.NullString

		if err := rows.Scan(
			&cSeq, &branchSeq, &timeSlotSeq, &staffSeq,
			&name, &description, &capacity,
			&timeSlotName, &daysOfWeek, &startTime, &endTime,
			&staffName,
		); err != nil {
			log.Printf("GetComplexClassesByBranch scan error: %v", err)
			return nil, err
		}

		class := map[string]interface{}{
			"seq":            cSeq,
			"branch_seq":     branchSeq,
			"time_slot_seq":  timeSlotSeq,
			"staff_seq":      0,
			"name":           name,
			"description":    description,
			"capacity":       capacity,
			"time_slot_name": timeSlotName,
			"days_of_week":   daysOfWeek,
			"start_time":     startTime,
			"end_time":       endTime,
			"staff_name":     "",
		}

		if staffSeq.Valid {
			class["staff_seq"] = int(staffSeq.Int64)
		}
		if staffName.Valid {
			class["staff_name"] = staffName.String
		}

		classes = append(classes, class)
	}

	return classes, nil
}

// GetStaffsByBranch - 지점별 스태프 목록 조회 (수업 폼의 드롭다운용)
func GetStaffsByBranch(branchSeq int) ([]map[string]interface{}, error) {
	query := `SELECT seq, name FROM complex_staffs
	          WHERE branch_seq = ? AND status = '재직'
	          ORDER BY name ASC`

	rows, err := DB.Query(query, branchSeq)
	if err != nil {
		log.Printf("GetStaffsByBranch error: %v", err)
		return nil, err
	}
	defer rows.Close()

	var staffs []map[string]interface{}
	for rows.Next() {
		var seq int
		var name string

		if err := rows.Scan(&seq, &name); err != nil {
			log.Printf("GetStaffsByBranch scan error: %v", err)
			return nil, err
		}

		staffs = append(staffs, map[string]interface{}{
			"seq":  seq,
			"name": name,
		})
	}

	return staffs, nil
}
