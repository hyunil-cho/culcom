package database

import (
	"log"
)

// InsertCustomer - 고객 추가
// 파라미터: branchSeq (지점 seq), name (고객명), phoneNumber (전화번호), comment (메모)
// 반환: 생성된 ID, 에러
func InsertCustomer(branchSeq int, name, phoneNumber, comment string) (int64, error) {
	log.Printf("[Customer] InsertCustomer 호출 - BranchSeq: %d, Name: %s, Phone: %s\n", branchSeq, name, phoneNumber)

	// 고객 INSERT
	query := `
		INSERT INTO customers 
			(branch_seq, name, phone_number, comment, commercial_name, ad_source, createdDate, call_count, status)
		VALUES (?, ?, ?, ?, '-', 'walk_in', NOW(), 0, '신규')
	`

	var commentVal interface{}
	if comment == "" {
		commentVal = nil
	} else {
		commentVal = comment
	}

	result, err := DB.Exec(query, branchSeq, name, phoneNumber, commentVal)
	if err != nil {
		log.Printf("InsertCustomer - insert error: %v", err)
		return 0, err
	}

	id, err := result.LastInsertId()
	if err != nil {
		log.Printf("InsertCustomer - get last insert id error: %v", err)
		return 0, err
	}

	log.Printf("[Customer] InsertCustomer 완료 - ID: %d\n", id)
	return id, nil
}

// CustomerInfo - 고객 정보 구조체
type CustomerInfo struct {
	Seq            int
	Name           string
	PhoneNumber    string
	Comment        *string
	CommercialName *string
	AdSource       *string
	CallCount      int
	Status         string // 고객 상태: 신규, 예약확정, 전화상거절, 진행중
	CreatedDate    string
	LastUpdateDate *string
}

// buildCustomerFilterConditions - 고객 조회 시 WHERE 조건절 생성 (공통 함수)
// 파라미터: branchSeq, filter, searchType, searchKeyword
// 반환: WHERE 조건 문자열, args 배열
func buildCustomerFilterConditions(branchSeq int, filter, searchType, searchKeyword string) (string, []interface{}) {
	whereClause := ""
	args := []interface{}{}

	// 필터에 따라 조건 추가
	if filter == "new" {
		// '처리중' 필터: status가 '신규' 또는 '진행중'인 고객만 표시
		whereClause += ` AND status IN ('신규', '진행중')`
	}
	// filter == "all"인 경우: 모든 상태의 고객 표시 (조건 추가 없음)

	// 검색 조건 추가
	if searchKeyword != "" {
		if searchType == "name" {
			whereClause += ` AND name LIKE ?`
			args = append(args, "%"+searchKeyword+"%")
		} else if searchType == "phone" {
			whereClause += ` AND phone_number LIKE ?`
			args = append(args, "%"+searchKeyword+"%")
		} else if searchType == "register_date" {
			whereClause += ` AND DATE(createdDate) = ?`
			args = append(args, searchKeyword)
		} else if searchType == "contact_date" {
			whereClause += ` AND DATE(lastUpdateDate) = ?`
			args = append(args, searchKeyword)
		} else if searchType == "reservation_date" {
			whereClause += ` AND seq IN (SELECT customer_id FROM reservation_info WHERE DATE(interview_date) = ? AND branch_seq = ?)`
			args = append(args, searchKeyword, branchSeq)
		}
	}

	return whereClause, args
}

