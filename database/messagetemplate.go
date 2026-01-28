package database

import (
	"log"
	"time"
)

// MessageTemplate 메시지 템플릿
type MessageTemplate struct {
	ID          int
	Name        string
	Content     string
	Description string
	IsActive    bool
	IsDefault   bool
	CreatedAt   time.Time
	UpdatedAt   time.Time
}

// Placeholder 플레이스홀더
type Placeholder struct {
	Key         string
	Label       string
	Description string
	Example     string
}

// GetMessageTemplates 메시지 템플릿 목록 조회
func GetMessageTemplates(branchCode string) ([]MessageTemplate, error) {
	log.Printf("[MessageTemplate] GetMessageTemplates 호출 - BranchCode: %s\n", branchCode)

	// 1단계: 지점 seq 조회
	var branchSeq int
	branchQuery := `SELECT seq FROM branches WHERE alias = ?`
	err := DB.QueryRow(branchQuery, branchCode).Scan(&branchSeq)
	if err != nil {
		log.Printf("GetMessageTemplates - branch not found: %v", err)
		return nil, err
	}

	// 2단계: 해당 지점의 메시지 템플릿 조회
	query := `
		SELECT 
			seq,
			template_name,
			message_context,
			description,
			is_active,
			is_default,
			createdDate,
			lastUpdateDate
		FROM message_templates
		WHERE branch_seq = ?
		ORDER BY is_default DESC, lastUpdateDate DESC
	`

	rows, err := DB.Query(query, branchSeq)
	if err != nil {
		log.Printf("GetMessageTemplates - query error: %v", err)
		return nil, err
	}
	defer rows.Close()

	var templates []MessageTemplate
	for rows.Next() {
		var tmpl MessageTemplate
		var content, description *string
		var createdDate, updateDate string

		err := rows.Scan(
			&tmpl.ID,
			&tmpl.Name,
			&content,
			&description,
			&tmpl.IsActive,
			&tmpl.IsDefault,
			&createdDate,
			&updateDate,
		)
		if err != nil {
			log.Printf("GetMessageTemplates - scan error: %v", err)
			continue
		}

		// NULL 처리
		if content != nil {
			tmpl.Content = *content
		}
		if description != nil {
			tmpl.Description = *description
		}

		// 날짜 파싱
		tmpl.CreatedAt, _ = time.Parse("2006-01-02", createdDate)
		tmpl.UpdatedAt, _ = time.Parse("2006-01-02", updateDate)

		templates = append(templates, tmpl)
	}

	if err = rows.Err(); err != nil {
		log.Printf("GetMessageTemplates - rows error: %v", err)
		return nil, err
	}

	log.Printf("[MessageTemplate] GetMessageTemplates 완료 - %d개 템플릿 조회\n", len(templates))
	return templates, nil
}

// GetPlaceholders 플레이스홀더 목록 조회
func GetPlaceholders() ([]Placeholder, error) {
	log.Println("[Placeholder] GetPlaceholders 호출 - DB에서 조회")

	query := `
		SELECT 
			name,
			comment,
			examples,
			value
		FROM placeholders
		ORDER BY seq
	`

	rows, err := DB.Query(query)
	if err != nil {
		log.Printf("GetPlaceholders - query error: %v", err)
		return nil, err
	}
	defer rows.Close()

	var placeholders []Placeholder
	for rows.Next() {
		var ph Placeholder
		var comment, examples *string

		err := rows.Scan(
			&ph.Key,
			&comment,
			&examples,
			&ph.Label,
		)
		if err != nil {
			log.Printf("GetPlaceholders - scan error: %v", err)
			continue
		}

		// NULL 처리
		if comment != nil {
			ph.Description = *comment
		}
		if examples != nil {
			ph.Example = *examples
		}

		placeholders = append(placeholders, ph)
	}

	if err = rows.Err(); err != nil {
		log.Printf("GetPlaceholders - rows error: %v", err)
		return nil, err
	}

	log.Printf("[Placeholder] GetPlaceholders 완료 - %d개 플레이스홀더 조회\n", len(placeholders))
	return placeholders, nil
}

