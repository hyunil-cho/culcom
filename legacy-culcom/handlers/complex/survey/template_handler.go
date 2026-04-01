package survey

import (
	"backoffice/database"
	"backoffice/middleware"
	"backoffice/utils"
	"fmt"
	"log"
	"net/http"
	"strconv"
	"strings"
)

// TemplateListHandler - 설문지 목록 페이지 (GET)
func TemplateListHandler(w http.ResponseWriter, r *http.Request) {
	base := middleware.GetBasePageData(r)
	branchSeq := base.SelectedBranchSeq

	templates, err := database.GetSurveyTemplatesByBranch(branchSeq)
	if err != nil {
		log.Printf("TemplateListHandler error: %v", err)
	}

	// 선택지 수 조회
	var seqs []int
	for _, t := range templates {
		seqs = append(seqs, t.Seq)
	}
	optCounts, _ := database.GetOptionCountsByTemplate(seqs)

	type TemplateView struct {
		database.SurveyTemplate
		OptionCount int
	}
	var views []TemplateView
	for _, t := range templates {
		views = append(views, TemplateView{
			SurveyTemplate: t,
			OptionCount:    optCounts[t.Seq],
		})
	}

	successMessage := utils.GetFlashMessage(w, r, "success")
	errorMessage := utils.GetFlashMessage(w, r, "error")

	data := struct {
		middleware.BasePageData
		Title          string
		ActiveMenu     string
		Templates      []TemplateView
		SuccessMessage string
		ErrorMessage   string
	}{
		BasePageData:   base,
		Title:          "설문지 관리",
		ActiveMenu:     "complex_survey_templates",
		Templates:      views,
		SuccessMessage: successMessage,
		ErrorMessage:   errorMessage,
	}

	if err := Templates.ExecuteTemplate(w, "survey/template_list.html", data); err != nil {
		log.Printf("TemplateListHandler template error: %v", err)
		http.Error(w, err.Error(), http.StatusInternalServerError)
	}
}

// TemplateCreateHandler - 설문지 생성 (POST)
func TemplateCreateHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Invalid method", http.StatusMethodNotAllowed)
		return
	}

	base := middleware.GetBasePageData(r)
	branchSeq := base.SelectedBranchSeq

	name := strings.TrimSpace(r.FormValue("name"))
	description := strings.TrimSpace(r.FormValue("description"))

	if name == "" {
		utils.SetFlashMessage(w, r, "error", "설문지 이름을 입력해주세요.")
		http.Redirect(w, r, "/complex/survey/templates", http.StatusSeeOther)
		return
	}

	id, err := database.InsertSurveyTemplate(branchSeq, name, description)
	if err != nil {
		utils.SetFlashMessage(w, r, "error", "설문지 생성 중 오류가 발생했습니다.")
		http.Redirect(w, r, "/complex/survey/templates", http.StatusSeeOther)
		return
	}

	// 기본 질문 + 설정 삽입
	for i, q := range Questions {
		groups := ""
		if q.IsGrouped {
			groups = strings.Join(q.Groups, ",")
		}
		sectionTitle := ""
		if q.ShowDivider {
			sectionTitle = q.SectionTitle
		}
		_, _ = database.InsertSurveyQuestion(int(id), q.Key, q.Title, q.Desc, q.Section, sectionTitle, q.ShowDivider, q.InputType, q.IsGrouped, groups, i+1)
		_ = database.UpsertSurveyTemplateSetting(int(id), q.Key, q.InputType)
	}

	utils.SetFlashMessage(w, r, "success", "설문지가 생성되었습니다.")
	http.Redirect(w, r, "/complex/survey/templates", http.StatusSeeOther)
}

// TemplateCopyHandler - 설문지 복제 (POST)
func TemplateCopyHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Invalid method", http.StatusMethodNotAllowed)
		return
	}

	base := middleware.GetBasePageData(r)
	branchSeq := base.SelectedBranchSeq

	sourceIDStr := r.FormValue("source_id")
	sourceID, err := strconv.Atoi(sourceIDStr)
	if err != nil {
		utils.SetFlashMessage(w, r, "error", "잘못된 요청입니다.")
		http.Redirect(w, r, "/complex/survey/templates", http.StatusSeeOther)
		return
	}

	// 원본 이름 조회
	source, err := database.GetSurveyTemplateByID(sourceID)
	if err != nil {
		utils.SetFlashMessage(w, r, "error", "원본 설문지를 찾을 수 없습니다.")
		http.Redirect(w, r, "/complex/survey/templates", http.StatusSeeOther)
		return
	}

	newName := source.Name + " (복사본)"
	_, err = database.CopySurveyTemplate(sourceID, branchSeq, newName)
	if err != nil {
		utils.SetFlashMessage(w, r, "error", "설문지 복제 중 오류가 발생했습니다.")
		http.Redirect(w, r, "/complex/survey/templates", http.StatusSeeOther)
		return
	}

	utils.SetFlashMessage(w, r, "success", "설문지가 복제되었습니다.")
	http.Redirect(w, r, "/complex/survey/templates", http.StatusSeeOther)
}

// TemplateDeleteHandler - 설문지 삭제 (POST)
func TemplateDeleteHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Invalid method", http.StatusMethodNotAllowed)
		return
	}

	idStr := r.FormValue("id")
	id, err := strconv.Atoi(idStr)
	if err != nil {
		utils.SetFlashMessage(w, r, "error", "잘못된 요청입니다.")
		http.Redirect(w, r, "/complex/survey/templates", http.StatusSeeOther)
		return
	}

	if err := database.DeleteSurveyTemplate(id); err != nil {
		utils.SetFlashMessage(w, r, "error", "삭제 중 오류가 발생했습니다.")
		http.Redirect(w, r, "/complex/survey/templates", http.StatusSeeOther)
		return
	}

	utils.SetFlashMessage(w, r, "success", "설문지가 삭제되었습니다.")
	http.Redirect(w, r, "/complex/survey/templates", http.StatusSeeOther)
}