// GetCustomersCountByBranch - 지점별 고객 수 조회
// 파라미터: branchSeq (지점 seq), filter ("new": call_count < 5, "all": 전체), searchType (검색 타입), searchKeyword (검색어)
// 반환: 고객 수, 에러
func GetCustomersCountByBranch(branchSeq int, filter, searchType, searchKeyword string) (int, error) {
	log.Printf("[Customer] GetCustomersCountByBranch 호출 - BranchSeq: %d, Filter: %s, SearchType: %s, SearchKeyword: %s\n", branchSeq, filter, searchType, searchKeyword)

	// 지점 seq가 0이면 0 반환
	if branchSeq == 0 {
		log.Printf("GetCustomersCountByBranch - branchSeq is 0")
		return 0, nil
	}

	// 고객 수 조회
	query := `SELECT COUNT(*) FROM customers WHERE branch_seq = ?`
	args := []interface{}{branchSeq}

	// 공통 필터 조건 추가
	whereClause, filterArgs := buildCustomerFilterConditions(branchSeq, filter, searchType, searchKeyword)
	query += whereClause
	args = append(args, filterArgs...)

	var count int
	err := DB.QueryRow(query, args...).Scan(&count)
	if err != nil {
		log.Printf("GetCustomersCountByBranch - query error: %v", err)
		return 0, err
	}

	log.Printf("[Customer] GetCustomersCountByBranch 완료 - Count: %d\n", count)
	return count, nil
}

// GetCustomersByBranch - 지점별 고객 목록 조회 (페이징 적용)
// 파라미터: branchSeq (지점 seq), filter ("new": call_count < 5, "all": 전체), searchType (검색 타입), searchKeyword (검색어), page (페이지 번호), itemsPerPage (페이지당 항목 수)
// 반환: 고객 목록, 에러
func GetCustomersByBranch(branchSeq int, filter, searchType, searchKeyword string, page, itemsPerPage int) ([]CustomerInfo, error) {
	log.Printf("[Customer] GetCustomersByBranch 호출 - BranchSeq: %d, Filter: %s, SearchType: %s, SearchKeyword: %s, Page: %d, ItemsPerPage: %d\n", branchSeq, filter, searchType, searchKeyword, page, itemsPerPage)

	// 지점 seq가 0이면 빈 배열 반환
	if branchSeq == 0 {
		log.Printf("GetCustomersByBranch - branchSeq is 0")
		return []CustomerInfo{}, nil
	}

	// 고객 목록 조회
	query := `
		SELECT 
			seq,
			name,
			phone_number,
			comment,
			commercial_name,
			ad_source,
			call_count,
			status,
			DATE_FORMAT(createdDate, '%Y-%m-%d %H:%i') as createdDate,
			DATE_FORMAT(lastUpdateDate, '%Y-%m-%d %H:%i') as lastUpdateDate
		FROM customers
		WHERE branch_seq = ?
	`
	args := []interface{}{branchSeq}

	// 공통 필터 조건 추가
	whereClause, filterArgs := buildCustomerFilterConditions(branchSeq, filter, searchType, searchKeyword)
	query += whereClause
	args = append(args, filterArgs...)

	query += ` ORDER BY createdDate DESC, seq DESC`

	// 페이징 적용 (LIMIT/OFFSET)
	offset := (page - 1) * itemsPerPage
	query += ` LIMIT ? OFFSET ?`
	args = append(args, itemsPerPage, offset)

	rows, err := DB.Query(query, args...)
	if err != nil {
		log.Printf("GetCustomersByBranch - query error: %v", err)
		return nil, err
	}
	defer rows.Close()

	var customers []CustomerInfo
	for rows.Next() {
		var customer CustomerInfo
		err := rows.Scan(
			&customer.Seq,
			&customer.Name,
			&customer.PhoneNumber,
			&customer.Comment,
			&customer.CommercialName,
			&customer.AdSource,
			&customer.CallCount,
			&customer.Status,
			&customer.CreatedDate,
			&customer.LastUpdateDate,
		)
		if err != nil {
			log.Printf("GetCustomersByBranch - scan error: %v", err)
			continue
		}

		customers = append(customers, customer)
	}

	if err = rows.Err(); err != nil {
		log.Printf("GetCustomersByBranch - rows error: %v", err)
		return nil, err
	}

	log.Printf("[Customer] GetCustomersByBranch 완료 - %d개 고객 조회\n", len(customers))
	return customers, nil
}

