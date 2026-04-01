package database

import (
	"database/sql"
	"log"
)

const EntityTypePostponementReason = "postponement_reason"

// PostponementReason - 연기사유 항목
type PostponementReason struct {
	Seq            int
	BranchSeq      int
	Label          string
	CreatedDate    string
	LastUpdateDate *string
}

// InsertPostponementReasonWithLabels - 연기사유 + 레이블 일괄 추가 (트랜잭션)
func InsertPostponementReasonWithLabels(branchSeq int, label string, labels []EntityLabel) (int64, error) {
	var reasonID int64

	err := Transaction(func(tx *sql.Tx) error {
		result, err := tx.Exec(
			`INSERT INTO complex_postponement_reasons (branch_seq, label) VALUES (?, ?)`,
			branchSeq, label,
		)
		if err != nil {
			return err
		}
		reasonID, err = result.LastInsertId()
		if err != nil {
			return err
		}

		if len(labels) > 0 {
			return InsertEntityLabelsInTx(tx, EntityTypePostponementReason, reasonID, labels)
		}
		return nil
	})

	if err != nil {
		log.Printf("InsertPostponementReasonWithLabels error: %v", err)
		return 0, err
	}
	log.Printf("InsertPostponementReasonWithLabels success - ID: %d, Label: %s, Labels: %d", reasonID, label, len(labels))
	return reasonID, nil
}

// GetPostponementReasonsByBranch - 지점별 연기사유 목록 조회 (레이블 포함)
func GetPostponementReasonsByBranch(branchSeq int) ([]PostponementReason, map[int][]EntityLabel, error) {
	query := `
		SELECT seq, branch_seq, label,
			DATE_FORMAT(createdDate, '%Y-%m-%d %H:%i') as createdDate,
			DATE_FORMAT(lastUpdateDate, '%Y-%m-%d %H:%i') as lastUpdateDate
		FROM complex_postponement_reasons
		WHERE branch_seq = ?
		ORDER BY seq ASC
	`
	rows, err := DB.Query(query, branchSeq)
	if err != nil {
		log.Printf("GetPostponementReasonsByBranch error: %v", err)
		return nil, nil, err
	}
	defer rows.Close()

	var reasons []PostponementReason
	var reasonIDs []int
	for rows.Next() {
		var r PostponementReason
		if err := rows.Scan(&r.Seq, &r.BranchSeq, &r.Label, &r.CreatedDate, &r.LastUpdateDate); err != nil {
			log.Printf("GetPostponementReasonsByBranch scan error: %v", err)
			continue
		}
		reasons = append(reasons, r)
		reasonIDs = append(reasonIDs, r.Seq)
	}

	labelsMap, err := GetEntityLabelsForMultiple(EntityTypePostponementReason, reasonIDs)
	if err != nil {
		log.Printf("GetPostponementReasonsByBranch labels error: %v", err)
		labelsMap = make(map[int][]EntityLabel)
	}

	return reasons, labelsMap, nil
}

// DeletePostponementReason - 연기사유 삭제 (entity_labels도 같이 삭제)
func DeletePostponementReason(id int) (int64, error) {
	var rowsAffected int64

	err := Transaction(func(tx *sql.Tx) error {
		// 레이블 먼저 삭제
		_, err := tx.Exec(
			`DELETE FROM entity_labels WHERE entity_type = ? AND entity_seq = ?`,
			EntityTypePostponementReason, id,
		)
		if err != nil {
			return err
		}

		// 사유 삭제
		result, err := tx.Exec(`DELETE FROM complex_postponement_reasons WHERE seq = ?`, id)
		if err != nil {
			return err
		}
		rowsAffected, err = result.RowsAffected()
		return err
	})

	if err != nil {
		log.Printf("DeletePostponementReason error: %v", err)
		return 0, err
	}
	log.Printf("DeletePostponementReason success - ID: %d, Rows: %d", id, rowsAffected)
	return rowsAffected, nil
}
