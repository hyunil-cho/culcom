package database

import (
	"database/sql"
	"log"
	"strings"
)

// EntityLabel - 범용 엔티티 레이블 (key-value 메타정보)
type EntityLabel struct {
	Seq        int
	EntityType string
	EntitySeq  int
	LabelKey   string
	LabelVal   string
}

// InsertEntityLabel - 레이블 1건 추가
func InsertEntityLabel(entityType string, entitySeq int, key, value string) (int64, error) {
	query := `INSERT INTO entity_labels (entity_type, entity_seq, label_key, label_val) VALUES (?, ?, ?, ?)`
	result, err := DB.Exec(query, entityType, entitySeq, key, value)
	if err != nil {
		log.Printf("InsertEntityLabel error: %v", err)
		return 0, err
	}
	return result.LastInsertId()
}

// InsertEntityLabelsInTx - 트랜잭션 내에서 레이블 여러 건 추가
func InsertEntityLabelsInTx(tx *sql.Tx, entityType string, entitySeq int64, labels []EntityLabel) error {
	for _, l := range labels {
		_, err := tx.Exec(
			`INSERT INTO entity_labels (entity_type, entity_seq, label_key, label_val) VALUES (?, ?, ?, ?)`,
			entityType, entitySeq, l.LabelKey, l.LabelVal,
		)
		if err != nil {
			return err
		}
	}
	return nil
}

// GetEntityLabels - 특정 엔티티의 레이블 목록 조회
func GetEntityLabels(entityType string, entitySeq int) ([]EntityLabel, error) {
	query := `SELECT seq, entity_type, entity_seq, label_key, label_val
		FROM entity_labels WHERE entity_type = ? AND entity_seq = ? ORDER BY seq ASC`
	rows, err := DB.Query(query, entityType, entitySeq)
	if err != nil {
		log.Printf("GetEntityLabels error: %v", err)
		return nil, err
	}
	defer rows.Close()

	var labels []EntityLabel
	for rows.Next() {
		var l EntityLabel
		if err := rows.Scan(&l.Seq, &l.EntityType, &l.EntitySeq, &l.LabelKey, &l.LabelVal); err != nil {
			continue
		}
		labels = append(labels, l)
	}
	return labels, nil
}

// GetEntityLabelsForMultiple - 여러 엔티티의 레이블을 한 번에 조회 (map[entitySeq][]EntityLabel)
func GetEntityLabelsForMultiple(entityType string, entitySeqs []int) (map[int][]EntityLabel, error) {
	result := make(map[int][]EntityLabel)
	if len(entitySeqs) == 0 {
		return result, nil
	}

	placeholders := make([]string, len(entitySeqs))
	args := make([]any, 0, len(entitySeqs)+1)
	args = append(args, entityType)
	for i, seq := range entitySeqs {
		placeholders[i] = "?"
		args = append(args, seq)
	}

	query := `SELECT seq, entity_type, entity_seq, label_key, label_val
		FROM entity_labels
		WHERE entity_type = ? AND entity_seq IN (` + strings.Join(placeholders, ",") + `)
		ORDER BY seq ASC`

	rows, err := DB.Query(query, args...)
	if err != nil {
		log.Printf("GetEntityLabelsForMultiple error: %v", err)
		return nil, err
	}
	defer rows.Close()

	for rows.Next() {
		var l EntityLabel
		if err := rows.Scan(&l.Seq, &l.EntityType, &l.EntitySeq, &l.LabelKey, &l.LabelVal); err != nil {
			continue
		}
		result[l.EntitySeq] = append(result[l.EntitySeq], l)
	}
	return result, nil
}

// DeleteEntityLabel - 특정 레이블 1건 삭제
func DeleteEntityLabel(entityType string, entitySeq int, key, value string) (int64, error) {
	query := `DELETE FROM entity_labels WHERE entity_type = ? AND entity_seq = ? AND label_key = ? AND label_val = ?`
	res, err := DB.Exec(query, entityType, entitySeq, key, value)
	if err != nil {
		log.Printf("DeleteEntityLabel error: %v", err)
		return 0, err
	}
	return res.RowsAffected()
}

// DeleteEntityLabelsAll - 특정 엔티티의 모든 레이블 삭제
func DeleteEntityLabelsAll(entityType string, entitySeq int) (int64, error) {
	query := `DELETE FROM entity_labels WHERE entity_type = ? AND entity_seq = ?`
	res, err := DB.Exec(query, entityType, entitySeq)
	if err != nil {
		log.Printf("DeleteEntityLabelsAll error: %v", err)
		return 0, err
	}
	return res.RowsAffected()
}
