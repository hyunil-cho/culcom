package database

import (
	"fmt"
	"log"
	"strings"
)

// Notice - 공지사항/이벤트 구조체
type Notice struct {
	Seq            int
	BranchSeq      int
	BranchName     string
	Title          string
	Content        string
	Category       string
	IsPinned       bool
	IsActive       bool
	ViewCount      int
	EventStartDate *string
	EventEndDate   *string
	CreatedBy      *string
	CreatedDate    string
	LastUpdateDate *string
}

// GetNotices - 공지사항/이벤트 목록 조회 (페이징, 필터링 지원)
// branchSeq: 0이면 전체 지점
// category: "all", "공지사항", "이벤트"
func GetNotices(branchSeq int, category string, searchKeyword string, page, itemsPerPage int) ([]Notice, error) {
	var conditions []string
	var args []interface{}

	conditions = append(conditions, "n.is_active = 1")

	if branchSeq > 0 {
		conditions = append(conditions, "n.branch_seq = ?")
		args = append(args, branchSeq)
	}

	if category != "" && category != "all" {
		conditions = append(conditions, "n.category = ?")
		args = append(args, category)
	}

	if searchKeyword != "" {
		conditions = append(conditions, "(n.title LIKE ? OR n.content LIKE ?)")
		keyword := "%" + searchKeyword + "%"
		args = append(args, keyword, keyword)
	}

	whereClause := ""
	if len(conditions) > 0 {
		whereClause = "WHERE " + strings.Join(conditions, " AND ")
	}

	offset := (page - 1) * itemsPerPage

	query := fmt.Sprintf(`
		SELECT n.seq, n.branch_seq, b.branchName, n.title, n.content, n.category,
		       n.is_pinned, n.is_active, n.view_count,
		       n.event_start_date, n.event_end_date, n.created_by,
		       n.createdDate, n.lastUpdateDate
		FROM notices n
		JOIN branches b ON n.branch_seq = b.seq
		%s
		ORDER BY n.is_pinned DESC, n.createdDate DESC
		LIMIT ? OFFSET ?
	`, whereClause)

	args = append(args, itemsPerPage, offset)

	rows, err := DB.Query(query, args...)
	if err != nil {
		log.Printf("GetNotices error: %v", err)
		return nil, err
	}
	defer rows.Close()

	var notices []Notice
	for rows.Next() {
		var n Notice
		err := rows.Scan(
			&n.Seq, &n.BranchSeq, &n.BranchName, &n.Title, &n.Content, &n.Category,
			&n.IsPinned, &n.IsActive, &n.ViewCount,
			&n.EventStartDate, &n.EventEndDate, &n.CreatedBy,
			&n.CreatedDate, &n.LastUpdateDate,
		)
		if err != nil {
			log.Printf("GetNotices scan error: %v", err)
			return nil, err
		}
		notices = append(notices, n)
	}

	return notices, nil
}

// GetNoticesCount - 공지사항/이벤트 전체 건수 조회
func GetNoticesCount(branchSeq int, category string, searchKeyword string) (int, error) {
	var conditions []string
	var args []interface{}

	conditions = append(conditions, "n.is_active = 1")

	if branchSeq > 0 {
		conditions = append(conditions, "n.branch_seq = ?")
		args = append(args, branchSeq)
	}

	if category != "" && category != "all" {
		conditions = append(conditions, "n.category = ?")
		args = append(args, category)
	}

	if searchKeyword != "" {
		conditions = append(conditions, "(n.title LIKE ? OR n.content LIKE ?)")
		keyword := "%" + searchKeyword + "%"
		args = append(args, keyword, keyword)
	}

	whereClause := ""
	if len(conditions) > 0 {
		whereClause = "WHERE " + strings.Join(conditions, " AND ")
	}

	query := fmt.Sprintf(`SELECT COUNT(*) FROM notices n %s`, whereClause)

	var count int
	err := DB.QueryRow(query, args...).Scan(&count)
	if err != nil {
		log.Printf("GetNoticesCount error: %v", err)
		return 0, err
	}

	return count, nil
}

