package survey

import (
	"backoffice/database"
	"backoffice/middleware"
	"backoffice/utils"
	"encoding/json"
	"fmt"
	"html/template"
	"log"
	"net/http"
	"strconv"
	"strings"
)

var Templates *template.Template

// redirectURL - template_id를 유지한 리다이렉트 URL 생성
func redirectURL(templateID int) string {
	return fmt.Sprintf("/complex/survey/options?template_id=%d", templateID)
}

// OptionsHandler - 설문 선택지 관리 페이지 (GET)
func OptionsHandler(w http.ResponseWriter, r *http.Request) {
	templateIDStr := r.URL.Query().Get("template_id")
	templateID, err := strconv.Atoi(templateIDStr)
	if err != nil || templateID <= 0 {
		http.Redirect(w, r, "/complex/survey/templates", http.StatusSeeOther)
		return
	}

	tmpl, err := database.GetSurveyTemplateByID(templateID)
	if err != nil {
		http.Redirect(w, r, "/complex/survey/templates", http.StatusSeeOther)
		return
	}

	// DB에서 선택지 조회
	dbOptions, err := database.GetOptionsByTemplate(templateID)
	if err != nil {
		log.Printf("OptionsHandler - GetOptionsByTemplate error: %v", err)
	}

	// DB에서 설정 조회
	dbSettings, err := database.GetSettingsByTemplate(templateID)
	if err != nil {
		log.Printf("OptionsHandler - GetSettingsByTemplate error: %v", err)
		dbSettings = make(map[string]string)
	}

	// DB 옵션 → SurveyOption 변환 + entity_labels 조회
	var optSeqs []int
	for _, o := range dbOptions {
		optSeqs = append(optSeqs, o.Seq)
	}
	labelsMap, _ := database.GetEntityLabelsForMultiple("survey_option", optSeqs)

	var allOpts []SurveyOption
	for _, o := range dbOptions {
		var kvs []LabelKV
		for _, l := range labelsMap[o.Seq] {
			kvs = append(kvs, LabelKV{Key: l.LabelKey, Value: l.LabelVal})
		}
		allOpts = append(allOpts, SurveyOption{
			Seq:       o.Seq,
			Question:  o.QuestionKey,
			Group:     o.GroupName,
			Label:     o.Label,
			Labels:    kvs,
			SortOrder: o.SortOrder,
		})
	}

	// DB에서 질문 목록 조회
	dbQuestions, err := database.GetQuestionsByTemplate(templateID)
	if err != nil {
		log.Printf("OptionsHandler - GetQuestionsByTemplate error: %v", err)
	}

	// DB 질문 → QuestionMeta 변환
	var questions []QuestionMeta
	for _, q := range dbQuestions {
		var groups []string
		if q.IsGrouped && q.Groups != "" {
			for _, g := range strings.Split(q.Groups, ",") {
				g = strings.TrimSpace(g)
				if g != "" {
					groups = append(groups, g)
				}
			}
		}
		questions = append(questions, QuestionMeta{
			Seq:          q.Seq,
			Key:          q.QuestionKey,
			Title:        q.Title,
			Desc:         q.Description,
			Section:      q.Section,
			SectionTitle: q.SectionTitle,
			ShowDivider:  q.ShowDivider,
			InputType:    q.InputType,
			IsGrouped:    q.IsGrouped,
			Groups:       groups,
		})
	}

	// 질문별로 분류
	optsByQ := make(map[string][]SurveyOption)
	for _, q := range questions {
		optsByQ[q.Key] = nil
	}
	for _, o := range allOpts {
		optsByQ[o.Question] = append(optsByQ[o.Question], o)
	}

	// InputTypes
	inputTypes := make(map[string]string, len(questions))
	for _, q := range questions {
		if t, ok := dbSettings[q.Key]; ok {
			inputTypes[q.Key] = t
		} else {
			inputTypes[q.Key] = q.InputType
		}
	}

	successMessage := utils.GetFlashMessage(w, r, "success")
	errorMessage := utils.GetFlashMessage(w, r, "error")

	data := PageData{
		BasePageData:   middleware.GetBasePageData(r),
		Title:          tmpl.Name + " - 선택지 관리",
		ActiveMenu:     "complex_survey_templates",
		Questions:      questions,
		OptionsByQ:     optsByQ,
		InputTypes:     inputTypes,
		TemplateID:     templateID,
		TemplateName:   tmpl.Name,
		SuccessMessage: successMessage,
		ErrorMessage:   errorMessage,
	}

	if err := Templates.ExecuteTemplate(w, "survey/options.html", data); err != nil {
		log.Printf("Template error: %v", err)
		http.Error(w, "페이지를 불러올 수 없습니다", http.StatusInternalServerError)
	}
}

