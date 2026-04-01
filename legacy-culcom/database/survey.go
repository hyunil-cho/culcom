package database

import (
	"database/sql"
	"log"
	"strings"
)

// SurveyTemplate - 설문지 템플릿
type SurveyTemplate struct {
	Seq            int
	BranchSeq      int
	Name           string
	Description    string
	Status         string
	CreatedDate    string
	LastUpdateDate *string
}

// SurveyTemplateOption - 설문지 선택지
type SurveyTemplateOption struct {
	Seq         int
	TemplateSeq int
	QuestionKey string
	GroupName   string
	Label       string
	SortOrder   int
}

// SurveyTemplateSetting - 설문지 질문별 입력 타입
type SurveyTemplateSetting struct {
	Seq         int
	TemplateSeq int
	QuestionKey string
	InputType   string
}

// SurveyTemplateQuestion - 설문지 질문 정의
type SurveyTemplateQuestion struct {
	Seq          int
	TemplateSeq  int
	QuestionKey  string
	Title        string
	Description  string
	Section      int
	SectionTitle string
	ShowDivider  bool
	InputType    string
	IsGrouped    bool
	Groups       string // 쉼표 구분
	SortOrder    int
}

// ─── 설문지 템플릿 CRUD ─────────────────────────────────────

// InsertSurveyTemplate - 설문지 생성
func InsertSurveyTemplate(branchSeq int, name, description string) (int64, error) {
	query := `INSERT INTO survey_templates (branch_seq, name, description) VALUES (?, ?, ?)`
	result, err := DB.Exec(query, branchSeq, name, description)
	if err != nil {
		log.Printf("InsertSurveyTemplate error: %v", err)
		return 0, err
	}
	id, err := result.LastInsertId()
	if err != nil {
		log.Printf("InsertSurveyTemplate get id error: %v", err)
		return 0, err
	}
	log.Printf("InsertSurveyTemplate success - ID: %d, Name: %s", id, name)
	return id, nil
}

// GetSurveyTemplatesByBranch - 지점별 설문지 목록
func GetSurveyTemplatesByBranch(branchSeq int) ([]SurveyTemplate, error) {
	query := `
		SELECT seq, branch_seq, name, IFNULL(description, ''), status,
			DATE_FORMAT(createdDate, '%Y-%m-%d %H:%i') as createdDate,
			DATE_FORMAT(lastUpdateDate, '%Y-%m-%d %H:%i') as lastUpdateDate
		FROM survey_templates
		WHERE branch_seq = ?
		ORDER BY createdDate DESC
	`
	rows, err := DB.Query(query, branchSeq)
	if err != nil {
		log.Printf("GetSurveyTemplatesByBranch error: %v", err)
		return nil, err
	}
	defer rows.Close()

	var templates []SurveyTemplate
	for rows.Next() {
		var t SurveyTemplate
		if err := rows.Scan(&t.Seq, &t.BranchSeq, &t.Name, &t.Description, &t.Status, &t.CreatedDate, &t.LastUpdateDate); err != nil {
			log.Printf("GetSurveyTemplatesByBranch scan error: %v", err)
			continue
		}
		templates = append(templates, t)
	}
	return templates, nil
}

// GetSurveyTemplateByID - 설문지 단건 조회
func GetSurveyTemplateByID(id int) (*SurveyTemplate, error) {
	query := `
		SELECT seq, branch_seq, name, IFNULL(description, ''), status,
			DATE_FORMAT(createdDate, '%Y-%m-%d %H:%i') as createdDate,
			DATE_FORMAT(lastUpdateDate, '%Y-%m-%d %H:%i') as lastUpdateDate
		FROM survey_templates WHERE seq = ?
	`
	var t SurveyTemplate
	err := DB.QueryRow(query, id).Scan(&t.Seq, &t.BranchSeq, &t.Name, &t.Description, &t.Status, &t.CreatedDate, &t.LastUpdateDate)
	if err != nil {
		log.Printf("GetSurveyTemplateByID error: %v", err)
		return nil, err
	}
	return &t, nil
}

// UpdateSurveyTemplate - 설문지 이름/설명 수정
func UpdateSurveyTemplate(id int, name, description string) error {
	query := `UPDATE survey_templates SET name = ?, description = ? WHERE seq = ?`
	_, err := DB.Exec(query, name, description, id)
	if err != nil {
		log.Printf("UpdateSurveyTemplate error: %v", err)
	}
	return err
}

