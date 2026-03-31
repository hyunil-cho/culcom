package database

import (
	"log"
)

// ComplexMember - 회원 전체 정보
type ComplexMember struct {
	Seq            int
	BranchSeq      int
	BranchName     string
	Name           string
	PhoneNumber    string
	Level          *string
	Language       *string
	Info           *string
	ChartNumber    *string
	Comment        *string
	JoinDate       *string
	SignupChannel  *string
	Interviewer    *string
	CreatedDate    string
	LastUpdateDate *string
}

// ComplexMemberSearchResult - 회원 검색 결과 (간략)
type ComplexMemberSearchResult struct {
	Seq         int
	BranchSeq   int
	BranchName  string
	Name        string
	PhoneNumber string
	Level       *string
	JoinDate    *string
}

// ComplexMemberMembershipInfo - 회원의 활성 멤버십 정보
type ComplexMemberMembershipInfo struct {
	Seq            int    // complex_member_memberships.seq
	MembershipName string // memberships.name
	StartDate      string
	ExpiryDate     string
	TotalCount     int
	UsedCount      int
	PostponeTotal  int
	PostponeUsed   int
	Status         string
}

// InsertComplexMember - 회원 등록
func InsertComplexMember(branchSeq int, name, phoneNumber string, level, language, info, chartNumber, comment, joinDate, signupChannel, interviewer *string) (int64, error) {
	query := `
		INSERT INTO complex_members
			(branch_seq, name, phone_number, level, language, info, chart_number, comment, join_date, signup_channel, interviewer)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
	`
	result, err := DB.Exec(query, branchSeq, name, phoneNumber, level, language, info, chartNumber, comment, joinDate, signupChannel, interviewer)
	if err != nil {
		log.Printf("InsertComplexMember error: %v", err)
		return 0, err
	}

	id, err := result.LastInsertId()
	if err != nil {
		log.Printf("InsertComplexMember get last insert id error: %v", err)
		return 0, err
	}

	log.Printf("InsertComplexMember 완료 - ID: %d, Name: %s", id, name)
	return id, nil
}

// UpdateComplexMember - 회원 정보 수정
func UpdateComplexMember(id, branchSeq int, name, phoneNumber string, level, language, info, chartNumber, comment, joinDate, signupChannel, interviewer *string) error {
	query := `
		UPDATE complex_members
		SET branch_seq = ?, name = ?, phone_number = ?, level = ?, language = ?,
			info = ?, chart_number = ?, comment = ?, join_date = ?,
			signup_channel = ?, interviewer = ?
		WHERE seq = ?
	`
	_, err := DB.Exec(query, branchSeq, name, phoneNumber, level, language, info, chartNumber, comment, joinDate, signupChannel, interviewer, id)
	if err != nil {
		log.Printf("UpdateComplexMember error: %v", err)
		return err
	}

	log.Printf("UpdateComplexMember 완료 - ID: %d", id)
	return nil
}

// DeleteComplexMember - 회원 삭제
func DeleteComplexMember(id int) error {
	_, err := DB.Exec(`DELETE FROM complex_members WHERE seq = ?`, id)
	if err != nil {
		log.Printf("DeleteComplexMember error: %v", err)
		return err
	}
	log.Printf("DeleteComplexMember 완료 - ID: %d", id)
	return nil
}

