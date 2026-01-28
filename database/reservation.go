package database

import (
	"log"
	"time"
)

// CreateReservation - 예약 정보 생성
// 파라미터: branchSeq - 지점 seq, customerSeq - 고객 seq, userSeq - 사용자 seq, caller - 호출자 구분, interviewDate - 상담 일시
// 반환: 생성된 예약 ID, 에러
func CreateReservation(branchSeq, customerSeq, userSeq int, caller string, interviewDate time.Time) (int64, error) {
	log.Printf("[Reservation] CreateReservation 호출 - BranchSeq: %d, CustomerSeq: %d, UserSeq: %d, Caller: %s, InterviewDate: %v\n",
		branchSeq, customerSeq, userSeq, caller, interviewDate)

	query := `
		INSERT INTO reservation_info 
			(branch_seq, customer_id, user_seq, caller, interview_date, createdDate, lastUpdateDate)
		VALUES (?, ?, ?, ?, ?, CURDATE(), CURDATE())
	`

	result, err := DB.Exec(query, branchSeq, customerSeq, userSeq, caller, interviewDate)
	if err != nil {
		log.Printf("CreateReservation - insert error: %v", err)
		return 0, err
	}

	id, err := result.LastInsertId()
	if err != nil {
		log.Printf("CreateReservation - get last insert id error: %v", err)
		return 0, err
	}

	log.Printf("[Reservation] CreateReservation 완료 - ID: %d\n", id)
	return id, nil
}
