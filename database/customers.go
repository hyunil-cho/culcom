package database

import (
	"log"
)

// InsertCustomer - 고객 추가
// 파라미터: branchCode (지점 코드), name (고객명), phoneNumber (전화번호), comment (메모)
// 반환: 생성된 ID, 에러
func InsertCustomer(branchCode, name, phoneNumber, comment string) (int64, error) {
	log.Printf("[Customer] InsertCustomer 호출 - BranchCode: %s, Name: %s, Phone: %s\n", branchCode, name, phoneNumber)

	// 1단계: 지점 seq 조회
	var branchSeq int
	branchQuery := `SELECT seq FROM branches WHERE alias = ?`
	err := DB.QueryRow(branchQuery, branchCode).Scan(&branchSeq)
	if err != nil {
		log.Printf("InsertCustomer - branch not found: %v", err)
		return 0, err
	}

	// 2단계: 고객 INSERT
	query := `
		INSERT INTO customers 
			(branch_seq, name, phone_number, comment, commercial_name, createdDate, call_count)
		VALUES (?, ?, ?, ?, '워크인', NOW(), 0)
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
	CallCount      int
	CreatedDate    string
	LastUpdateDate *string
}

// GetCustomersCountByBranch - 지점별 고객 수 조회
// 파라미터: branchCode (지점 코드), filter ("new": call_count < 5, "all": 전체), searchType (검색 타입), searchKeyword (검색어)
// 반환: 고객 수, 에러
func GetCustomersCountByBranch(branchCode, filter, searchType, searchKeyword string) (int, error) {
	log.Printf("[Customer] GetCustomersCountByBranch 호출 - BranchCode: %s, Filter: %s, SearchType: %s, SearchKeyword: %s\n", branchCode, filter, searchType, searchKeyword)

	// 지점 코드가 없으면 0 반환
	if branchCode == "" {
		log.Printf("GetCustomersCountByBranch - branchCode is empty")
		return 0, nil
	}

	// 1단계: 지점 seq 조회
	var branchSeq int
	branchQuery := `SELECT seq FROM branches WHERE alias = ?`
	err := DB.QueryRow(branchQuery, branchCode).Scan(&branchSeq)
	if err != nil {
		log.Printf("GetCustomersCountByBranch - branch not found: %v", err)
		return 0, nil // 지점이 없으면 0 반환 (에러 아님)
	}

	// 2단계: 고객 수 조회
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
	err = DB.QueryRow(query, args...).Scan(&count)
	if err != nil {
		log.Printf("GetCustomersCountByBranch - query error: %v", err)
		return 0, err
	}

	log.Printf("[Customer] GetCustomersCountByBranch 완료 - Count: %d\n", count)
	return count, nil
}

// GetCustomersByBranch - 지점별 고객 목록 조회 (페이징 적용)
// 파라미터: branchCode (지점 코드), filter ("new": call_count < 5, "all": 전체), searchType (검색 타입), searchKeyword (검색어), page (페이지 번호), itemsPerPage (페이지당 항목 수)
// 반환: 고객 목록, 에러
func GetCustomersByBranch(branchCode, filter, searchType, searchKeyword string, page, itemsPerPage int) ([]CustomerInfo, error) {
	log.Printf("[Customer] GetCustomersByBranch 호출 - BranchCode: %s, Filter: %s, SearchType: %s, SearchKeyword: %s, Page: %d, ItemsPerPage: %d\n", branchCode, filter, searchType, searchKeyword, page, itemsPerPage)

	// 지점 코드가 없으면 빈 배열 반환
	if branchCode == "" {
		log.Printf("GetCustomersByBranch - branchCode is empty")
		return []CustomerInfo{}, nil
	}

	// 1단계: 지점 seq 조회
	var branchSeq int
	branchQuery := `SELECT seq FROM branches WHERE alias = ?`
	err := DB.QueryRow(branchQuery, branchCode).Scan(&branchSeq)
	if err != nil {
		log.Printf("GetCustomersByBranch - branch not found: %v", err)
		return []CustomerInfo{}, nil // 지점이 없으면 빈 배열 반환 (에러 아님)
	}

	// 2단계: 고객 목록 조회
	query := `
		SELECT 
			seq,
			name,
			phone_number,
			comment,
			commercial_name,
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