// GetComplexMemberByID - ID로 회원 조회
func GetComplexMemberByID(id int) (*ComplexMember, error) {
	query := `
		SELECT m.seq, m.branch_seq, b.branchName,
			m.name, m.phone_number, m.level, m.language, m.info,
			m.chart_number, m.comment,
			DATE_FORMAT(m.join_date, '%Y-%m-%d') as join_date,
			m.signup_channel, m.interviewer,
			DATE_FORMAT(m.createdDate, '%Y-%m-%d %H:%i') as createdDate,
			DATE_FORMAT(m.lastUpdateDate, '%Y-%m-%d %H:%i') as lastUpdateDate
		FROM complex_members m
		LEFT JOIN branches b ON m.branch_seq = b.seq
		WHERE m.seq = ?
	`

	var m ComplexMember
	err := DB.QueryRow(query, id).Scan(
		&m.Seq, &m.BranchSeq, &m.BranchName,
		&m.Name, &m.PhoneNumber, &m.Level, &m.Language, &m.Info,
		&m.ChartNumber, &m.Comment, &m.JoinDate,
		&m.SignupChannel, &m.Interviewer,
		&m.CreatedDate, &m.LastUpdateDate,
	)
	if err != nil {
		log.Printf("GetComplexMemberByID error (id=%d): %v", id, err)
		return nil, err
	}

	return &m, nil
}

// GetComplexMembersByBranch - 지점별 회원 목록 조회
func GetComplexMembersByBranch(branchSeq int) ([]ComplexMember, error) {
	query := `
		SELECT m.seq, m.branch_seq, b.branchName,
			m.name, m.phone_number, m.level, m.language, m.info,
			m.chart_number, m.comment,
			DATE_FORMAT(m.join_date, '%Y-%m-%d') as join_date,
			m.signup_channel, m.interviewer,
			DATE_FORMAT(m.createdDate, '%Y-%m-%d %H:%i') as createdDate,
			DATE_FORMAT(m.lastUpdateDate, '%Y-%m-%d %H:%i') as lastUpdateDate
		FROM complex_members m
		LEFT JOIN branches b ON m.branch_seq = b.seq
		WHERE m.branch_seq = ?
		ORDER BY m.createdDate DESC
	`

	rows, err := DB.Query(query, branchSeq)
	if err != nil {
		log.Printf("GetComplexMembersByBranch error: %v", err)
		return nil, err
	}
	defer rows.Close()

	var members []ComplexMember
	for rows.Next() {
		var m ComplexMember
		err := rows.Scan(
			&m.Seq, &m.BranchSeq, &m.BranchName,
			&m.Name, &m.PhoneNumber, &m.Level, &m.Language, &m.Info,
			&m.ChartNumber, &m.Comment, &m.JoinDate,
			&m.SignupChannel, &m.Interviewer,
			&m.CreatedDate, &m.LastUpdateDate,
		)
		if err != nil {
			log.Printf("GetComplexMembersByBranch scan error: %v", err)
			continue
		}
		members = append(members, m)
	}

	return members, nil
}

// FindComplexMemberByPhone - 전화번호로 회원 검색 (공개 API용)
func FindComplexMemberByPhone(phone string) (*ComplexMember, error) {
	query := `
		SELECT m.seq, m.branch_seq, COALESCE(b.branchName, ''),
			m.name, m.phone_number, m.level, m.language, m.info,
			m.chart_number, m.comment,
			DATE_FORMAT(m.join_date, '%Y-%m-%d') as join_date,
			m.signup_channel, m.interviewer,
			DATE_FORMAT(m.createdDate, '%Y-%m-%d %H:%i') as createdDate,
			DATE_FORMAT(m.lastUpdateDate, '%Y-%m-%d %H:%i') as lastUpdateDate
		FROM complex_members m
		LEFT JOIN branches b ON m.branch_seq = b.seq
		WHERE m.phone_number = ?
		LIMIT 1
	`

	var m ComplexMember
	err := DB.QueryRow(query, phone).Scan(
		&m.Seq, &m.BranchSeq, &m.BranchName,
		&m.Name, &m.PhoneNumber, &m.Level, &m.Language, &m.Info,
		&m.ChartNumber, &m.Comment, &m.JoinDate,
		&m.SignupChannel, &m.Interviewer,
		&m.CreatedDate, &m.LastUpdateDate,
	)
	if err != nil {
		return nil, err
	}

	return &m, nil
}

