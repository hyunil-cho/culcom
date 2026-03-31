package database

import (
	"log"
)

// InsertRefundRequest - 환불 요청 등록
func InsertRefundRequest(branchSeq, memberSeq, memberMembershipSeq int, memberName, phoneNumber, membershipName, price, reason, bankName, accountNumber, accountHolder string) (int64, error) {
	query := `
		INSERT INTO complex_refund_requests
			(branch_seq, member_seq, member_membership_seq, member_name, phone_number,
			 membership_name, price, reason, bank_name, account_number, account_holder)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
	`
	result, err := DB.Exec(query, branchSeq, memberSeq, memberMembershipSeq, memberName, phoneNumber,
		membershipName, price, reason, bankName, accountNumber, accountHolder)
	if err != nil {
		log.Printf("InsertRefundRequest error: %v", err)
		return 0, err
	}

	id, err := result.LastInsertId()
	if err != nil {
		log.Printf("InsertRefundRequest get last insert id error: %v", err)
		return 0, err
	}

	log.Printf("InsertRefundRequest 완료 - ID: %d, Name: %s", id, memberName)
	return id, nil
}

// GetRefundRequestsByBranch - 지점별 환불 요청 목록 조회
func GetRefundRequestsByBranch(branchSeq int) ([]map[string]interface{}, error) {
	query := `
		SELECT seq, member_name, phone_number, membership_name, price,
			reason, bank_name, account_number, account_holder,
			status, IFNULL(reject_reason, '') as reject_reason,
			DATE_FORMAT(createdDate, '%Y-%m-%d %H:%i') as createdDate
		FROM complex_refund_requests
		WHERE branch_seq = ?
		ORDER BY createdDate DESC
	`

	rows, err := DB.Query(query, branchSeq)
	if err != nil {
		log.Printf("GetRefundRequestsByBranch error: %v", err)
		return nil, err
	}
	defer rows.Close()

	var requests []map[string]interface{}
	for rows.Next() {
		var seq int
		var memberName, phoneNumber, membershipName, price, reason, bankName, accountNumber, accountHolder, status, rejectReason, createdDate string

		if err := rows.Scan(&seq, &memberName, &phoneNumber, &membershipName, &price,
			&reason, &bankName, &accountNumber, &accountHolder,
			&status, &rejectReason, &createdDate); err != nil {
			log.Printf("GetRefundRequestsByBranch scan error: %v", err)
			continue
		}

		requests = append(requests, map[string]interface{}{
			"seq":             seq,
			"member_name":     memberName,
			"phone_number":    phoneNumber,
			"membership_name": membershipName,
			"price":           price,
			"reason":          reason,
			"bank_name":       bankName,
			"account_number":  accountNumber,
			"account_holder":  accountHolder,
			"status":          status,
			"reject_reason":   rejectReason,
			"created_date":    createdDate,
		})
	}

	return requests, nil
}
