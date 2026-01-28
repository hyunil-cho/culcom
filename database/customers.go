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
			(branch_seq, name, phone_number, comment, commercial_name, createdDate, lastUpdateDate, call_count)
		VALUES (?, ?, ?, ?, '워크인', CURDATE(), CURDATE(), 0)
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
	LastUpdateDate string
}

// GetCustomersCountByBranch - 지점별 고객 수 조회
// 파라미터: branchCode (지점 코드), filter ("new": call_count < 5, "all": 전체)
// 반환: 고객 수, 에러
func GetCustomersCountByBranch(branchCode, filter string) (int, error) {
	log.Printf("[Customer] GetCustomersCountByBranch 호출 - BranchCode: %s, Filter: %s\n", branchCode, filter)

	// 1단계: 지점 seq 조회
	var branchSeq int
	branchQuery := `SELECT seq FROM branches WHERE alias = ?`
	err := DB.QueryRow(branchQuery, branchCode).Scan(&branchSeq)
	if err != nil {
		log.Printf("GetCustomersCountByBranch - branch not found: %v", err)
		return 0, err
	}

	// 2단계: 고객 수 조회
	query := `SELECT COUNT(*) FROM customers WHERE branch_seq = ?`

	// 필터에 따라 조건 추가
	if filter == "new" {
		query += ` AND call_count < 5`
	}

	var count int
	err = DB.QueryRow(query, branchSeq).Scan(&count)
	if err != nil {
		log.Printf("GetCustomersCountByBranch - query error: %v", err)
		return 0, err
	}

	log.Printf("[Customer] GetCustomersCountByBranch 완료 - Count: %d\n", count)
	return count, nil
}

// GetCustomersByBranch - 지점별 고객 목록 조회 (페이징 적용) (페이징 적용)
// 파라미터: branchCode (지점 코드), filter ("new": call_count < 5, "all": 전체), page (페이지 번호), itemsPerPage (페이지당 항목 수)
// 반환: 고객 목록, 에러
func GetCustomersByBranch(branchCode, filter string, page, itemsPerPage int) ([]CustomerInfo, error) {
	log.Printf("[Customer] GetCustomersByBranch 호출 - BranchCode: %s, Filter: %s, Page: %d, ItemsPerPage: %d\n", branchCode, filter, page, itemsPerPage)

	// 1단계: 지점 seq 조회
	var branchSeq int
	branchQuery := `SELECT seq FROM branches WHERE alias = ?`
	err := DB.QueryRow(branchQuery, branchCode).Scan(&branchSeq)
	if err != nil {
		log.Printf("GetCustomersByBranch - branch not found: %v", err)
		return nil, err
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
			createdDate,
			lastUpdateDate
		FROM customers
		WHERE branch_seq = ?
	`

	// 필터에 따라 조건 추가
	if filter == "new" {
		query += ` AND call_count < 5`
	}

	query += ` ORDER BY createdDate DESC, seq DESC`

	// 페이징 적용 (LIMIT/OFFSET)
	offset := (page - 1) * itemsPerPage
	query += ` LIMIT ? OFFSET ?`

	rows, err := DB.Query(query, branchSeq, itemsPerPage, offset)
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
