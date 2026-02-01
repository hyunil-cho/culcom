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

// ReservationSMSConfig 예약 SMS 설정 구조체
type ReservationSMSConfig struct {
	Seq          int
	BranchSeq    int
	TemplateSeq  int
	TemplateName string
	SenderNumber string
	AutoSend     bool
}

// GetReservationSMSConfig 예약 SMS 설정 조회
func GetReservationSMSConfig(branchCode string) (*ReservationSMSConfig, error) {
	log.Printf("[DB] GetReservationSMSConfig 호출 - branchCode: %s", branchCode)

	// 지점 seq 조회
	var branchSeq int
	branchQuery := `SELECT seq FROM branches WHERE alias = ?`
	err := DB.QueryRow(branchQuery, branchCode).Scan(&branchSeq)
	if err != nil {
		log.Printf("GetReservationSMSConfig - branch not found: %v", err)
		return nil, err
	}

	// 설정 조회
	var config ReservationSMSConfig
	query := `
		SELECT rs.seq, rs.branch_seq, rs.template_seq, 
		       COALESCE(mt.template_name, ''), rs.sender_number, rs.auto_send
		FROM reservation_sms_config rs
		LEFT JOIN message_templates mt ON rs.template_seq = mt.seq
		WHERE rs.branch_seq = ?
	`
	err = DB.QueryRow(query, branchSeq).Scan(
		&config.Seq, &config.BranchSeq, &config.TemplateSeq,
		&config.TemplateName, &config.SenderNumber, &config.AutoSend,
	)
	if err != nil {
		// 설정이 없는 경우 (정상)
		return nil, err
	}

	log.Printf("[DB] GetReservationSMSConfig 완료")
	return &config, nil
}

// SaveReservationSMSConfig 예약 SMS 설정 저장
func SaveReservationSMSConfig(branchCode, templateSeq, senderNumber string, autoSend bool) error {
	log.Printf("[DB] SaveReservationSMSConfig 호출 - branchCode: %s", branchCode)

	// 지점 seq 조회
	var branchSeq int
	branchQuery := `SELECT seq FROM branches WHERE alias = ?`
	err := DB.QueryRow(branchQuery, branchCode).Scan(&branchSeq)
	if err != nil {
		log.Printf("SaveReservationSMSConfig - branch not found: %v", err)
		return err
	}

	// 기존 설정 확인
	var existingSeq int
	checkQuery := `SELECT seq FROM reservation_sms_config WHERE branch_seq = ?`
	err = DB.QueryRow(checkQuery, branchSeq).Scan(&existingSeq)

	if err != nil {
		// INSERT
		insertQuery := `
			INSERT INTO reservation_sms_config (branch_seq, template_seq, sender_number, auto_send)
			VALUES (?, ?, ?, ?)
		`
		_, err = DB.Exec(insertQuery, branchSeq, templateSeq, senderNumber, autoSend)
		if err != nil {
			log.Printf("SaveReservationSMSConfig - insert error: %v", err)
			return err
		}
		log.Printf("[DB] SaveReservationSMSConfig - 신규 생성 완료")
	} else {
		// UPDATE
		updateQuery := `
			UPDATE reservation_sms_config 
			SET template_seq = ?, sender_number = ?, auto_send = ?
			WHERE seq = ?
		`
		_, err = DB.Exec(updateQuery, templateSeq, senderNumber, autoSend, existingSeq)
		if err != nil {
			log.Printf("SaveReservationSMSConfig - update error: %v", err)
			return err
		}
		log.Printf("[DB] SaveReservationSMSConfig - 업데이트 완료")
	}

	return nil
}
