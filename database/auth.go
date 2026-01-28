package database

import (
	"database/sql"
	"log"
)

// User - 사용자 정보 구조체
type User struct {
	Seq          int
	BranchSeq    sql.NullInt64
	UserID       string
	UserPassword string
}

// AuthenticateUser - 사용자 인증 (DB 기반, 평문 비밀번호)
// user_id로 사용자를 조회하고 평문으로 비밀번호 검증
// 반환: (인증 성공 여부, 사용자 seq)
func AuthenticateUser(username, password string) (bool, int) {
	log.Printf("Authentication attempt - Username: %s", username)

	// DB에서 사용자 정보 조회
	var user User
	query := `SELECT seq, branch_seq, user_id, user_password 
	          FROM user_info 
	          WHERE user_id = ?`

	err := DB.QueryRow(query, username).Scan(
		&user.Seq,
		&user.BranchSeq,
		&user.UserID,
		&user.UserPassword,
	)

	if err != nil {
		if err == sql.ErrNoRows {
			log.Printf("Authentication failed - User not found: %s", username)
		} else {
			log.Printf("Authentication error - Database query failed: %v", err)
		}
		return false, 0
	}

	// 평문 비밀번호 비교 (테스트용)
	if user.UserPassword != password {
		log.Printf("Authentication failed - Invalid password for user: %s", username)
		return false, 0
	}

	log.Printf("Authentication successful for user: %s (seq: %d)", username, user.Seq)
	return true, user.Seq
}
