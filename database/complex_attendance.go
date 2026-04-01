package database

import (
	"database/sql"
	"log"
)

// AttendanceClassInfo - 출석부 페이지용 수업 정보
type AttendanceClassInfo struct {
	Seq          int
	Name         string
	Capacity     int
	SortOrder    int
	TimeSlotSeq  int
	TimeSlotName string
	DaysOfWeek   string
	StartTime    string
	EndTime      string
	StaffSeq     sql.NullInt64
	StaffName    sql.NullString
}

// AttendanceMemberInfo - 출석부 페이지용 회원 정보
type AttendanceMemberInfo struct {
	ClassSeq    int
	MemberSeq   int
	Name        string
	PhoneNumber string
	Status      string // 오늘 출석 상태: 출석→O, 연기→△, 그 외 빈 문자열
	IsPostponed bool   // 연기 승인 중 여부
	IsStaff     bool   // 스태프 여부
}

// GetAttendanceClasses - 지점의 수업 목록 (시간대 포함)
func GetAttendanceClasses(branchSeq int) ([]AttendanceClassInfo, error) {
	query := `
		SELECT c.seq, c.name, c.capacity, c.sort_order,
		       c.time_slot_seq, ts.name AS time_slot_name,
		       ts.days_of_week,
		       TIME_FORMAT(ts.start_time, '%H:%i') AS start_time,
		       TIME_FORMAT(ts.end_time, '%H:%i') AS end_time,
		       c.staff_seq, s.name AS staff_name
		FROM complex_classes c
		JOIN class_time_slots ts ON c.time_slot_seq = ts.seq
		LEFT JOIN complex_staffs s ON c.staff_seq = s.seq
		WHERE c.branch_seq = ?
		ORDER BY ts.start_time ASC, c.sort_order ASC, c.name ASC`

	rows, err := DB.Query(query, branchSeq)
	if err != nil {
		log.Printf("GetAttendanceClasses error: %v", err)
		return nil, err
	}
	defer rows.Close()

	var classes []AttendanceClassInfo
	for rows.Next() {
		var c AttendanceClassInfo
		if err := rows.Scan(
			&c.Seq, &c.Name, &c.Capacity, &c.SortOrder,
			&c.TimeSlotSeq, &c.TimeSlotName,
			&c.DaysOfWeek, &c.StartTime, &c.EndTime,
			&c.StaffSeq, &c.StaffName,
		); err != nil {
			log.Printf("GetAttendanceClasses scan error: %v", err)
			return nil, err
		}
		classes = append(classes, c)
	}
	return classes, nil
}

// GetAttendanceMembers - 지점의 전체 수업별 회원 + 가장 최근 출석 상태 + 스태프 식별
func GetAttendanceMembers(branchSeq int, today string) ([]AttendanceMemberInfo, error) {
	query := `
		SELECT
			mcm.class_seq,
			m.seq AS member_seq,
			m.name,
			m.phone_number,
			COALESCE(att.status, '') AS member_att_status,
			COALESCE(sa.status, '') AS staff_att_status,
			CASE WHEN pr.seq IS NOT NULL THEN 1 ELSE 0 END AS is_postponed,
			CASE WHEN cs.seq IS NOT NULL AND m.phone_number = cs.phone_number THEN 1 ELSE 0 END AS is_staff
		FROM complex_member_class_mapping mcm
		JOIN complex_members m ON mcm.member_seq = m.seq
		JOIN complex_classes c ON mcm.class_seq = c.seq
		LEFT JOIN complex_staffs cs ON c.staff_seq = cs.seq
		LEFT JOIN complex_member_memberships mm
			ON mm.member_seq = m.seq AND mm.status IN ('활성', '연기')
		LEFT JOIN complex_member_attendance att
			ON att.member_membership_seq = mm.seq
			AND att.class_seq = mcm.class_seq
			AND att.attendance_date = (
				SELECT MAX(a2.attendance_date)
				FROM complex_member_attendance a2
				WHERE a2.member_membership_seq = mm.seq
				  AND a2.class_seq = mcm.class_seq
			)
		LEFT JOIN complex_staff_attendance sa
			ON cs.seq IS NOT NULL AND m.phone_number = cs.phone_number
			AND sa.staff_seq = cs.seq
			AND sa.class_seq = mcm.class_seq
			AND sa.attendance_date = (
				SELECT MAX(sa2.attendance_date)
				FROM complex_staff_attendance sa2
				WHERE sa2.staff_seq = cs.seq
				  AND sa2.class_seq = mcm.class_seq
			)
		LEFT JOIN complex_postponement_requests pr
			ON pr.member_membership_seq = mm.seq
			AND pr.status = '승인'
			AND ? BETWEEN pr.start_date AND pr.end_date
		WHERE c.branch_seq = ?
		ORDER BY mcm.class_seq, is_staff DESC, mcm.seq`

	rows, err := DB.Query(query, today, branchSeq)
	if err != nil {
		log.Printf("GetAttendanceMembers error: %v", err)
		return nil, err
	}
	defer rows.Close()

	var members []AttendanceMemberInfo
	for rows.Next() {
		var am AttendanceMemberInfo
		var memberAttStatus, staffAttStatus string
		var isPostponed, isStaff int

		if err := rows.Scan(
			&am.ClassSeq, &am.MemberSeq, &am.Name, &am.PhoneNumber,
			&memberAttStatus, &staffAttStatus, &isPostponed, &isStaff,
		); err != nil {
			log.Printf("GetAttendanceMembers scan error: %v", err)
			return nil, err
		}

		am.IsStaff = isStaff == 1
		am.IsPostponed = isPostponed == 1

		if am.IsStaff {
			// 스태프는 별도 테이블에서 조회
			switch staffAttStatus {
			case "출석":
				am.Status = "O"
			case "결석":
				am.Status = "X"
			default:
				am.Status = ""
			}
		} else if am.IsPostponed {
			am.Status = "△"
		} else {
			switch memberAttStatus {
			case "출석", "지각":
				am.Status = "O"
			case "결석":
				am.Status = "X"
			default:
				am.Status = ""
			}
		}

		members = append(members, am)
	}
	return members, nil
}

