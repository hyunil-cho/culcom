package database

import (
	"database/sql"
	"log"
	"strings"
)

// ComplexStaff - 스태프 정보 (complex_staffs + complex_staff_refund_info JOIN)
type ComplexStaff struct {
	Seq                  int
	BranchSeq            int
	BranchName           string
	Name                 string
	PhoneNumber          *string
	Email                *string
	Subject              *string
	Status               string
	JoinDate             *string
	Comment              *string
	Interviewer          *string
	PaymentMethod        *string
	AssignedClassIDs     string // 쉼표 구분 수업 ID 목록
	DepositAmount        *string
	RefundableDeposit    *string
	NonRefundableDeposit *string
	RefundBank           *string
	RefundAccount        *string
	RefundAmount         *string
}

// GetStaffListByBranch - 지점별 스태프 목록 조회 (상세정보 포함)
func GetStaffListByBranch(branchSeq int) ([]ComplexStaff, error) {
	query := `
		SELECT
			s.seq, s.branch_seq, b.branchName,
			s.name, s.phone_number, s.email, s.subject,
			s.status, DATE_FORMAT(s.join_date, '%Y-%m-%d') as join_date,
			s.comment, s.interviewer, s.payment_method,
			COALESCE(GROUP_CONCAT(m.class_time_slot_seq ORDER BY m.class_time_slot_seq), '') as assigned_class_ids,
			r.deposit_amount, r.refundable_deposit, r.non_refundable_deposit,
			r.refund_bank, r.refund_account, r.refund_amount
		FROM complex_staffs s
		LEFT JOIN branches b ON s.branch_seq = b.seq
		LEFT JOIN complex_staff_refund_info r ON s.seq = r.staff_seq
		LEFT JOIN complex_staff_class_mapping m ON s.seq = m.staff_seq
		WHERE s.branch_seq = ?
		GROUP BY s.seq
		ORDER BY s.createdDate DESC
	`

	rows, err := DB.Query(query, branchSeq)
	if err != nil {
		log.Printf("GetStaffsByBranch - query error: %v", err)
		return nil, err
	}
	defer rows.Close()

	var staffs []ComplexStaff
	for rows.Next() {
		var s ComplexStaff
		err := rows.Scan(
			&s.Seq, &s.BranchSeq, &s.BranchName,
			&s.Name, &s.PhoneNumber, &s.Email, &s.Subject,
			&s.Status, &s.JoinDate,
			&s.Comment, &s.Interviewer, &s.PaymentMethod,
			&s.AssignedClassIDs,
			&s.DepositAmount, &s.RefundableDeposit, &s.NonRefundableDeposit,
			&s.RefundBank, &s.RefundAccount, &s.RefundAmount,
		)
		if err != nil {
			log.Printf("GetStaffsByBranch - scan error: %v", err)
			continue
		}
		staffs = append(staffs, s)
	}

	if err = rows.Err(); err != nil {
		log.Printf("GetStaffsByBranch - rows error: %v", err)
		return nil, err
	}

	return staffs, nil
}

// GetStaffByID - ID로 스태프 조회 (환급정보 + 수업매핑 포함)
func GetStaffByID(id int) (*ComplexStaff, error) {
	query := `
		SELECT
			s.seq, s.branch_seq, b.branchName,
			s.name, s.phone_number, s.email, s.subject,
			s.status, DATE_FORMAT(s.join_date, '%Y-%m-%d') as join_date,
			s.comment, s.interviewer, s.payment_method,
			COALESCE(GROUP_CONCAT(m.class_time_slot_seq ORDER BY m.class_time_slot_seq), '') as assigned_class_ids,
			r.deposit_amount, r.refundable_deposit, r.non_refundable_deposit,
			r.refund_bank, r.refund_account, r.refund_amount
		FROM complex_staffs s
		LEFT JOIN branches b ON s.branch_seq = b.seq
		LEFT JOIN complex_staff_refund_info r ON s.seq = r.staff_seq
		LEFT JOIN complex_staff_class_mapping m ON s.seq = m.staff_seq
		WHERE s.seq = ?
		GROUP BY s.seq
	`

	var s ComplexStaff
	err := DB.QueryRow(query, id).Scan(
		&s.Seq, &s.BranchSeq, &s.BranchName,
		&s.Name, &s.PhoneNumber, &s.Email, &s.Subject,
		&s.Status, &s.JoinDate,
		&s.Comment, &s.Interviewer, &s.PaymentMethod,
		&s.AssignedClassIDs,
		&s.DepositAmount, &s.RefundableDeposit, &s.NonRefundableDeposit,
		&s.RefundBank, &s.RefundAccount, &s.RefundAmount,
	)
	if err != nil {
		log.Printf("GetStaffByID - query error (id=%d): %v", id, err)
		return nil, err
	}

	return &s, nil
}