// UpdateSurveyTemplateStatus - 설문지 상태 변경
func UpdateSurveyTemplateStatus(id int, status string) error {
	query := `UPDATE survey_templates SET status = ? WHERE seq = ?`
	_, err := DB.Exec(query, status, id)
	if err != nil {
		log.Printf("UpdateSurveyTemplateStatus error: %v", err)
	}
	return err
}

// DeleteSurveyTemplate - 설문지 삭제 (CASCADE로 옵션/설정도 삭제)
func DeleteSurveyTemplate(id int) error {
	query := `DELETE FROM survey_templates WHERE seq = ?`
	_, err := DB.Exec(query, id)
	if err != nil {
		log.Printf("DeleteSurveyTemplate error: %v", err)
	}
	return err
}

// ─── 설문지 선택지 CRUD ─────────────────────────────────────

// GetOptionsByTemplate - 설문지의 전체 선택지 조회
func GetOptionsByTemplate(templateSeq int) ([]SurveyTemplateOption, error) {
	query := `
		SELECT seq, template_seq, question_key, IFNULL(group_name, ''), label, sort_order
		FROM survey_template_options
		WHERE template_seq = ?
		ORDER BY question_key, group_name, sort_order ASC
	`
	rows, err := DB.Query(query, templateSeq)
	if err != nil {
		log.Printf("GetOptionsByTemplate error: %v", err)
		return nil, err
	}
	defer rows.Close()

	var options []SurveyTemplateOption
	for rows.Next() {
		var o SurveyTemplateOption
		if err := rows.Scan(&o.Seq, &o.TemplateSeq, &o.QuestionKey, &o.GroupName, &o.Label, &o.SortOrder); err != nil {
			continue
		}
		options = append(options, o)
	}
	return options, nil
}

// InsertSurveyOption - 선택지 추가
func InsertSurveyOption(templateSeq int, questionKey, groupName, label string, sortOrder int) (int64, error) {
	query := `INSERT INTO survey_template_options (template_seq, question_key, group_name, label, sort_order) VALUES (?, ?, ?, ?, ?)`
	result, err := DB.Exec(query, templateSeq, questionKey, groupName, label, sortOrder)
	if err != nil {
		log.Printf("InsertSurveyOption error: %v", err)
		return 0, err
	}
	return result.LastInsertId()
}

// DeleteSurveyOption - 선택지 삭제
func DeleteSurveyOption(seq int) error {
	_, err := DB.Exec(`DELETE FROM survey_template_options WHERE seq = ?`, seq)
	if err != nil {
		log.Printf("DeleteSurveyOption error: %v", err)
	}
	return err
}

// GetMaxSortOrder - 특정 질문/그룹의 최대 정렬순서
func GetMaxSortOrder(templateSeq int, questionKey, groupName string) int {
	var maxOrder int
	err := DB.QueryRow(
		`SELECT IFNULL(MAX(sort_order), 0) FROM survey_template_options WHERE template_seq = ? AND question_key = ? AND group_name = ?`,
		templateSeq, questionKey, groupName,
	).Scan(&maxOrder)
	if err != nil {
		return 0
	}
	return maxOrder
}

// ─── 설문지 질문 CRUD ───────────────────────────────────────

// GetQuestionsByTemplate - 설문지의 질문 목록 조회
func GetQuestionsByTemplate(templateSeq int) ([]SurveyTemplateQuestion, error) {
	query := `
		SELECT seq, template_seq, question_key, title, IFNULL(description, ''),
			section, IFNULL(section_title, ''), show_divider, input_type,
			is_grouped, IFNULL(groups, ''), sort_order
		FROM survey_template_questions
		WHERE template_seq = ?
		ORDER BY sort_order ASC, seq ASC
	`
	rows, err := DB.Query(query, templateSeq)
	if err != nil {
		log.Printf("GetQuestionsByTemplate error: %v", err)
		return nil, err
	}
	defer rows.Close()

	var questions []SurveyTemplateQuestion
	for rows.Next() {
		var q SurveyTemplateQuestion
		if err := rows.Scan(&q.Seq, &q.TemplateSeq, &q.QuestionKey, &q.Title, &q.Description,
			&q.Section, &q.SectionTitle, &q.ShowDivider, &q.InputType,
			&q.IsGrouped, &q.Groups, &q.SortOrder); err != nil {
			log.Printf("GetQuestionsByTemplate scan error: %v", err)
			continue
		}
		questions = append(questions, q)
	}
	return questions, nil
}