// BulkAttendanceItem - 일괄 출석 요청 항목
type BulkAttendanceItem struct {
	MemberSeq int
	IsStaff   bool
	Attended  bool // true: 출석 체크됨, false: 체크 안 됨
}

// BulkAttendanceResult - 일괄 출석 처리 결과 (회원별)
type BulkAttendanceResult struct {
	MemberSeq int
	Name      string
	Status    string // "출석", "결석", "연기", "skip_already", "skip_no_membership"
}

// saveStaffAttendance - 스태프 출석을 별도 테이블에 저장
func saveStaffAttendance(tx *sql.Tx, classSeq int, date string, item BulkAttendanceItem) (BulkAttendanceResult, error) {
	var memberName string
	_ = tx.QueryRow(`SELECT name FROM complex_members WHERE seq = ?`, item.MemberSeq).Scan(&memberName)

	// 스태프 seq 조회 (회원의 전화번호로 매칭)
	var staffSeq int
	err := tx.QueryRow(`
		SELECT cs.seq FROM complex_staffs cs
		JOIN complex_classes c ON c.staff_seq = cs.seq
		JOIN complex_members m ON m.phone_number = cs.phone_number
		WHERE m.seq = ? AND c.seq = ?
		LIMIT 1`, item.MemberSeq, classSeq).Scan(&staffSeq)
	if err != nil {
		if err == sql.ErrNoRows {
			return BulkAttendanceResult{MemberSeq: item.MemberSeq, Name: memberName, Status: "skip_no_membership"}, nil
		}
		return BulkAttendanceResult{}, err
	}

	// 이미 기록 있는지 확인
	var existing string
	err = tx.QueryRow(`
		SELECT status FROM complex_staff_attendance
		WHERE staff_seq = ? AND class_seq = ? AND attendance_date = ?`,
		staffSeq, classSeq, date).Scan(&existing)
	if err == nil {
		return BulkAttendanceResult{MemberSeq: item.MemberSeq, Name: memberName, Status: "skip_already"}, nil
	}

	attStatus := "결석"
	if item.Attended {
		attStatus = "출석"
	}

	_, err = tx.Exec(`
		INSERT INTO complex_staff_attendance (staff_seq, class_seq, attendance_date, status)
		VALUES (?, ?, ?, ?)`,
		staffSeq, classSeq, date, attStatus)
	if err != nil {
		return BulkAttendanceResult{}, err
	}

	return BulkAttendanceResult{MemberSeq: item.MemberSeq, Name: memberName, Status: attStatus}, nil
}