// InsertStaff - 스태프 신규 등록 (트랜잭션: staffs + refund_info + class_mapping)
func InsertStaff(
	branchSeq int,
	name string, phoneNumber, email, subject *string,
	status string, joinDate, comment, interviewer, paymentMethod *string,
	depositAmount, refundableDeposit, nonRefundableDeposit, refundBank, refundAccount, refundAmount *string,
	classIDs []int,
) (int64, error) {
	var staffID int64

	err := Transaction(func(tx *sql.Tx) error {
		// 1. complex_staffs INSERT
		staffQuery := `
			INSERT INTO complex_staffs
				(branch_seq, name, phone_number, email, subject, status, join_date, comment, interviewer, payment_method)
			VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
		`
		result, err := tx.Exec(staffQuery, branchSeq, name, phoneNumber, email, subject, status, joinDate, comment, interviewer, paymentMethod)
		if err != nil {
			log.Printf("InsertStaff - insert staff error: %v", err)
			return err
		}

		staffID, err = result.LastInsertId()
		if err != nil {
			log.Printf("InsertStaff - get last insert id error: %v", err)
			return err
		}

		// 2. complex_staff_refund_info INSERT
		refundQuery := `
			INSERT INTO complex_staff_refund_info
				(staff_seq, deposit_amount, refundable_deposit, non_refundable_deposit, refund_bank, refund_account, refund_amount)
			VALUES (?, ?, ?, ?, ?, ?, ?)
		`
		_, err = tx.Exec(refundQuery, staffID, depositAmount, refundableDeposit, nonRefundableDeposit, refundBank, refundAccount, refundAmount)
		if err != nil {
			log.Printf("InsertStaff - insert refund info error: %v", err)
			return err
		}

		// 3. complex_staff_class_mapping INSERT (배정된 수업이 있는 경우)
		if len(classIDs) > 0 {
			mappingQuery := `INSERT INTO complex_staff_class_mapping (staff_seq, class_time_slot_seq) VALUES (?, ?)`
			for _, classID := range classIDs {
				_, err = tx.Exec(mappingQuery, staffID, classID)
				if err != nil {
					log.Printf("InsertStaff - insert class mapping error (classID=%d): %v", classID, err)
					return err
				}
			}
		}

		return nil
	})

	if err != nil {
		return 0, err
	}

	log.Printf("InsertStaff 완료 - StaffID: %d, Name: %s", staffID, name)
	return staffID, nil
}

// UpdateStaff - 스태프 정보 수정 (트랜잭션: staffs + refund_info + class_mapping)
func UpdateStaff(
	id, branchSeq int,
	name string, phoneNumber, email, subject *string,
	status string, joinDate, comment, interviewer, paymentMethod *string,
	depositAmount, refundableDeposit, nonRefundableDeposit, refundBank, refundAccount, refundAmount *string,
	classIDs []int,
) error {
	return Transaction(func(tx *sql.Tx) error {
		// 1. complex_staffs UPDATE
		staffQuery := `
			UPDATE complex_staffs
			SET branch_seq = ?, name = ?, phone_number = ?, email = ?, subject = ?,
				status = ?, join_date = ?, comment = ?, interviewer = ?, payment_method = ?
			WHERE seq = ?
		`
		_, err := tx.Exec(staffQuery, branchSeq, name, phoneNumber, email, subject, status, joinDate, comment, interviewer, paymentMethod, id)
		if err != nil {
			log.Printf("UpdateStaff - update staff error: %v", err)
			return err
		}

		// 2. complex_staff_refund_info UPSERT (INSERT ON DUPLICATE KEY UPDATE)
		refundQuery := `
			INSERT INTO complex_staff_refund_info
				(staff_seq, deposit_amount, refundable_deposit, non_refundable_deposit, refund_bank, refund_account, refund_amount)
			VALUES (?, ?, ?, ?, ?, ?, ?)
			ON DUPLICATE KEY UPDATE
				deposit_amount = VALUES(deposit_amount),
				refundable_deposit = VALUES(refundable_deposit),
				non_refundable_deposit = VALUES(non_refundable_deposit),
				refund_bank = VALUES(refund_bank),
				refund_account = VALUES(refund_account),
				refund_amount = VALUES(refund_amount)
		`
		_, err = tx.Exec(refundQuery, id, depositAmount, refundableDeposit, nonRefundableDeposit, refundBank, refundAccount, refundAmount)
		if err != nil {
			log.Printf("UpdateStaff - upsert refund info error: %v", err)
			return err
		}

		// 3. complex_staff_class_mapping: 기존 삭제 후 재삽입
		_, err = tx.Exec(`DELETE FROM complex_staff_class_mapping WHERE staff_seq = ?`, id)
		if err != nil {
			log.Printf("UpdateStaff - delete class mapping error: %v", err)
			return err
		}

		if len(classIDs) > 0 {
			mappingQuery := `INSERT INTO complex_staff_class_mapping (staff_seq, class_time_slot_seq) VALUES (?, ?)`
			for _, classID := range classIDs {
				_, err = tx.Exec(mappingQuery, id, classID)
				if err != nil {
					log.Printf("UpdateStaff - insert class mapping error (classID=%d): %v", classID, err)
					return err
				}
			}
		}

		return nil
	})
}

// DeleteStaff - 스태프 삭제 (CASCADE로 refund_info, class_mapping 자동 삭제)
func DeleteStaff(id int) error {
	query := `DELETE FROM complex_staffs WHERE seq = ?`
	result, err := DB.Exec(query, id)
	if err != nil {
		log.Printf("DeleteStaff - delete error: %v", err)
		return err
	}

	rowsAffected, _ := result.RowsAffected()
	log.Printf("DeleteStaff 완료 - ID: %d, Rows: %d", id, rowsAffected)
	return nil
}

// ParseClassIDs - 쉼표 구분 문자열을 int 슬라이스로 변환
func ParseClassIDs(s string) []int {
	if s == "" {
		return nil
	}
	parts := strings.Split(s, ",")
	var ids []int
	for _, p := range parts {
		p = strings.TrimSpace(p)
		if p == "" {
			continue
		}
		var id int
		for _, c := range p {
			if c >= '0' && c <= '9' {
				id = id*10 + int(c-'0')
			}
		}
		if id > 0 {
			ids = append(ids, id)
		}
	}
	return ids
}