// GetMessageTemplateByID 특정 메시지 템플릿 조회
func GetMessageTemplateByID(id int) (*MessageTemplate, error) {
	log.Printf("[MessageTemplate] GetMessageTemplateByID 호출 - ID: %d\n", id)

	query := `
		SELECT 
			seq,
			template_name,
			message_context,
			description,
			is_active,
			is_default,
			createdDate,
			lastUpdateDate
		FROM message_templates
		WHERE seq = ?
	`

	var tmpl MessageTemplate
	var content, description *string
	var createdDate, updateDate string

	err := DB.QueryRow(query, id).Scan(
		&tmpl.ID,
		&tmpl.Name,
		&content,
		&description,
		&tmpl.IsActive,
		&tmpl.IsDefault,
		&createdDate,
		&updateDate,
	)
	if err != nil {
		log.Printf("GetMessageTemplateByID - query error: %v", err)
		return nil, err
	}

	// NULL 처리
	if content != nil {
		tmpl.Content = *content
	}
	if description != nil {
		tmpl.Description = *description
	}

	// 날짜 파싱
	tmpl.CreatedAt, _ = time.Parse("2006-01-02", createdDate)
	tmpl.UpdatedAt, _ = time.Parse("2006-01-02", updateDate)

	log.Printf("[MessageTemplate] GetMessageTemplateByID 완료 - 템플릿: %s\n", tmpl.Name)
	return &tmpl, nil
}

// SaveMessageTemplate 메시지 템플릿 저장
func SaveMessageTemplate(branchCode, name, content, description string, isActive bool) error {
	log.Printf("[MessageTemplate] SaveMessageTemplate 호출 - BranchCode: %s, Name: %s, IsActive: %v\n", branchCode, name, isActive)
	log.Printf("[MessageTemplate] Content: %s\n", content)
	log.Printf("[MessageTemplate] Description: %s\n", description)

	// 1단계: 지점 seq 조회
	var branchSeq int
	branchQuery := `SELECT seq FROM branches WHERE alias = ?`
	err := DB.QueryRow(branchQuery, branchCode).Scan(&branchSeq)
	if err != nil {
		log.Printf("SaveMessageTemplate - branch not found: %v", err)
		return err
	}

	// 2단계: 메시지 템플릿 INSERT
	query := `
		INSERT INTO message_templates 
			(template_name, message_context, description, is_active, branch_seq, is_default)
		VALUES (?, ?, ?, ?, ?, 0)
	`

	result, err := DB.Exec(query, name, content, description, isActive, branchSeq)
	if err != nil {
		log.Printf("SaveMessageTemplate - insert error: %v", err)
		return err
	}

	lastID, _ := result.LastInsertId()
	log.Printf("[MessageTemplate] SaveMessageTemplate 완료 - 템플릿 ID: %d\n", lastID)
	return nil
}

// UpdateMessageTemplate 메시지 템플릿 수정
func UpdateMessageTemplate(branchCode string, id int, name, content, description string, isActive bool) error {
	log.Printf("[MessageTemplate] UpdateMessageTemplate 호출 - BranchCode: %s, ID: %d, Name: %s, IsActive: %v\n", branchCode, id, name, isActive)
	log.Printf("[MessageTemplate] Content: %s\n", content)
	log.Printf("[MessageTemplate] Description: %s\n", description)

	// 1단계: 지점 seq 조회
	var branchSeq int
	branchQuery := `SELECT seq FROM branches WHERE alias = ?`
	err := DB.QueryRow(branchQuery, branchCode).Scan(&branchSeq)
	if err != nil {
		log.Printf("UpdateMessageTemplate - branch not found: %v", err)
		return err
	}

	// 2단계: 해당 템플릿이 해당 지점 소유인지 확인
	var existingBranchSeq int
	checkQuery := `SELECT branch_seq FROM message_templates WHERE seq = ?`
	err = DB.QueryRow(checkQuery, id).Scan(&existingBranchSeq)
	if err != nil {
		log.Printf("UpdateMessageTemplate - template not found: %v", err)
		return err
	}

	if existingBranchSeq != branchSeq {
		log.Printf("UpdateMessageTemplate - unauthorized: template belongs to different branch")
		return err
	}

	// 3단계: 메시지 템플릿 UPDATE
	query := `
		UPDATE message_templates 
		SET 
			template_name = ?,
			message_context = ?,
			description = ?,
			is_active = ?,
			lastUpdateDate = CURDATE()
		WHERE seq = ?
	`

	_, err = DB.Exec(query, name, content, description, isActive, id)
	if err != nil {
		log.Printf("UpdateMessageTemplate - update error: %v", err)
		return err
	}

	log.Printf("[MessageTemplate] UpdateMessageTemplate 완료 - 템플릿 ID: %d\n", id)
	return nil
}