// SaveBulkAttendance - 일괄 출석 저장 (스태프는 별도 테이블, 회원은 멤버십 기반)
func SaveBulkAttendance(classSeq int, date string, items []BulkAttendanceItem) ([]BulkAttendanceResult, error) {
	tx, err := DB.Begin()
	if err != nil {
		log.Printf("SaveBulkAttendance begin tx error: %v", err)
		return nil, err
	}

	var results []BulkAttendanceResult

	for _, item := range items {
		// 스태프는 별도 처리
		if item.IsStaff {
			result, err := saveStaffAttendance(tx, classSeq, date, item)
			if err != nil {
				tx.Rollback()
				log.Printf("SaveBulkAttendance staff error (member=%d): %v", item.MemberSeq, err)
				return nil, err
			}
			results = append(results, result)
			continue
		}

		// 일반 회원 처리
		var memberName string
		_ = tx.QueryRow(`SELECT name FROM complex_members WHERE seq = ?`, item.MemberSeq).Scan(&memberName)

		// 활성 또는 연기 멤버십 조회
		var mmSeq int
		var mmStatus string
		err := tx.QueryRow(`
			SELECT seq, status FROM complex_member_memberships
			WHERE member_seq = ? AND status IN ('활성', '연기')
			ORDER BY seq DESC LIMIT 1`, item.MemberSeq).Scan(&mmSeq, &mmStatus)
		if err != nil {
			if err == sql.ErrNoRows {
				results = append(results, BulkAttendanceResult{
					MemberSeq: item.MemberSeq, Name: memberName, Status: "skip_no_membership",
				})
				continue
			}
			tx.Rollback()
			log.Printf("SaveBulkAttendance find membership error (member=%d): %v", item.MemberSeq, err)
			return nil, err
		}

		// 이미 오늘 기록이 있는지 확인
		var existingStatus string
		err = tx.QueryRow(`
			SELECT status FROM complex_member_attendance
			WHERE member_membership_seq = ? AND class_seq = ? AND attendance_date = ?`,
			mmSeq, classSeq, date).Scan(&existingStatus)
		if err == nil {
			results = append(results, BulkAttendanceResult{
				MemberSeq: item.MemberSeq, Name: memberName, Status: "skip_already",
			})
			continue
		}

		var attStatus string
		if mmStatus == "연기" {
			attStatus = "연기"
		} else if item.Attended {
			attStatus = "출석"
		} else {
			attStatus = "결석"
		}

		// 출석 기록 삽입
		_, err = tx.Exec(`
			INSERT INTO complex_member_attendance (member_membership_seq, class_seq, attendance_date, status)
			VALUES (?, ?, ?, ?)`,
			mmSeq, classSeq, date, attStatus)
		if err != nil {
			tx.Rollback()
			log.Printf("SaveBulkAttendance insert attendance error (member=%d): %v", item.MemberSeq, err)
			return nil, err
		}

		// 출석인 경우만 사용횟수 +1
		if attStatus == "출석" {
			_, err = tx.Exec(`
				UPDATE complex_member_memberships
				SET used_count = used_count + 1
				WHERE seq = ?`, mmSeq)
			if err != nil {
				tx.Rollback()
				log.Printf("SaveBulkAttendance update used_count error (member=%d): %v", item.MemberSeq, err)
				return nil, err
			}
		}

		results = append(results, BulkAttendanceResult{
			MemberSeq: item.MemberSeq, Name: memberName, Status: attStatus,
		})
	}

	if err := tx.Commit(); err != nil {
		log.Printf("SaveBulkAttendance commit error: %v", err)
		return nil, err
	}
	return results, nil
}

// DetailMemberInfo - 상세 출석부 페이지용 회원 정보
type DetailMemberInfo struct {
	ClassSeq    int
	MemberSeq   int
	Name        string
	PhoneNumber string
	Level       string
	Info        string
	JoinDate    string
	ExpiryDate  string
	TotalCount  int
	UsedCount   int
	Grade       string // 멤버십명
	IsStaff     bool
	IsPostponed bool
}

// DetailAttendanceRecord - 출석 기록 1건
type DetailAttendanceRecord struct {
	ClassSeq            int
	MemberMembershipSeq int
	MemberSeq           int
	Status              string // O, X, △
}

// GetDetailClassesBySlot - 특정 시간대의 수업 목록 (sort_order 적용)
func GetDetailClassesBySlot(branchSeq, timeSlotSeq int) ([]AttendanceClassInfo, error) {
	query := `
		SELECT c.seq, c.name, c.capacity, c.sort_order,
		       c.time_slot_seq, ts.name AS time_slot_name,
		       ts.days_of_week,
		       TIME_FORMAT(ts.start_time, '%H:%i') AS start_time,
		       TIME_FORMAT(ts.end_time, '%H:%i') AS end_time,
		       c.staff_seq, s.name AS staff_name
		FROM complex_classes c
		JOIN class_time_slots ts ON c.time_slot_seq = ts.seq
		LEFT JOIN complex_staffs s ON c.staff_seq = s.seq
		WHERE c.branch_seq = ? AND c.time_slot_seq = ?
		ORDER BY c.sort_order ASC, c.name ASC`

	rows, err := DB.Query(query, branchSeq, timeSlotSeq)
	if err != nil {
		log.Printf("GetDetailClassesBySlot error: %v", err)
		return nil, err
	}
	defer rows.Close()

	var classes []AttendanceClassInfo
	for rows.Next() {
		var c AttendanceClassInfo
		if err := rows.Scan(
			&c.Seq, &c.Name, &c.Capacity, &c.SortOrder,
			&c.TimeSlotSeq, &c.TimeSlotName,
			&c.DaysOfWeek, &c.StartTime, &c.EndTime,
			&c.StaffSeq, &c.StaffName,
		); err != nil {
			log.Printf("GetDetailClassesBySlot scan error: %v", err)
			return nil, err
		}
		classes = append(classes, c)
	}
	return classes, nil
}

