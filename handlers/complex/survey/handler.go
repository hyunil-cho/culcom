package survey

import (
	"backoffice/middleware"
	"backoffice/utils"
	"encoding/json"
	"html/template"
	"log"
	"net/http"
	"strconv"
	"strings"
)

var Templates *template.Template

// OptionsHandler - 설문 선택지 관리 페이지 (GET)
func OptionsHandler(w http.ResponseWriter, r *http.Request) {
	successMessage := utils.GetFlashMessage(w, r, "success")
	errorMessage := utils.GetFlashMessage(w, r, "error")

	data := PageData{
		BasePageData:   middleware.GetBasePageData(r),
		Title:          "설문 선택지 관리",
		ActiveMenu:     "complex_survey_options",
		Questions:      Questions,
		OptionsByQ:     OptionsByQuestion(),
		InputTypes:     AllInputTypes(),
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

	if err := r.ParseForm(); err != nil {
		utils.SetFlashMessage(w, r, "error", "잘못된 요청입니다.")
		http.Redirect(w, r, "/complex/survey/options", http.StatusSeeOther)
		return
	}

	question := strings.TrimSpace(r.FormValue("question"))
	group := strings.TrimSpace(r.FormValue("group"))
	label := strings.TrimSpace(r.FormValue("label"))

	if question == "" || label == "" {
		utils.SetFlashMessage(w, r, "error", "질문과 선택지 텍스트는 필수입니다.")
		http.Redirect(w, r, "/complex/survey/options", http.StatusSeeOther)
		return
	}

	// 레이블 파싱 (JSON: [{"Key":"...","Value":"..."},...])
	var labels []LabelKV
	rawLabels := strings.TrimSpace(r.FormValue("labels"))
	if rawLabels != "" {
		_ = json.Unmarshal([]byte(rawLabels), &labels)
	}

	// 중복 체크
	for _, o := range MockOptions {
		if o.Question == question && o.Group == group && o.Label == label {
			utils.SetFlashMessage(w, r, "error", "이미 동일한 선택지가 존재합니다.")
			http.Redirect(w, r, "/complex/survey/options", http.StatusSeeOther)
			return
		}
	}

	// 해당 질문·그룹의 마지막 순서 계산
	maxOrder := 0
	for _, o := range MockOptions {
		if o.Question == question && o.Group == group && o.SortOrder > maxOrder {
			maxOrder = o.SortOrder
		}
	}

	MockOptions = append(MockOptions, SurveyOption{
		Seq:       nextSeq,
		Question:  question,
		Group:     group,
		Label:     label,
		Labels:    labels,
		SortOrder: maxOrder + 1,
	})
	nextSeq++

	utils.SetFlashMessage(w, r, "success", "선택지가 추가되었습니다.")
	http.Redirect(w, r, "/complex/survey/options", http.StatusSeeOther)
}

// UpdateTypeHandler - 질문 선택 타입 변경 (POST)
func UpdateTypeHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	if err := r.ParseForm(); err != nil {
		utils.SetFlashMessage(w, r, "error", "잘못된 요청입니다.")
		http.Redirect(w, r, "/complex/survey/options", http.StatusSeeOther)
		return
	}

	question := strings.TrimSpace(r.FormValue("question"))
	inputType := strings.TrimSpace(r.FormValue("input_type"))

	if question == "" || (inputType != "radio" && inputType != "checkbox") {
		utils.SetFlashMessage(w, r, "error", "잘못된 요청입니다.")
		http.Redirect(w, r, "/complex/survey/options", http.StatusSeeOther)
		return
	}

	MockSettings[question] = inputType

	typeLabel := map[string]string{"radio": "단일선택", "checkbox": "다중선택"}
	utils.SetFlashMessage(w, r, "success", "선택 방식이 "+typeLabel[inputType]+"으로 변경되었습니다.")
	http.Redirect(w, r, "/complex/survey/options", http.StatusSeeOther)
}

// DeleteOptionHandler - 선택지 삭제 (POST)
func DeleteOptionHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	seqStr := r.URL.Query().Get("seq")
	seq, err := strconv.Atoi(seqStr)
	if err != nil {
		utils.SetFlashMessage(w, r, "error", "잘못된 요청입니다.")
		http.Redirect(w, r, "/complex/survey/options", http.StatusSeeOther)
		return
	}

	for i, o := range MockOptions {
		if o.Seq == seq {
			MockOptions = append(MockOptions[:i], MockOptions[i+1:]...)
			utils.SetFlashMessage(w, r, "success", "선택지가 삭제되었습니다.")
			http.Redirect(w, r, "/complex/survey/options", http.StatusSeeOther)
			return
		}
	}

	utils.SetFlashMessage(w, r, "error", "해당 선택지를 찾을 수 없습니다.")
	http.Redirect(w, r, "/complex/survey/options", http.StatusSeeOther)
}
