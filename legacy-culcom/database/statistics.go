package database

import (
	"log"
)

// CallerStats - CALLER별 통계 구조체
type CallerStats struct {
	Caller             string
	TotalCustomers     int
	ReservationConfirm int
	ConfirmRate        float64
	SelectionCount     int // CALLER 선택 횟수
}

// GetCallerStats - CALLER별 통계 조회 (일/주/월)
// period: "day", "week", "month"
func GetCallerStats(branchSeq int, period string) ([]CallerStats, error) {

	var dateCondition string
	switch period {
	case "day":
		dateCondition = "DATE(r.createdDate) = CURDATE()"
	case "week":
		dateCondition = "r.createdDate >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)"
	case "month":
		dateCondition = "r.createdDate >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)"
	default:
		dateCondition = "DATE(r.createdDate) = CURDATE()"
	}

	// A부터 P까지 모든 CALLER 생성
	allCallers := []string{"A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M", "N", "O", "P"}

	// 각 caller별로 통계 조회
	query := `
		SELECT 
			? as caller,
			COALESCE(COUNT(DISTINCT c.seq), 0) as total_customers,
			COALESCE(COUNT(DISTINCT CASE WHEN r.seq IS NOT NULL THEN r.seq END), 0) as reservation_confirm,
			CASE 
				WHEN COUNT(DISTINCT c.seq) > 0 THEN ROUND(COUNT(DISTINCT CASE WHEN r.seq IS NOT NULL THEN r.seq END) * 100.0 / COUNT(DISTINCT c.seq), 2)
				ELSE 0
			END as confirm_rate
		FROM (SELECT 1) dummy
		LEFT JOIN reservation_info r ON r.caller = ? AND ` + dateCondition

	if branchSeq > 0 {
		query += ` AND r.branch_seq = ?`
	}

	query += `
		LEFT JOIN customers c ON r.customer_id = c.seq
	`

	stats := []CallerStats{}
	for _, caller := range allCallers {
		queryArgs := []interface{}{caller, caller}
		if branchSeq > 0 {
			queryArgs = append(queryArgs, branchSeq)
		}

		row := DB.QueryRow(query, queryArgs...)
		var stat CallerStats
		if err := row.Scan(&stat.Caller, &stat.TotalCustomers, &stat.ReservationConfirm, &stat.ConfirmRate); err != nil {
			log.Printf("GetCallerStats - scan error for caller %s: %v", caller, err)
			continue
		}

		// CALLER 선택 횟수 조회
		selectionCount, err := GetCallerSelectionCount(branchSeq, caller, period)
		if err != nil {
			log.Printf("GetCallerStats - selection count error for caller %s: %v", caller, err)
			selectionCount = 0
		}
		stat.SelectionCount = selectionCount

		// 확정 비율을 선택 횟수 대비 예약 확정 수로 재계산
		if selectionCount > 0 {
			stat.ConfirmRate = float64(stat.ReservationConfirm) * 100.0 / float64(selectionCount)
			stat.ConfirmRate = float64(int(stat.ConfirmRate*100)) / 100 // 소수점 둘째자리까지
		} else {
			stat.ConfirmRate = 0
		}

		stats = append(stats, stat)
	}

	return stats, nil
}

// GetCallerSelectionCount - 기간별 CALLER 선택 횟수 조회
func GetCallerSelectionCount(branchSeq int, caller, period string) (int, error) {
	var dateCondition string
	switch period {
	case "day":
		dateCondition = "DATE(selected_date) = CURDATE()"
	case "week":
		dateCondition = "selected_date >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)"
	case "month":
		dateCondition = "selected_date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)"
	default:
		dateCondition = "DATE(selected_date) = CURDATE()"
	}

	query := `SELECT COUNT(*) FROM caller_selection_history WHERE caller = ? AND ` + dateCondition

	args := []interface{}{caller}
	if branchSeq > 0 {
		query += ` AND branch_seq = ?`
		args = append(args, branchSeq)
	}

	var count int
	err := DB.QueryRow(query, args...).Scan(&count)
	if err != nil {
		log.Printf("GetCallerSelectionCount - query error: %v", err)
		return 0, err
	}

	return count, nil
}

// DailyCustomerStats - 일별 고객 통계 구조체
type DailyCustomerStats struct {
	Date             string `json:"date"`             // 날짜 (YYYY-MM-DD)
	Count            int    `json:"count"`            // 고객 수
	ReservationCount int    `json:"reservationCount"` // 예약 확정자 수
}

// GetDailyCustomerStats - 최근 N일간의 일별 고객 통계 조회 (예약자 + 예약 확정자)
// 파라미터: branchSeq (지점 seq, 0이면 전체 지점), days (최근 며칠)
// 반환: 일별 통계 리스트, 에러
func GetDailyCustomerStats(branchSeq int, days int) ([]DailyCustomerStats, error) {

	// 고객 통계와 예약 통계를 LEFT JOIN으로 결합
	query := `
		SELECT 
			dates.date,
			COALESCE(c.count, 0) as customer_count,
			COALESCE(r.count, 0) as reservation_count
		FROM (
			SELECT DATE_SUB(CURDATE(), INTERVAL n.n DAY) as date
			FROM (
				SELECT 0 as n UNION SELECT 1 UNION SELECT 2 UNION SELECT 3 UNION SELECT 4 UNION SELECT 5 UNION SELECT 6
			) n
			WHERE n.n < ?
		) dates
		LEFT JOIN (
			SELECT DATE(createdDate) as date, COUNT(*) as count
			FROM customers
			WHERE DATE(createdDate) >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
	`
	args := []interface{}{days, days - 1}

	if branchSeq > 0 {
		query += ` AND branch_seq = ?`
		args = append(args, branchSeq)
	}

	query += `
			GROUP BY DATE(createdDate)
		) c ON dates.date = c.date
		LEFT JOIN (
			SELECT DATE(createdDate) as date, COUNT(*) as count
			FROM reservation_info
			WHERE DATE(createdDate) >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
	`

	args = append(args, days-1)

	if branchSeq > 0 {
		query += ` AND branch_seq = ?`
		args = append(args, branchSeq)
	}

	query += `
			GROUP BY DATE(createdDate)
		) r ON dates.date = r.date
		ORDER BY dates.date ASC
	`

	rows, err := DB.Query(query, args...)
	if err != nil {
		log.Printf("GetDailyCustomerStats - query error: %v", err)
		return nil, err
	}
	defer rows.Close()

	stats := []DailyCustomerStats{}
	for rows.Next() {
		var stat DailyCustomerStats
		if err := rows.Scan(&stat.Date, &stat.Count, &stat.ReservationCount); err != nil {
			log.Printf("GetDailyCustomerStats - scan error: %v", err)
			continue
		}
		stats = append(stats, stat)
	}

	if err := rows.Err(); err != nil {
		log.Printf("GetDailyCustomerStats - rows error: %v", err)
		return nil, err
	}

	return stats, nil
}