// GetDetailMembers - 특정 시간대 수업의 회원 상세 정보 (멤버십 포함, 스태프 식별)
func GetDetailMembers(branchSeq, timeSlotSeq int) ([]DetailMemberInfo, error) {
	query := `
		SELECT
			mcm.class_seq,
			m.seq,
			m.name,
			m.phone_number,
			COALESCE(m.level, '') AS level,
			COALESCE(m.info, '') AS info,
			COALESCE(DATE_FORMAT(mm.start_date, '%Y-%m-%d'), '') AS join_date,
			COALESCE(DATE_FORMAT(mm.expiry_date, '%Y-%m-%d'), '') AS expiry_date,
			COALESCE(mm.total_count, 0) AS total_count,
			COALESCE(mm.used_count, 0) AS used_count,
			COALESCE(ms.name, '') AS grade,
			CASE WHEN cs.seq IS NOT NULL AND m.phone_number = cs.phone_number THEN 1 ELSE 0 END AS is_staff,
			CASE WHEN mm.status = '연기' THEN 1 ELSE 0 END AS is_postponed
		FROM complex_member_class_mapping mcm
		JOIN complex_members m ON mcm.member_seq = m.seq
		JOIN complex_classes c ON mcm.class_seq = c.seq
		LEFT JOIN complex_staffs cs ON c.staff_seq = cs.seq
		LEFT JOIN complex_member_memberships mm
			ON mm.member_seq = m.seq AND mm.status IN ('활성', '연기')
		LEFT JOIN memberships ms ON mm.membership_seq = ms.seq
		WHERE c.branch_seq = ? AND c.time_slot_seq = ?
		ORDER BY c.sort_order ASC, c.name ASC, is_staff DESC, mcm.seq ASC`

	rows, err := DB.Query(query, branchSeq, timeSlotSeq)
	if err != nil {
		log.Printf("GetDetailMembers error: %v", err)
		return nil, err
	}
	defer rows.Close()

	var members []DetailMemberInfo
	for rows.Next() {
		var dm DetailMemberInfo
		var isStaff, isPostponed int
		if err := rows.Scan(
			&dm.ClassSeq, &dm.MemberSeq, &dm.Name, &dm.PhoneNumber,
			&dm.Level, &dm.Info, &dm.JoinDate, &dm.ExpiryDate,
			&dm.TotalCount, &dm.UsedCount, &dm.Grade, &isStaff, &isPostponed,
		); err != nil {
			log.Printf("GetDetailMembers scan error: %v", err)
			return nil, err
		}
		dm.IsStaff = isStaff == 1
		dm.IsPostponed = isPostponed == 1
		members = append(members, dm)
	}
	return members, nil
}

// GetRecentAttendanceBySlot - 특정 시간대 수업의 최근 출석 기록 (최근 10회)
func GetRecentAttendanceBySlot(branchSeq, timeSlotSeq int) ([]DetailAttendanceRecord, error) {
	query := `
		SELECT
			att.class_seq,
			att.member_membership_seq,
			mm.member_seq,
			att.status
		FROM complex_member_attendance att
		JOIN complex_member_memberships mm ON att.member_membership_seq = mm.seq
		JOIN complex_classes c ON att.class_seq = c.seq
		WHERE c.branch_seq = ? AND c.time_slot_seq = ?
		ORDER BY att.attendance_date DESC`

	rows, err := DB.Query(query, branchSeq, timeSlotSeq)
	if err != nil {
		log.Printf("GetRecentAttendanceBySlot error: %v", err)
		return nil, err
	}
	defer rows.Close()

	var records []DetailAttendanceRecord
	for rows.Next() {
		var r DetailAttendanceRecord
		var status string
		if err := rows.Scan(&r.ClassSeq, &r.MemberMembershipSeq, &r.MemberSeq, &status); err != nil {
			log.Printf("GetRecentAttendanceBySlot scan error: %v", err)
			return nil, err
		}
		switch status {
		case "출석", "지각":
			r.Status = "O"
		case "결석":
			r.Status = "X"
		case "연기":
			r.Status = "△"
		}
		records = append(records, r)
	}
	return records, nil
}
