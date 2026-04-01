package database

import (
	"log"
)

// Membership - 멤버십 정보 구조체
type Membership struct {
	Seq            int    `json:"seq"`
	Name           string `json:"name"`
	Duration       int    `json:"duration"`
	Count          int    `json:"count"`
	Price          int    `json:"price"`
	CreatedDate    string `json:"created_date"`
	LastUpdateDate string `json:"last_update_date"`
}

// InsertMembership - 멤버십 추가
func InsertMembership(name string, duration, count, price int) (int64, error) {
	query := `INSERT INTO memberships (name, duration, count, price, createdDate) 
	          VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)`

	result, err := DB.Exec(query, name, duration, count, price)
	if err != nil {
		log.Printf("InsertMembership error: %v", err)
		return 0, err
	}

	id, err := result.LastInsertId()
	if err != nil {
		log.Printf("InsertMembership get last insert id error: %v", err)
		return 0, err
	}

	log.Printf("InsertMembership success - ID: %d, Name: %s", id, name)
	return id, nil
}

// UpdateMembership - 멤버십 수정
func UpdateMembership(id int, name string, duration, count, price int) (int64, error) {
	query := `UPDATE memberships 
	          SET name = ?, duration = ?, count = ?, price = ?, lastUpdateDate = CURRENT_TIMESTAMP 
	          WHERE seq = ?`

	result, err := DB.Exec(query, name, duration, count, price, id)
	if err != nil {
		log.Printf("UpdateMembership error: %v", err)
		return 0, err
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		log.Printf("UpdateMembership get rows affected error: %v", err)
		return 0, err
	}

	log.Printf("UpdateMembership success - ID: %d, Rows: %d", id, rowsAffected)
	return rowsAffected, nil
}

// DeleteMembership - 멤버십 삭제
func DeleteMembership(id int) (int64, error) {
	query := `DELETE FROM memberships WHERE seq = ?`

	result, err := DB.Exec(query, id)
	if err != nil {
		log.Printf("DeleteMembership error: %v", err)
		return 0, err
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		log.Printf("DeleteMembership get rows affected error: %v", err)
		return 0, err
	}

	log.Printf("DeleteMembership success - ID: %d, Rows: %d", id, rowsAffected)
	return rowsAffected, nil
}

// GetMembershipByID - ID로 멤버십 조회
func GetMembershipByID(id int) (*Membership, error) {
	query := `SELECT seq, name, duration, count, price, 
	          DATE_FORMAT(createdDate, '%Y-%m-%d %H:%i:%s') as createdDate, 
	          DATE_FORMAT(lastUpdateDate, '%Y-%m-%d %H:%i:%s') as lastUpdateDate 
	          FROM memberships 
	          WHERE seq = ?`

	var m Membership
	var lastUpdateDate *string

	err := DB.QueryRow(query, id).Scan(&m.Seq, &m.Name, &m.Duration, &m.Count, &m.Price, &m.CreatedDate, &lastUpdateDate)
	if err != nil {
		log.Printf("GetMembershipByID error: %v", err)
		return nil, err
	}

	if lastUpdateDate != nil {
		m.LastUpdateDate = *lastUpdateDate
	}

	return &m, nil
}

// GetAllMemberships - 모든 멤버십 조회
func GetAllMemberships() ([]Membership, error) {
	query := `SELECT seq, name, duration, count, price, 
	          DATE_FORMAT(createdDate, '%Y-%m-%d %H:%i:%s') as createdDate, 
	          DATE_FORMAT(lastUpdateDate, '%Y-%m-%d %H:%i:%s') as lastUpdateDate 
	          FROM memberships 
	          ORDER BY createdDate DESC`

	rows, err := DB.Query(query)
	if err != nil {
		log.Printf("GetAllMemberships query error: %v", err)
		return nil, err
	}
	defer rows.Close()

	var memberships []Membership
	for rows.Next() {
		var m Membership
		var lastUpdateDate *string

		err := rows.Scan(&m.Seq, &m.Name, &m.Duration, &m.Count, &m.Price, &m.CreatedDate, &lastUpdateDate)
		if err != nil {
			log.Printf("GetAllMemberships scan error: %v", err)
			return nil, err
		}

		if lastUpdateDate != nil {
			m.LastUpdateDate = *lastUpdateDate
		}

		memberships = append(memberships, m)
	}

	return memberships, nil
}