// DeleteMessageTemplate 메시지 템플릿 삭제
func DeleteMessageTemplate(branchCode string, id int) error {
	log.Printf("[MessageTemplate] DeleteMessageTemplate 호출 - BranchCode: %s, ID: %d\n", branchCode, id)

	// 1단계: 지점 seq 조회
	var branchSeq int
	branchQuery := `SELECT seq FROM branches WHERE alias = ?`
	err := DB.QueryRow(branchQuery, branchCode).Scan(&branchSeq)
	if err != nil {
		log.Printf("DeleteMessageTemplate - branch not found: %v", err)
		return err
	}

	// 2단계: 해당 템플릿이 해당 지점 소유인지 확인
	var existingBranchSeq int
	checkQuery := `SELECT branch_seq FROM message_templates WHERE seq = ?`
	err = DB.QueryRow(checkQuery, id).Scan(&existingBranchSeq)
	if err != nil {
		log.Printf("DeleteMessageTemplate - template not found: %v", err)
		return err
	}

	if existingBranchSeq != branchSeq {
		log.Printf("DeleteMessageTemplate - unauthorized: template belongs to different branch")
		return err
	}

	// 3단계: 메시지 템플릿 DELETE
	query := `DELETE FROM message_templates WHERE seq = ?`

	_, err = DB.Exec(query, id)
	if err != nil {
		log.Printf("DeleteMessageTemplate - delete error: %v", err)
		return err
	}

	log.Printf("[MessageTemplate] DeleteMessageTemplate 완료 - 템플릿 ID: %d\n", id)
	return nil
}

// SetDefaultMessageTemplate 기본 템플릿 설정
func SetDefaultMessageTemplate(branchCode string, id int) error {
	log.Printf("[MessageTemplate] SetDefaultMessageTemplate 호출 - BranchCode: %s, ID: %d\n", branchCode, id)

	// 1단계: 지점 seq 조회
	var branchSeq int
	branchQuery := `SELECT seq FROM branches WHERE alias = ?`
	err := DB.QueryRow(branchQuery, branchCode).Scan(&branchSeq)
	if err != nil {
		log.Printf("SetDefaultMessageTemplate - branch not found: %v", err)
		return err
	}

	// 2단계: 해당 템플릿이 해당 지점 소유인지 확인
	var existingBranchSeq int
	checkQuery := `SELECT branch_seq FROM message_templates WHERE seq = ?`
	err = DB.QueryRow(checkQuery, id).Scan(&existingBranchSeq)
	if err != nil {
		log.Printf("SetDefaultMessageTemplate - template not found: %v", err)
		return err
	}

	if existingBranchSeq != branchSeq {
		log.Printf("SetDefaultMessageTemplate - unauthorized: template belongs to different branch")
		return err
	}

	// 3단계: 트랜잭션 시작
	tx, err := DB.Begin()
	if err != nil {
		log.Printf("SetDefaultMessageTemplate - transaction begin error: %v", err)
		return err
	}

	var txErr error
	defer func() {
		if txErr != nil {
			tx.Rollback()
			log.Printf("SetDefaultMessageTemplate - transaction rolled back due to error: %v", txErr)
		}
	}()

	// 4단계: 해당 지점의 모든 템플릿 is_default를 0으로 설정
	updateAllQuery := `UPDATE message_templates SET is_default = 0 WHERE branch_seq = ?`
	_, txErr = tx.Exec(updateAllQuery, branchSeq)
	if txErr != nil {
		log.Printf("SetDefaultMessageTemplate - update all error: %v", txErr)
		return txErr
	}

	// 5단계: 선택한 템플릿만 is_default를 1로 설정
	updateOneQuery := `UPDATE message_templates SET is_default = 1 WHERE seq = ?`
	_, txErr = tx.Exec(updateOneQuery, id)
	if txErr != nil {
		log.Printf("SetDefaultMessageTemplate - update one error: %v", txErr)
		return txErr
	}

	// 6단계: 트랜잭션 커밋
	txErr = tx.Commit()
	if txErr != nil {
		log.Printf("SetDefaultMessageTemplate - commit error: %v", txErr)
		return txErr
	}

	log.Printf("[MessageTemplate] SetDefaultMessageTemplate 완료 - 템플릿 ID: %d를 기본값으로 설정\n", id)
	return nil
}