// GetNoticeByID - 공지사항/이벤트 상세 조회
func GetNoticeByID(id int) (*Notice, error) {
	query := `
		SELECT n.seq, n.branch_seq, b.branchName, n.title, n.content, n.category,
		       n.is_pinned, n.is_active, n.view_count,
		       n.event_start_date, n.event_end_date, n.created_by,
		       n.createdDate, n.lastUpdateDate
		FROM notices n
		JOIN branches b ON n.branch_seq = b.seq
		WHERE n.seq = ? AND n.is_active = 1
	`

	var n Notice
	err := DB.QueryRow(query, id).Scan(
		&n.Seq, &n.BranchSeq, &n.BranchName, &n.Title, &n.Content, &n.Category,
		&n.IsPinned, &n.IsActive, &n.ViewCount,
		&n.EventStartDate, &n.EventEndDate, &n.CreatedBy,
		&n.CreatedDate, &n.LastUpdateDate,
	)
	if err != nil {
		log.Printf("GetNoticeByID error: %v", err)
		return nil, err
	}

	return &n, nil
}

// IncrementNoticeViewCount - 조회수 증가
func IncrementNoticeViewCount(id int) error {
	query := `UPDATE notices SET view_count = view_count + 1 WHERE seq = ?`
	_, err := DB.Exec(query, id)
	if err != nil {
		log.Printf("IncrementNoticeViewCount error: %v", err)
	}
	return err
}

// InsertNotice - 공지사항/이벤트 등록
func InsertNotice(branchSeq int, title, content, category string, isPinned bool, eventStartDate, eventEndDate, createdBy string) (int64, error) {
	query := `
		INSERT INTO notices (branch_seq, title, content, category, is_pinned, event_start_date, event_end_date, created_by, createdDate)
		VALUES (?, ?, ?, ?, ?, NULLIF(?, ''), NULLIF(?, ''), NULLIF(?, ''), NOW())
	`

	result, err := DB.Exec(query, branchSeq, title, content, category, isPinned, eventStartDate, eventEndDate, createdBy)
	if err != nil {
		log.Printf("InsertNotice error: %v", err)
		return 0, err
	}

	id, err := result.LastInsertId()
	if err != nil {
		log.Printf("InsertNotice get last insert id error: %v", err)
		return 0, err
	}

	log.Printf("InsertNotice success - ID: %d, Title: %s, Category: %s", id, title, category)
	return id, nil
}

// UpdateNotice - 공지사항/이벤트 수정
func UpdateNotice(id int, title, content, category string, isPinned bool, eventStartDate, eventEndDate string) (int64, error) {
	query := `
		UPDATE notices 
		SET title = ?, content = ?, category = ?, is_pinned = ?, 
		    event_start_date = NULLIF(?, ''), event_end_date = NULLIF(?, '')
		WHERE seq = ?
	`

	result, err := DB.Exec(query, title, content, category, isPinned, eventStartDate, eventEndDate, id)
	if err != nil {
		log.Printf("UpdateNotice error: %v", err)
		return 0, err
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		log.Printf("UpdateNotice get rows affected error: %v", err)
		return 0, err
	}

	log.Printf("UpdateNotice success - ID: %d, Rows: %d", id, rowsAffected)
	return rowsAffected, nil
}

// DeleteNotice - 공지사항/이벤트 삭제 (소프트 삭제)
func DeleteNotice(id int) (int64, error) {
	query := `UPDATE notices SET is_active = 0 WHERE seq = ?`

	result, err := DB.Exec(query, id)
	if err != nil {
		log.Printf("DeleteNotice error: %v", err)
		return 0, err
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		log.Printf("DeleteNotice get rows affected error: %v", err)
		return 0, err
	}

	log.Printf("DeleteNotice success - ID: %d, Rows: %d", id, rowsAffected)
	return rowsAffected, nil
}