// UpdateCustomerComment - 고객 코멘트 업데이트
// 파라미터: customerSeq - 고객 seq, comment - 업데이트할 코멘트
// 반환: 에러
func UpdateCustomerComment(customerSeq int, comment string) error {
	query := `UPDATE customers SET comment = ? WHERE seq = ?`

	_, err := DB.Exec(query, comment, customerSeq)
	if err != nil {
		log.Printf("UpdateCustomerComment - update error: %v", err)
		return err
	}

	log.Printf("[Customer] 코멘트 업데이트 완료 - CustomerSeq: %d\n", customerSeq)
	return nil
}

// UpdateCustomerName - 고객 이름 업데이트
// 파라미터: customerSeq - 고객 seq, name - 새 이름
// 반환: 에러
func UpdateCustomerName(customerSeq int, name string) error {
	query := `UPDATE customers SET name = ? WHERE seq = ?`

	_, err := DB.Exec(query, name, customerSeq)
	if err != nil {
		log.Printf("UpdateCustomerName - update error: %v", err)
		return err
	}

	log.Printf("[Customer] 이름 업데이트 완료 - CustomerSeq: %d, Name: %s\n", customerSeq, name)
	return nil
}

// GetTodayTotalCustomers - 금일 총 예약자 수 조회 (지점별)
// 파라미터: branchSeq (지점 seq, 0이면 전체 지점)
// 반환: 금일 생성된 고객 수, 에러
func GetTodayTotalCustomers(branchSeq int) (int, error) {
	log.Printf("[Customer] GetTodayTotalCustomers 호출 - BranchSeq: %d\n", branchSeq)

	query := `SELECT COUNT(*) FROM customers WHERE DATE(createdDate) = CURDATE()`
	args := []interface{}{}

	if branchSeq > 0 {
		query += ` AND branch_seq = ?`
		args = append(args, branchSeq)
	}

	var count int
	err := DB.QueryRow(query, args...).Scan(&count)
	if err != nil {
		log.Printf("GetTodayTotalCustomers - query error: %v", err)
		return 0, err
	}

	log.Printf("[Customer] GetTodayTotalCustomers 완료 - Count: %d\n", count)
	return count, nil
}

// AdSourceStats - ad_source별 통계 구조체
type AdSourceStats struct {
	AdSource string
	Count    int
}

// GetTodayCustomersByAdSource - 금일 ad_source별 고객 수 조회
// 파라미터: branchSeq (지점 seq, 0이면 전체 지점)
// 반환: ad_source별 고객 수 목록, 에러
func GetTodayCustomersByAdSource(branchSeq int) ([]AdSourceStats, error) {
	log.Printf("[Customer] GetTodayCustomersByAdSource 호출 - BranchSeq: %d\n", branchSeq)

	query := `
		SELECT 
			COALESCE(ad_source, '미지정') as ad_source,
			COUNT(*) as count
		FROM customers 
		WHERE DATE(createdDate) = CURDATE()
	`
	args := []interface{}{}

	if branchSeq > 0 {
		query += ` AND branch_seq = ?`
		args = append(args, branchSeq)
	}

	query += ` GROUP BY ad_source ORDER BY count DESC`

	rows, err := DB.Query(query, args...)
	if err != nil {
		log.Printf("GetTodayCustomersByAdSource - query error: %v", err)
		return nil, err
	}
	defer rows.Close()

	var stats []AdSourceStats
	for rows.Next() {
		var stat AdSourceStats
		err := rows.Scan(&stat.AdSource, &stat.Count)
		if err != nil {
			log.Printf("GetTodayCustomersByAdSource - scan error: %v", err)
			continue
		}
		stats = append(stats, stat)
	}

	if err = rows.Err(); err != nil {
		log.Printf("GetTodayCustomersByAdSource - rows error: %v", err)
		return nil, err
	}

	log.Printf("[Customer] GetTodayCustomersByAdSource 완료 - %d개 ad_source\n", len(stats))
	return stats, nil
}