// TemplateStatusHandler - 설문지 상태 변경 (POST)
func TemplateStatusHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Invalid method", http.StatusMethodNotAllowed)
		return
	}

	idStr := r.FormValue("id")
	status := r.FormValue("status")
	id, err := strconv.Atoi(idStr)
	if err != nil {
		utils.SetFlashMessage(w, r, "error", "잘못된 요청입니다.")
		http.Redirect(w, r, "/complex/survey/templates", http.StatusSeeOther)
		return
	}

	if err := database.UpdateSurveyTemplateStatus(id, status); err != nil {
		utils.SetFlashMessage(w, r, "error", "상태 변경 중 오류가 발생했습니다.")
		http.Redirect(w, r, "/complex/survey/templates", http.StatusSeeOther)
		return
	}

	utils.SetFlashMessage(w, r, "success", "설문지 상태가 변경되었습니다.")
	http.Redirect(w, r, "/complex/survey/templates", http.StatusSeeOther)
}

// QuestionAddHandler - 질문(섹션) 추가 (POST)
func QuestionAddHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Invalid method", http.StatusMethodNotAllowed)
		return
	}

	templateID, _ := strconv.Atoi(r.FormValue("template_id"))
	questionKey := strings.TrimSpace(r.FormValue("question_key"))
	title := strings.TrimSpace(r.FormValue("title"))
	sectionStr := r.FormValue("section")
	sectionTitle := strings.TrimSpace(r.FormValue("section_title"))
	inputType := r.FormValue("input_type")
	isGrouped := r.FormValue("is_grouped") == "1"
	groups := strings.TrimSpace(r.FormValue("groups"))
	redirect := fmt.Sprintf("/complex/survey/options?template_id=%d", templateID)

	if templateID <= 0 || questionKey == "" || title == "" {
		utils.SetFlashMessage(w, r, "error", "질문 키와 제목은 필수입니다.")
		http.Redirect(w, r, redirect, http.StatusSeeOther)
		return
	}

	if inputType != "radio" && inputType != "checkbox" && inputType != "text" {
		inputType = "radio"
	}

	section, _ := strconv.Atoi(sectionStr)
	if section <= 0 {
		section = 1
	}

	showDivider := sectionTitle != ""
	maxOrder := database.GetMaxQuestionSortOrder(templateID)

	_, err := database.InsertSurveyQuestion(templateID, questionKey, title, "", section, sectionTitle, showDivider, inputType, isGrouped, groups, maxOrder+1)
	if err != nil {
		utils.SetFlashMessage(w, r, "error", "질문 추가 중 오류가 발생했습니다.")
		http.Redirect(w, r, redirect, http.StatusSeeOther)
		return
	}

	_ = database.UpsertSurveyTemplateSetting(templateID, questionKey, inputType)

	utils.SetFlashMessage(w, r, "success", "질문이 추가되었습니다.")
	http.Redirect(w, r, redirect, http.StatusSeeOther)
}

// QuestionDeleteHandler - 질문(섹션) 삭제 (POST)
func QuestionDeleteHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Invalid method", http.StatusMethodNotAllowed)
		return
	}

	templateID, _ := strconv.Atoi(r.FormValue("template_id"))
	seqStr := r.FormValue("seq")
	questionKey := r.FormValue("question_key")
	seq, _ := strconv.Atoi(seqStr)
	redirect := fmt.Sprintf("/complex/survey/options?template_id=%d", templateID)

	if err := database.DeleteSurveyQuestion(seq, templateID, questionKey); err != nil {
		utils.SetFlashMessage(w, r, "error", "질문 삭제 중 오류가 발생했습니다.")
		http.Redirect(w, r, redirect, http.StatusSeeOther)
		return
	}

	utils.SetFlashMessage(w, r, "success", "질문이 삭제되었습니다.")
	http.Redirect(w, r, redirect, http.StatusSeeOther)
}

// QuestionUpdateHandler - 질문 수정 (POST)
func QuestionUpdateHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Invalid method", http.StatusMethodNotAllowed)
		return
	}

	templateID, _ := strconv.Atoi(r.FormValue("template_id"))
	seq, _ := strconv.Atoi(r.FormValue("seq"))
	title := strings.TrimSpace(r.FormValue("title"))
	questionKey := strings.TrimSpace(r.FormValue("question_key"))
	inputType := r.FormValue("input_type")
	isGrouped := r.FormValue("is_grouped") == "1"
	groups := strings.TrimSpace(r.FormValue("groups"))
	redirect := fmt.Sprintf("/complex/survey/options?template_id=%d", templateID)

	if seq <= 0 || title == "" {
		utils.SetFlashMessage(w, r, "error", "질문 제목은 필수입니다.")
		http.Redirect(w, r, redirect, http.StatusSeeOther)
		return
	}

	if inputType != "radio" && inputType != "checkbox" && inputType != "text" {
		inputType = "radio"
	}

	if err := database.UpdateSurveyQuestion(seq, questionKey, title, inputType, isGrouped, groups); err != nil {
		utils.SetFlashMessage(w, r, "error", "질문 수정 중 오류가 발생했습니다.")
		http.Redirect(w, r, redirect, http.StatusSeeOther)
		return
	}

	// 설정도 동기화
	if questionKey != "" {
		_ = database.UpsertSurveyTemplateSetting(templateID, questionKey, inputType)
	}

	utils.SetFlashMessage(w, r, "success", "질문이 수정되었습니다.")
	http.Redirect(w, r, redirect, http.StatusSeeOther)
}