// GetClassesByMember - 회원에게 배정된 수업 목록 조회
func GetClassesByMember(memberSeq int) ([]map[string]interface{}, error) {
	query := `
		SELECT c.seq, c.name, ts.name AS time_slot_name,
			TIME_FORMAT(ts.start_time, '%H:%i') AS start_time,
			TIME_FORMAT(ts.end_time, '%H:%i') AS end_time
		FROM complex_member_class_mapping mcm
		JOIN complex_classes c ON mcm.class_seq = c.seq
		JOIN class_time_slots ts ON c.time_slot_seq = ts.seq
		WHERE mcm.member_seq = ?
		ORDER BY ts.start_time ASC
	`

	rows, err := DB.Query(query, memberSeq)
	if err != nil {
		log.Printf("GetClassesByMember error: %v", err)
		return nil, err
	}
	defer rows.Close()

	var classes []map[string]interface{}
	for rows.Next() {
		var seq int
		var name, slotName, startTime, endTime string
		if err := rows.Scan(&seq, &name, &slotName, &startTime, &endTime); err != nil {
			log.Printf("GetClassesByMember scan error: %v", err)
			continue
		}
		classes = append(classes, map[string]interface{}{
			"seq":            seq,
			"name":           name,
			"time_slot_name": slotName,
			"start_time":     startTime,
			"end_time":       endTime,
		})
	}

	return classes, nil
}

// SearchMemberByNameAndPhone - 이름+전화번호로 회원 검색
func SearchMemberByNameAndPhone(name, phone string) ([]ComplexMemberSearchResult, error) {
	query := `
		SELECT m.seq, m.branch_seq, b.branchName, m.name, m.phone_number, m.level,
			DATE_FORMAT(m.join_date, '%Y-%m-%d') as join_date
		FROM complex_members m
		LEFT JOIN branches b ON m.branch_seq = b.seq
		WHERE m.name = ? AND m.phone_number = ?
	`

	rows, err := DB.Query(query, name, phone)
	if err != nil {
		log.Printf("SearchMemberByNameAndPhone error: %v", err)
		return nil, err
	}
	defer rows.Close()

	var results []ComplexMemberSearchResult
	for rows.Next() {
		var r ComplexMemberSearchResult
		err := rows.Scan(&r.Seq, &r.BranchSeq, &r.BranchName, &r.Name, &r.PhoneNumber, &r.Level, &r.JoinDate)
		if err != nil {
			log.Printf("SearchMemberByNameAndPhone scan error: %v", err)
			continue
		}
		results = append(results, r)
	}

	return results, nil
}

// GetActiveMembershipsByMember - 회원의 활성 멤버십 목록 조회
func GetActiveMembershipsByMember(memberSeq int) ([]ComplexMemberMembershipInfo, error) {
	query := `
		SELECT mm.seq, ms.name,
			DATE_FORMAT(mm.start_date, '%Y-%m-%d') as start_date,
			DATE_FORMAT(mm.expiry_date, '%Y-%m-%d') as expiry_date,
			mm.total_count, mm.used_count,
			mm.postpone_total, mm.postpone_used,
			mm.status
		FROM complex_member_memberships mm
		JOIN memberships ms ON mm.membership_seq = ms.seq
		WHERE mm.member_seq = ? AND mm.status = '활성'
		ORDER BY mm.expiry_date DESC
	`

	rows, err := DB.Query(query, memberSeq)
	if err != nil {
		log.Printf("GetActiveMembershipsByMember error: %v", err)
		return nil, err
	}
	defer rows.Close()

	var memberships []ComplexMemberMembershipInfo
	for rows.Next() {
		var m ComplexMemberMembershipInfo
		err := rows.Scan(&m.Seq, &m.MembershipName, &m.StartDate, &m.ExpiryDate,
			&m.TotalCount, &m.UsedCount, &m.PostponeTotal, &m.PostponeUsed, &m.Status)
		if err != nil {
			log.Printf("GetActiveMembershipsByMember scan error: %v", err)
			continue
		}
		memberships = append(memberships, m)
	}

	return memberships, nil
}