// GetTodayWalkInCustomers - 금일 walk_in 고객 수 조회
// 파라미터: branchSeq (지점 seq, 0이면 전체 지점)
// 반환: walk_in 고객 수, 에러
func GetTodayWalkInCustomers(branchSeq int) (int, error) {
	log.Printf("[Customer] GetTodayWalkInCustomers 호출 - BranchSeq: %d\n", branchSeq)

	query := `
		SELECT COUNT(*) 
		FROM customers 
		WHERE DATE(createdDate) = CURDATE() 
		AND ad_source = 'walk_in'
	`
	args := []interface{}{}

	if branchSeq > 0 {
		query += ` AND branch_seq = ?`
		args = append(args, branchSeq)
	}

	var count int
	err := DB.QueryRow(query, args...).Scan(&count)
	if err != nil {
		log.Printf("GetTodayWalkInCustomers - query error: %v", err)
		return 0, err
	}

	log.Printf("[Customer] GetTodayWalkInCustomers 완료 - Count: %d\n", count)
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
	log.Printf("[Customer] GetDailyCustomerStats 호출 - BranchSeq: %d, Days: %d\n", branchSeq, days)

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
		log.Printf("  -> Date: %s, Count: %d, ReservationCount: %d", stat.Date, stat.Count, stat.ReservationCount)
		stats = append(stats, stat)
	}

	if err := rows.Err(); err != nil {
		log.Printf("GetDailyCustomerStats - rows error: %v", err)
		return nil, err
	}

	log.Printf("[Customer] GetDailyCustomerStats 완료 - %d일 데이터\n", len(stats))
	return stats, nil
}

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
	log.Printf("[Customer] GetCallerStats 호출 - BranchSeq: %d, Period: %s\n", branchSeq, period)

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

		log.Printf("  -> Caller: %s, Total: %d, Confirm: %d, Selection: %d, Rate: %.2f%%",
			stat.Caller, stat.TotalCustomers, stat.ReservationConfirm, stat.SelectionCount, stat.ConfirmRate)
		stats = append(stats, stat)
	}

	// allCallers가 이미 A-P 순서로 정의되어 있으므로 정렬 불필요
	log.Printf("[Customer] GetCallerStats 완료 - %d개 caller\n", len(stats))
	return stats, nil
}

// ProcessCallWithCallerSelection - CALLER 선택 이력 추가 + 통화 횟수 증가 (트랜잭션)
// caller 선택과 call_count 증가를 하나의 트랜잭션으로 처리
func ProcessCallWithCallerSelection(customerID, branchSeq int, caller string) (int, string, error) {
	log.Printf("[Customer] ProcessCallWithCallerSelection 호출 - CustomerID: %d, BranchSeq: %d, Caller: %s\n", customerID, branchSeq, caller)

	// 트랜잭션 시작
	tx, err := DB.Begin()
	if err != nil {
		log.Printf("ProcessCallWithCallerSelection - transaction begin error: %v", err)
		return 0, "", err
	}
	defer tx.Rollback()

	// 1. CALLER 선택 이력 저장
	historyQuery := `
		INSERT INTO caller_selection_history 
			(customer_id, caller, branch_seq, selected_date)
		VALUES (?, ?, ?, NOW())
	`
	_, err = tx.Exec(historyQuery, customerID, caller, branchSeq)
	if err != nil {
		log.Printf("ProcessCallWithCallerSelection - insert history error: %v", err)
		return 0, "", err
	}

	// 2. 통화 횟수 증가 및 상태 업데이트
	// - call_count 증가
	// - lastUpdateDate 업데이트
	// - call_count >= 5이면 상태를 '콜수초과'로 변경
	// - call_count < 5이고 현재 상태가 특수 상태가 아니면 '진행중'으로 변경
	updateQuery := `
		UPDATE customers 
		SET 
			call_count = call_count + 1,
			lastUpdateDate = NOW(),
			status = CASE 
				WHEN call_count + 1 >= 5 THEN '콜수초과'
				WHEN status NOT IN ('예약확정', '전화상거절', '콜수초과') THEN '진행중'
				ELSE status
			END
		WHERE seq = ?
	`
	result, err := tx.Exec(updateQuery, customerID)
	if err != nil {
		log.Printf("ProcessCallWithCallerSelection - update customer error: %v", err)
		return 0, "", err
	}

	rowsAffected, _ := result.RowsAffected()
	if rowsAffected == 0 {
		log.Printf("ProcessCallWithCallerSelection - no rows affected for customer: %d", customerID)
		return 0, "", err
	}

	// 3. 업데이트된 call_count와 lastUpdateDate 조회
	var callCount int
	var lastUpdateDate string
	selectQuery := `SELECT call_count, DATE_FORMAT(lastUpdateDate, '%Y-%m-%d %H:%i') FROM customers WHERE seq = ?`
	err = tx.QueryRow(selectQuery, customerID).Scan(&callCount, &lastUpdateDate)
	if err != nil {
		log.Printf("ProcessCallWithCallerSelection - select error: %v", err)
		return 0, "", err
	}

	// 트랜잭션 커밋
	if err = tx.Commit(); err != nil {
		log.Printf("ProcessCallWithCallerSelection - transaction commit error: %v", err)
		return 0, "", err
	}

	if callCount >= 5 {
		log.Printf("[Customer] 콜 횟수 5회 초과 - 상태를 '콜수초과'로 변경 - CustomerSeq: %d\n", customerID)
	}

	log.Printf("[Customer] ProcessCallWithCallerSelection 완료 - CustomerSeq: %d, CallCount: %d, LastUpdate: %s\n", customerID, callCount, lastUpdateDate)
	return callCount, lastUpdateDate, nil
}