// InsertSurveyQuestion - 질문 추가
func InsertSurveyQuestion(templateSeq int, questionKey, title, description string, section int, sectionTitle string, showDivider bool, inputType string, isGrouped bool, groups string, sortOrder int) (int64, error) {
	query := `
		INSERT INTO survey_template_questions
			(template_seq, question_key, title, description, section, section_title, show_divider, input_type, is_grouped, groups, sort_order)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
	`
	result, err := DB.Exec(query, templateSeq, questionKey, title, description, section, sectionTitle, showDivider, inputType, isGrouped, groups, sortOrder)
	if err != nil {
		log.Printf("InsertSurveyQuestion error: %v", err)
		return 0, err
	}
	return result.LastInsertId()
}

// DeleteSurveyQuestion - 질문 삭제 (해당 질문의 선택지도 삭제)
func DeleteSurveyQuestion(seq int, templateSeq int, questionKey string) error {
	return Transaction(func(tx *sql.Tx) error {
		// 선택지 삭제
		_, err := tx.Exec(`DELETE FROM survey_template_options WHERE template_seq = ? AND question_key = ?`, templateSeq, questionKey)
		if err != nil {
			return err
		}
		// 설정 삭제
		_, err = tx.Exec(`DELETE FROM survey_template_settings WHERE template_seq = ? AND question_key = ?`, templateSeq, questionKey)
		if err != nil {
			return err
		}
		// 질문 삭제
		_, err = tx.Exec(`DELETE FROM survey_template_questions WHERE seq = ?`, seq)
		return err
	})
}

// UpdateSurveyQuestion - 질문 수정
func UpdateSurveyQuestion(seq int, questionKey, title, inputType string, isGrouped bool, groups string) error {
	query := `UPDATE survey_template_questions SET question_key = ?, title = ?, input_type = ?, is_grouped = ?, groups = ? WHERE seq = ?`
	_, err := DB.Exec(query, questionKey, title, inputType, isGrouped, groups, seq)
	if err != nil {
		log.Printf("UpdateSurveyQuestion error: %v", err)
	}
	return err
}

// GetMaxQuestionSortOrder - 질문 최대 정렬순서
func GetMaxQuestionSortOrder(templateSeq int) int {
	var maxOrder int
	_ = DB.QueryRow(`SELECT IFNULL(MAX(sort_order), 0) FROM survey_template_questions WHERE template_seq = ?`, templateSeq).Scan(&maxOrder)
	return maxOrder
}

// ─── 설문지 설정 CRUD ───────────────────────────────────────

// GetSettingsByTemplate - 설문지의 질문별 입력 타입 조회
func GetSettingsByTemplate(templateSeq int) (map[string]string, error) {
	query := `SELECT question_key, input_type FROM survey_template_settings WHERE template_seq = ?`
	rows, err := DB.Query(query, templateSeq)
	if err != nil {
		log.Printf("GetSettingsByTemplate error: %v", err)
		return nil, err
	}
	defer rows.Close()

	m := make(map[string]string)
	for rows.Next() {
		var key, typ string
		if err := rows.Scan(&key, &typ); err != nil {
			continue
		}
		m[key] = typ
	}
	return m, nil
}

// UpsertSurveyTemplateSetting - 설정 추가/수정 (UPSERT)
func UpsertSurveyTemplateSetting(templateSeq int, questionKey, inputType string) error {
	query := `
		INSERT INTO survey_template_settings (template_seq, question_key, input_type)
		VALUES (?, ?, ?)
		ON DUPLICATE KEY UPDATE input_type = VALUES(input_type)
	`
	_, err := DB.Exec(query, templateSeq, questionKey, inputType)
	if err != nil {
		log.Printf("UpsertSurveyTemplateSetting error: %v", err)
	}
	return err
}

// ─── 설문지 복제 ────────────────────────────────────────────

