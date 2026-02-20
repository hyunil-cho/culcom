package database

import (
	"database/sql"
	"fmt"
	"log"
	"strings"
)

// KakaoCustomer - 카카오로 가입한 고객 정보
type KakaoCustomer struct {
	Seq         int
	BranchSeq   int
	BranchName  string
	Name        string
	PhoneNumber string
	KakaoID     int64
	CreatedDate string
}

// GetCustomerByKakaoID - 카카오 ID로 고객 조회
func GetCustomerByKakaoID(kakaoID int64) (*KakaoCustomer, error) {
	var customer KakaoCustomer
	var branchName sql.NullString
	query := `SELECT c.seq, c.branch_seq, COALESCE(b.branchName, ''), c.name, c.phone_number, c.kakao_id, c.createdDate
	          FROM customers c
	          LEFT JOIN branches b ON c.branch_seq = b.seq
	          WHERE c.kakao_id = ?`

	err := DB.QueryRow(query, kakaoID).Scan(
		&customer.Seq,
		&customer.BranchSeq,
		&branchName,
		&customer.Name,
		&customer.PhoneNumber,
		&customer.KakaoID,
		&customer.CreatedDate,
	)
	if err != nil {
		return nil, err
	}
	if branchName.Valid {
		customer.BranchName = branchName.String
	}
	return &customer, nil
}

// GetCustomerBySeqForMypage - seq로 고객 조회 (마이페이지용)
func GetCustomerBySeqForMypage(seq int) (*KakaoCustomer, error) {
	var customer KakaoCustomer
	var branchName sql.NullString
	var kakaoID sql.NullInt64
	query := `SELECT c.seq, c.branch_seq, COALESCE(b.branchName, ''), c.name, c.phone_number, COALESCE(c.kakao_id, 0), c.createdDate
	          FROM customers c
	          LEFT JOIN branches b ON c.branch_seq = b.seq
	          WHERE c.seq = ?`

	err := DB.QueryRow(query, seq).Scan(
		&customer.Seq,
		&customer.BranchSeq,
		&branchName,
		&customer.Name,
		&customer.PhoneNumber,
		&kakaoID,
		&customer.CreatedDate,
	)
	if err != nil {
		return nil, err
	}
	if branchName.Valid {
		customer.BranchName = branchName.String
	}
	if kakaoID.Valid {
		customer.KakaoID = kakaoID.Int64
	}
	return &customer, nil
}

// UpsertKakaoCustomer - 카카오 로그인 시 고객 등록 또는 업데이트
// 이미 존재하면 이름/전화번호 업데이트, 없으면 새로 등록
// 반환: 고객 seq
func UpsertKakaoCustomer(branchSeq int, kakaoID int64, name, phoneNumber string) (int, error) {
	// 전화번호 정리
	cleanPhone := strings.Map(func(r rune) rune {
		if r >= '0' && r <= '9' {
			return r
		}
		return -1
	}, phoneNumber)

	// 기존 카카오 회원 확인
	existing, err := GetCustomerByKakaoID(kakaoID)
	if err == nil && existing != nil {
		// 이미 존재 → 이름/전화번호 업데이트
		updateQuery := `UPDATE customers SET name = ?, phone_number = ?, lastUpdateDate = NOW() WHERE kakao_id = ?`
		_, err = DB.Exec(updateQuery, name, cleanPhone, kakaoID)
		if err != nil {
			log.Printf("카카오 고객 업데이트 실패: %v", err)
			return 0, err
		}
		log.Printf("카카오 고객 업데이트 - seq: %d, 이름: %s", existing.Seq, name)
		return existing.Seq, nil
	}

	// 신규 등록
	insertQuery := `INSERT INTO customers (branch_seq, name, phone_number, ad_source, kakao_id, call_count, status)
	                VALUES (?, ?, ?, '카카오', ?, 0, '신규')`
	result, err := DB.Exec(insertQuery, branchSeq, name, cleanPhone, kakaoID)
	if err != nil {
		log.Printf("카카오 고객 등록 실패: %v", err)
		return 0, fmt.Errorf("고객 등록에 실패했습니다: %w", err)
	}

	customerSeq, err := result.LastInsertId()
	if err != nil {
		return 0, err
	}

	log.Printf("카카오 고객 신규 등록 - seq: %d, 이름: %s, kakao_id: %d", customerSeq, name, kakaoID)
	return int(customerSeq), nil
}

// DeleteCustomerBySeq - 고객 삭제 (회원탈퇴)
func DeleteCustomerBySeq(seq int) error {
	query := `DELETE FROM customers WHERE seq = ?`
	result, err := DB.Exec(query, seq)
	if err != nil {
		log.Printf("고객 삭제 실패 (회원탈퇴) - seq: %d, error: %v", seq, err)
		return err
	}

	rowsAffected, _ := result.RowsAffected()
	log.Printf("고객 삭제 완료 (회원탈퇴) - seq: %d, 삭제 건수: %d", seq, rowsAffected)
	return nil
}
