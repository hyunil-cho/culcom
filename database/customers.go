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

	return count, nil
}

// GetCustomersByBranch - 지점별 고객 목록 조회 (페이징 적용)
// 파라미터: branchSeq (지점 seq), filter ("new": call_count < 5, "all": 전체), searchType (검색 타입), searchKeyword (검색어), page (페이지 번호), itemsPerPage (페이지당 항목 수)
// 반환: 고객 목록, 에러
func GetCustomersByBranch(branchSeq int, filter, searchType, searchKeyword string, page, itemsPerPage int) ([]CustomerInfo, error) {

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

	return nil
}

// GetTodayTotalCustomers - 금일 총 예약자 수 조회 (지점별)
// 파라미터: branchSeq (지점 seq, 0이면 전체 지점)
// 반환: 금일 생성된 고객 수, 에러
func GetTodayTotalCustomers(branchSeq int) (int, error) {

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

	return count, nil
}

// ProcessCallWithCallerSelection - CALLER 선택 이력 추가 + 통화 횟수 증가 (트랜잭션)
// caller 선택과 call_count 증가를 하나의 트랜잭션으로 처리
func ProcessCallWithCallerSelection(customerID, branchSeq int, caller string) (int, string, error) {
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

	return callCount, lastUpdateDate, nil
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

// MarkCustomerAsNoPhoneInterview - 고객을 '전화상안함' 상태로 변경하고 CALLER 이력 저장
// CALLER 선택과 상태 변경, call_count 업데이트를 하나의 트랜잭션으로 처리
func MarkCustomerAsNoPhoneInterview(customerID, branchSeq int, caller string) error {
	log.Printf("[Customer] MarkCustomerAsNoPhoneInterview 호출 - CustomerID: %d, BranchSeq: %d, Caller: %s\n", customerID, branchSeq, caller)

	// 트랜잭션 시작
	tx, err := DB.Begin()
	if err != nil {
		log.Printf("MarkCustomerAsNoPhoneInterview - transaction begin error: %v", err)
		return err
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
		log.Printf("MarkCustomerAsNoPhoneInterview - insert history error: %v", err)
		return err
	}

	// 2. 고객 상태를 '전화상안함'으로 변경하고 call_count를 5 이상으로 설정
	// call_count를 5로 설정하여 "처리중" 필터에서 제외되도록 함
	updateQuery := `
		UPDATE customers 
		SET 
			status = '전화상거절',
			call_count = GREATEST(call_count, 5),
			lastUpdateDate = NOW()
		WHERE seq = ?
	`
	result, err := tx.Exec(updateQuery, customerID)
	if err != nil {
		log.Printf("MarkCustomerAsNoPhoneInterview - update customer error: %v", err)
		return err
	}

	rowsAffected, _ := result.RowsAffected()
	if rowsAffected == 0 {
		log.Printf("MarkCustomerAsNoPhoneInterview - no rows affected for customer: %d", customerID)
		return err
	}

	// 트랜잭션 커밋
	if err = tx.Commit(); err != nil {
		log.Printf("MarkCustomerAsNoPhoneInterview - transaction commit error: %v", err)
		return err
	}

	log.Printf("[Customer] MarkCustomerAsNoPhoneInterview 완료 - CustomerSeq: %d, Status: 전화상안함\n", customerID)
	return nil
}
