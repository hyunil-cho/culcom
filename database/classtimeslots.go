package database

import (
	"log"
)

// InsertClassTimeSlot - 수업 시간대 추가
func InsertClassTimeSlot(branchSeq int, name, daysOfWeek, startTime, endTime string) (int64, error) {
	query := `INSERT INTO class_time_slots (branch_seq, name, days_of_week, start_time, end_time, createdDate) 
	          VALUES (?, ?, ?, ?, ?, NOW())`

	result, err := DB.Exec(query, branchSeq, name, daysOfWeek, startTime, endTime)
	if err != nil {
		log.Printf("InsertClassTimeSlot error: %v", err)
		return 0, err
	}

	id, err := result.LastInsertId()
	if err != nil {
		log.Printf("InsertClassTimeSlot get last insert id error: %v", err)
		return 0, err
	}

	return id, nil
}

// UpdateClassTimeSlot - 수업 시간대 수정
func UpdateClassTimeSlot(seq int, name, daysOfWeek, startTime, endTime string) (int64, error) {
	query := `UPDATE class_time_slots 
	          SET name = ?, days_of_week = ?, start_time = ?, end_time = ?
	          WHERE seq = ?`

	result, err := DB.Exec(query, name, daysOfWeek, startTime, endTime, seq)
	if err != nil {
		log.Printf("UpdateClassTimeSlot error: %v", err)
		return 0, err
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		log.Printf("UpdateClassTimeSlot get rows affected error: %v", err)
		return 0, err
	}

	return rowsAffected, nil
}

// DeleteClassTimeSlot - 수업 시간대 삭제
func DeleteClassTimeSlot(seq int) (int64, error) {
	query := `DELETE FROM class_time_slots WHERE seq = ?`

	result, err := DB.Exec(query, seq)
	if err != nil {
		log.Printf("DeleteClassTimeSlot error: %v", err)
		return 0, err
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		log.Printf("DeleteClassTimeSlot get rows affected error: %v", err)
		return 0, err
	}

	return rowsAffected, nil
}

// GetClassTimeSlotBySeq - ID로 수업 시간대 조회
func GetClassTimeSlotBySeq(seq int) (map[string]interface{}, error) {
	query := `SELECT seq, branch_seq, name, days_of_week, 
	          TIME_FORMAT(start_time, '%H:%i') as start_time, 
	          TIME_FORMAT(end_time, '%H:%i') as end_time,
	          DATE_FORMAT(createdDate, '%Y-%m-%d %H:%i') as createdDate
	          FROM class_time_slots 
	          WHERE seq = ?`

	var s, branchSeq int
	var name, daysOfWeek, startTime, endTime, createdDate string

	err := DB.QueryRow(query, seq).Scan(&s, &branchSeq, &name, &daysOfWeek, &startTime, &endTime, &createdDate)
	if err != nil {
		log.Printf("GetClassTimeSlotBySeq error: %v", err)
		return nil, err
	}

	slot := map[string]interface{}{
		"seq":          s,
		"branch_seq":   branchSeq,
		"name":         name,
		"days_of_week": daysOfWeek,
		"start_time":   startTime,
		"end_time":     endTime,
		"created_at":   createdDate,
	}

	return slot, nil
}

// GetClassTimeSlotsByBranch - 지점별 수업 시간대 목록 조회
func GetClassTimeSlotsByBranch(branchSeq int) ([]map[string]interface{}, error) {
	query := `SELECT seq, branch_seq, name, days_of_week, 
	          TIME_FORMAT(start_time, '%H:%i') as start_time, 
	          TIME_FORMAT(end_time, '%H:%i') as end_time,
	          DATE_FORMAT(createdDate, '%Y-%m-%d %H:%i') as createdDate
	          FROM class_time_slots 
	          WHERE branch_seq = ?
	          ORDER BY FIELD(SUBSTRING_INDEX(days_of_week, ',', 1), '월', '화', '수', '목', '금', '토', '일'), start_time ASC`

	rows, err := DB.Query(query, branchSeq)
	if err != nil {
		log.Printf("GetClassTimeSlotsByBranch error: %v", err)
		return nil, err
	}
	defer rows.Close()

	var slots []map[string]interface{}
	for rows.Next() {
		var s, bSeq int
		var name, daysOfWeek, startTime, endTime, createdDate string

		if err := rows.Scan(&s, &bSeq, &name, &daysOfWeek, &startTime, &endTime, &createdDate); err != nil {
			log.Printf("GetClassTimeSlotsByBranch scan error: %v", err)
			return nil, err
		}

		slot := map[string]interface{}{
			"seq":          s,
			"branch_seq":   bSeq,
			"name":         name,
			"days_of_week": daysOfWeek,
			"start_time":   startTime,
			"end_time":     endTime,
			"created_at":   createdDate,
		}
		slots = append(slots, slot)
	}

	return slots, nil
}
