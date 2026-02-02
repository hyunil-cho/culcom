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
			(branch_seq, name, phone_number, comment, commercial_name, createdDate, call_count)
		VALUES (?, ?, ?, ?, 'walk_in', NOW(), 0)
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
	CreatedDate    string
	LastUpdateDate *string
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

	// 필터에 따라 조건 추가
	if filter == "new" {
		query += ` AND call_count < 5`
		// 예약이 확정된 고객 제외
		query += ` AND seq NOT IN (SELECT customer_id FROM reservation_info WHERE branch_seq = ?)`
		args = append(args, branchSeq)
	}

	// 검색 조건 추가
	if searchKeyword != "" {
		if searchType == "name" {
			query += ` AND name LIKE ?`
			args = append(args, "%"+searchKeyword+"%")
		} else if searchType == "phone" {
			query += ` AND phone_number LIKE ?`
			args = append(args, "%"+searchKeyword+"%")
		}
	}

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
			DATE_FORMAT(createdDate, '%Y-%m-%d %H:%i') as createdDate,
			DATE_FORMAT(lastUpdateDate, '%Y-%m-%d %H:%i') as lastUpdateDate
		FROM customers
		WHERE branch_seq = ?
	`
	args := []interface{}{branchSeq}

	// 필터에 따라 조건 추가
	if filter == "new" {
		query += ` AND call_count < 5`
		// 예약이 확정된 고객 제외
		query += ` AND seq NOT IN (SELECT customer_id FROM reservation_info WHERE branch_seq = ?)`
		args = append(args, branchSeq)
	}

	// 검색 조건 추가
	if searchKeyword != "" {
		if searchType == "name" {
			query += ` AND name LIKE ?`
			args = append(args, "%"+searchKeyword+"%")
		} else if searchType == "phone" {
			query += ` AND phone_number LIKE ?`
			args = append(args, "%"+searchKeyword+"%")
		}
	}

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
	query := `UPDATE customers SET comment = ?, lastUpdateDate = NOW() WHERE seq = ?`

	_, err := DB.Exec(query, comment, customerSeq)
	if err != nil {
		log.Printf("UpdateCustomerComment - update error: %v", err)
		return err
	}

	log.Printf("[Customer] 코멘트 업데이트 완료 - CustomerSeq: %d\n", customerSeq)
	return nil
}

// IncrementCallCount - 고객 통화 횟수 증가
// 파라미터: customerSeq - 고객 seq
// 반환: 업데이트된 call_count, lastUpdateDate, 에러
func IncrementCallCount(customerSeq int) (int, string, error) {
	query := `UPDATE customers SET call_count = call_count + 1, lastUpdateDate = NOW() WHERE seq = ?`

	_, err := DB.Exec(query, customerSeq)
	if err != nil {
		log.Printf("IncrementCallCount - update error: %v", err)
		return 0, "", err
	}

	// 업데이트된 call_count와 lastUpdateDate 조회
	var callCount int
	var lastUpdateDate string
	selectQuery := `SELECT call_count, DATE_FORMAT(lastUpdateDate, '%Y-%m-%d %H:%i') FROM customers WHERE seq = ?`
	err = DB.QueryRow(selectQuery, customerSeq).Scan(&callCount, &lastUpdateDate)
	if err != nil {
		log.Printf("IncrementCallCount - select error: %v", err)
		return 0, "", err
	}

	log.Printf("[Customer] 통화 횟수 증가 완료 - CustomerSeq: %d, CallCount: %d, LastUpdate: %s\n", customerSeq, callCount, lastUpdateDate)
	return callCount, lastUpdateDate, nil
}

// UpdateCustomerName - 고객 이름 업데이트
// 파라미터: customerSeq - 고객 seq, name - 새 이름
// 반환: 에러
func UpdateCustomerName(customerSeq int, name string) error {
	query := `UPDATE customers SET name = ?, lastUpdateDate = NOW() WHERE seq = ?`

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