// AddOptionHandler - 선택지 추가 (POST)
func AddOptionHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}
	_ = r.ParseForm()

	templateID, _ := strconv.Atoi(r.FormValue("template_id"))
	question := strings.TrimSpace(r.FormValue("question"))
	group := strings.TrimSpace(r.FormValue("group"))
	label := strings.TrimSpace(r.FormValue("label"))
	redirect := redirectURL(templateID)

	if question == "" || label == "" || templateID <= 0 {
		utils.SetFlashMessage(w, r, "error", "필수 항목이 누락되었습니다.")
		http.Redirect(w, r, redirect, http.StatusSeeOther)
		return
	}

	// 레이블 파싱
	var labels []LabelKV
	rawLabels := strings.TrimSpace(r.FormValue("labels"))
	if rawLabels != "" {
		_ = json.Unmarshal([]byte(rawLabels), &labels)
	}

	// 정렬 순서 계산
	maxOrder := database.GetMaxSortOrder(templateID, question, group)

	optID, err := database.InsertSurveyOption(templateID, question, group, label, maxOrder+1)
	if err != nil {
		utils.SetFlashMessage(w, r, "error", "선택지 추가 중 오류가 발생했습니다.")
		http.Redirect(w, r, redirect, http.StatusSeeOther)
		return
	}

	// entity_labels 저장
	for _, l := range labels {
		_, _ = database.InsertEntityLabel("survey_option", int(optID), l.Key, l.Value)
	}

	utils.SetFlashMessage(w, r, "success", "선택지가 추가되었습니다.")
	http.Redirect(w, r, redirect, http.StatusSeeOther)
}

// UpdateTypeHandler - 질문 선택 타입 변경 (POST)
func UpdateTypeHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}
	_ = r.ParseForm()

	templateID, _ := strconv.Atoi(r.FormValue("template_id"))
	question := strings.TrimSpace(r.FormValue("question"))
	inputType := strings.TrimSpace(r.FormValue("input_type"))
	redirect := redirectURL(templateID)

	if question == "" || (inputType != "radio" && inputType != "checkbox" && inputType != "text") || templateID <= 0 {
		utils.SetFlashMessage(w, r, "error", "잘못된 요청입니다.")
		http.Redirect(w, r, redirect, http.StatusSeeOther)
		return
	}

	if err := database.UpsertSurveyTemplateSetting(templateID, question, inputType); err != nil {
		utils.SetFlashMessage(w, r, "error", "설정 변경 중 오류가 발생했습니다.")
		http.Redirect(w, r, redirect, http.StatusSeeOther)
		return
	}

	typeLabel := map[string]string{"radio": "단일선택", "checkbox": "다중선택", "text": "주관식"}
	utils.SetFlashMessage(w, r, "success", "선택 방식이 "+typeLabel[inputType]+"으로 변경되었습니다.")
	http.Redirect(w, r, redirect, http.StatusSeeOther)
}

// DeleteOptionHandler - 선택지 삭제 (POST)
func DeleteOptionHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	seqStr := r.URL.Query().Get("seq")
	templateIDStr := r.URL.Query().Get("template_id")
	seq, _ := strconv.Atoi(seqStr)
	templateID, _ := strconv.Atoi(templateIDStr)
	redirect := redirectURL(templateID)

	// entity_labels도 삭제
	_, _ = database.DeleteEntityLabelsAll("survey_option", seq)

	if err := database.DeleteSurveyOption(seq); err != nil {
		utils.SetFlashMessage(w, r, "error", "삭제 중 오류가 발생했습니다.")
		http.Redirect(w, r, redirect, http.StatusSeeOther)
		return
	}

	utils.SetFlashMessage(w, r, "success", "선택지가 삭제되었습니다.")
	http.Redirect(w, r, redirect, http.StatusSeeOther)
}