// GetCallerSelectionCount - 기간별 CALLER 선택 횟수 조회
func GetCallerSelectionCount(branchSeq int, caller, period string) (int, error) {
	log.Printf("[Customer] GetCallerSelectionCount 호출 - BranchSeq: %d, Caller: %s, Period: %s\n", branchSeq, caller, period)

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

	log.Printf("[Customer] GetCallerSelectionCount 완료 - Count: %d\n", count)
	return count, nil
}

// DeleteCustomer - 고객 삭제
// 파라미터: customerSeq (고객 seq)
// 반환: 에러
// 참고: reservation_info의 FK는 ON DELETE SET NULL로 설정되어 있어
//
//	고객 삭제 시 자동으로 customer_id가 NULL로 변경됨
func DeleteCustomer(customerSeq int) error {
	log.Printf("[Customer] DeleteCustomer 호출 - CustomerSeq: %d\n", customerSeq)

	query := `DELETE FROM customers WHERE seq = ?`

	result, err := DB.Exec(query, customerSeq)
	if err != nil {
		log.Printf("DeleteCustomer - delete error: %v", err)
		return err
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		log.Printf("DeleteCustomer - get rows affected error: %v", err)
		return err
	}

	if rowsAffected == 0 {
		log.Printf("DeleteCustomer - no rows affected (customer not found)")
		return nil
	}

	log.Printf("[Customer] DeleteCustomer 완료 - Rows affected: %d\n", rowsAffected)
	return nil
}

// UpdateCustomerStatus - 고객 상태 업데이트
// 파라미터: customerSeq (고객 seq), status (상태: 신규, 예약확정, 전화상거절, 부재중)
// 반환: 에러
func UpdateCustomerStatus(customerSeq int, status string) error {
	log.Printf("[Customer] UpdateCustomerStatus 호출 - CustomerSeq: %d, Status: %s\n", customerSeq, status)

	query := `UPDATE customers SET status = ? WHERE seq = ?`

	result, err := DB.Exec(query, status, customerSeq)
	if err != nil {
		log.Printf("UpdateCustomerStatus - update error: %v", err)
		return err
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		log.Printf("UpdateCustomerStatus - get rows affected error: %v", err)
		return err
	}

	if rowsAffected == 0 {
		log.Printf("UpdateCustomerStatus - no rows affected (customer not found)")
	}

	log.Printf("[Customer] UpdateCustomerStatus 완료 - Rows affected: %d\n", rowsAffected)
	return nil
}
