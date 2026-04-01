package database

import (
	"database/sql"
	"log"
)

// ComplexPostponementRequest - 수업 연기 요청
type ComplexPostponementRequest struct {
	Seq            int
	BranchSeq      int
	BranchName     string
	MemberName     string
	PhoneNumber    string
	TimeSlot       string
	CurrentClass   string
	StartDate      string
	EndDate        string
	Reason         string
	Status         string
	RejectReason   *string
	CreatedDate    string
	LastUpdateDate *string
}

// PostponementStatusHistory - 상태 변경 이력
type PostponementStatusHistory struct {
	Seq          int
	RequestSeq   int
	PrevStatus   *string
	NewStatus    string
	RejectReason *string
	ChangedBy    *string
	CreatedDate  string
}

// InsertPostponementRequest - 연기 요청 등록 (트랜잭션: 요청 INSERT + 최초 이력 INSERT)
func InsertPostponementRequest(branchSeq int, memberSeq, memberMembershipSeq *int, memberName, phoneNumber, timeSlot, currentClass, startDate, endDate, reason string) (int64, error) {
	var requestID int64

	err := Transaction(func(tx *sql.Tx) error {
		// 1. 요청 INSERT
		query := `
			INSERT INTO complex_postponement_requests
				(branch_seq, member_seq, member_membership_seq, member_name, phone_number, time_slot, current_class, start_date, end_date, reason)
			VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
		`
		result, err := tx.Exec(query, branchSeq, memberSeq, memberMembershipSeq, memberName, phoneNumber, timeSlot, currentClass, startDate, endDate, reason)
		if err != nil {
			log.Printf("InsertPostponementRequest - insert error: %v", err)
			return err
		}

		requestID, err = result.LastInsertId()
		if err != nil {
			log.Printf("InsertPostponementRequest - get last insert id error: %v", err)
			return err
		}

		// 2. 최초 상태 이력 INSERT (prev_status = NULL, new_status = '대기')
		historyQuery := `
			INSERT INTO complex_postponement_status_history
				(request_seq, prev_status, new_status, changed_by)
			VALUES (?, NULL, '대기', '시스템')
		`
		_, err = tx.Exec(historyQuery, requestID)
		if err != nil {
			log.Printf("InsertPostponementRequest - insert history error: %v", err)
			return err
		}

		return nil
	})

	if err != nil {
		return 0, err
	}

	log.Printf("InsertPostponementRequest 완료 - ID: %d, Name: %s", requestID, memberName)
	return requestID, nil
}

// GetPostponementRequestsByBranch - 지점별 연기 요청 목록 조회
func GetPostponementRequestsByBranch(branchSeq int) ([]ComplexPostponementRequest, error) {
	query := `
		SELECT p.seq, p.branch_seq, b.branchName,
			p.member_name, p.phone_number, p.time_slot, p.current_class,
			DATE_FORMAT(p.start_date, '%Y-%m-%d') as start_date,
			DATE_FORMAT(p.end_date, '%Y-%m-%d') as end_date,
			p.reason, p.status, p.reject_reason,
			DATE_FORMAT(p.createdDate, '%Y-%m-%d %H:%i') as createdDate,
			DATE_FORMAT(p.lastUpdateDate, '%Y-%m-%d %H:%i') as lastUpdateDate
		FROM complex_postponement_requests p
		LEFT JOIN branches b ON p.branch_seq = b.seq
		WHERE p.branch_seq = ?
		ORDER BY p.createdDate DESC
	`

	rows, err := DB.Query(query, branchSeq)
	if err != nil {
		log.Printf("GetPostponementRequestsByBranch error: %v", err)
		return nil, err
	}
	defer rows.Close()

	var requests []ComplexPostponementRequest
	for rows.Next() {
		var r ComplexPostponementRequest
		err := rows.Scan(
			&r.Seq, &r.BranchSeq, &r.BranchName,
			&r.MemberName, &r.PhoneNumber, &r.TimeSlot, &r.CurrentClass,
			&r.StartDate, &r.EndDate,
			&r.Reason, &r.Status, &r.RejectReason,
			&r.CreatedDate, &r.LastUpdateDate,
		)
		if err != nil {
			log.Printf("GetPostponementRequestsByBranch scan error: %v", err)
			continue
		}
		requests = append(requests, r)
	}

	return requests, nil
}

// UpdatePostponementStatus - 연기 요청 상태 변경 (트랜잭션: 상태 UPDATE + 이력 INSERT)
func UpdatePostponementStatus(id int, newStatus string, rejectReason *string, changedBy string) error {
	return Transaction(func(tx *sql.Tx) error {
		// 1. 현재 상태 조회
		var prevStatus string
		err := tx.QueryRow(`SELECT status FROM complex_postponement_requests WHERE seq = ?`, id).Scan(&prevStatus)
		if err != nil {
			log.Printf("UpdatePostponementStatus - select prev status error: %v", err)
			return err
		}

		// 2. 상태 UPDATE
		_, err = tx.Exec(
			`UPDATE complex_postponement_requests SET status = ?, reject_reason = ? WHERE seq = ?`,
			newStatus, rejectReason, id,
		)
		if err != nil {
			log.Printf("UpdatePostponementStatus - update error: %v", err)
			return err
		}

		// 3. 이력 INSERT
		_, err = tx.Exec(
			`INSERT INTO complex_postponement_status_history
				(request_seq, prev_status, new_status, reject_reason, changed_by)
			VALUES (?, ?, ?, ?, ?)`,
			id, prevStatus, newStatus, rejectReason, changedBy,
		)
		if err != nil {
			log.Printf("UpdatePostponementStatus - insert history error: %v", err)
			return err
		}

		log.Printf("UpdatePostponementStatus 완료 - ID: %d, %s → %s", id, prevStatus, newStatus)
		return nil
	})
}

// GetPostponementStatusHistory - 특정 요청의 상태 변경 이력 조회
func GetPostponementStatusHistory(requestSeq int) ([]PostponementStatusHistory, error) {
	query := `
		SELECT seq, request_seq, prev_status, new_status, reject_reason, changed_by,
			DATE_FORMAT(createdDate, '%Y-%m-%d %H:%i') as createdDate
		FROM complex_postponement_status_history
		WHERE request_seq = ?
		ORDER BY createdDate ASC
	`

	rows, err := DB.Query(query, requestSeq)
	if err != nil {
		log.Printf("GetPostponementStatusHistory error: %v", err)
		return nil, err
	}
	defer rows.Close()

	var history []PostponementStatusHistory
	for rows.Next() {
		var h PostponementStatusHistory
		err := rows.Scan(&h.Seq, &h.RequestSeq, &h.PrevStatus, &h.NewStatus, &h.RejectReason, &h.ChangedBy, &h.CreatedDate)
		if err != nil {
			log.Printf("GetPostponementStatusHistory scan error: %v", err)
			continue
		}
		history = append(history, h)
	}

	return history, nil
}