// CopySurveyTemplate - 설문지 복제 (설정 + 선택지 + 레이블 모두 복사)
func CopySurveyTemplate(sourceID, branchSeq int, newName string) (int64, error) {
	var newID int64

	err := Transaction(func(tx *sql.Tx) error {
		// 1. 원본 조회
		var desc sql.NullString
		err := tx.QueryRow(`SELECT description FROM survey_templates WHERE seq = ?`, sourceID).Scan(&desc)
		if err != nil {
			return err
		}

		// 2. 새 템플릿 생성
		result, err := tx.Exec(
			`INSERT INTO survey_templates (branch_seq, name, description, status) VALUES (?, ?, ?, '작성중')`,
			branchSeq, newName, desc,
		)
		if err != nil {
			return err
		}
		newID, err = result.LastInsertId()
		if err != nil {
			return err
		}

		// 3. 질문 복사
		_, err = tx.Exec(`
			INSERT INTO survey_template_questions
				(template_seq, question_key, title, description, section, section_title, show_divider, input_type, is_grouped, groups, sort_order)
			SELECT ?, question_key, title, description, section, section_title, show_divider, input_type, is_grouped, groups, sort_order
			FROM survey_template_questions WHERE template_seq = ?
		`, newID, sourceID)
		if err != nil {
			return err
		}

		// 4. 설정 복사
		_, err = tx.Exec(`
			INSERT INTO survey_template_settings (template_seq, question_key, input_type)
			SELECT ?, question_key, input_type
			FROM survey_template_settings WHERE template_seq = ?
		`, newID, sourceID)
		if err != nil {
			return err
		}

		// 5. 선택지 복사 + entity_labels 복사
		optRows, err := tx.Query(`SELECT seq, question_key, group_name, label, sort_order FROM survey_template_options WHERE template_seq = ?`, sourceID)
		if err != nil {
			return err
		}
		defer optRows.Close()

		type oldNew struct {
			oldSeq int
			newSeq int64
		}
		var pairs []oldNew

		for optRows.Next() {
			var oldSeq, sortOrder int
			var qKey, gName, lbl string
			if err := optRows.Scan(&oldSeq, &qKey, &gName, &lbl, &sortOrder); err != nil {
				continue
			}
			res, err := tx.Exec(
				`INSERT INTO survey_template_options (template_seq, question_key, group_name, label, sort_order) VALUES (?, ?, ?, ?, ?)`,
				newID, qKey, gName, lbl, sortOrder,
			)
			if err != nil {
				continue
			}
			nSeq, _ := res.LastInsertId()
			pairs = append(pairs, oldNew{oldSeq: oldSeq, newSeq: nSeq})
		}

		// 5. entity_labels 복사 (survey_option 타입)
		for _, p := range pairs {
			_, err := tx.Exec(`
				INSERT INTO entity_labels (entity_type, entity_seq, label_key, label_val)
				SELECT 'survey_option', ?, label_key, label_val
				FROM entity_labels WHERE entity_type = 'survey_option' AND entity_seq = ?
			`, p.newSeq, p.oldSeq)
			if err != nil {
				continue
			}
		}

		return nil
	})

	if err != nil {
		log.Printf("CopySurveyTemplate error: %v", err)
		return 0, err
	}
	log.Printf("CopySurveyTemplate success - Source: %d, New: %d", sourceID, newID)
	return newID, nil
}

// ─── 옵션 수 카운트 ─────────────────────────────────────────

// GetOptionCountsByTemplate - 설문지의 질문별 선택지 수 조회
func GetOptionCountsByTemplate(templateSeqs []int) (map[int]int, error) {
	if len(templateSeqs) == 0 {
		return make(map[int]int), nil
	}

	placeholders := make([]string, len(templateSeqs))
	args := make([]any, len(templateSeqs))
	for i, seq := range templateSeqs {
		placeholders[i] = "?"
		args[i] = seq
	}

	query := `SELECT template_seq, COUNT(*) FROM survey_template_options WHERE template_seq IN (` + strings.Join(placeholders, ",") + `) GROUP BY template_seq`
	rows, err := DB.Query(query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	m := make(map[int]int)
	for rows.Next() {
		var seq, count int
		if err := rows.Scan(&seq, &count); err != nil {
			continue
		}
		m[seq] = count
	}
	return m, nil
}
