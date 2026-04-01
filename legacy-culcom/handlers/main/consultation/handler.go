package consultation

import (
	"backoffice/database"
	surveystore "backoffice/handlers/complex/survey"
	"encoding/json"
	"html/template"
	"log"
	"net/http"
	"net/url"
	"regexp"
	"strconv"
	"strings"
	"time"
)

var Templates *template.Template

// RegisterHandler - 상담 등록 페이지 (GET)
func RegisterHandler(w http.ResponseWriter, r *http.Request) {
	data := PageData{
		Title: "CulCom - 상담 신청",
	}

	if err := Templates.ExecuteTemplate(w, "consultation/register.html", data); err != nil {
		log.Printf("템플릿 실행 오류: %v", err)
		http.Error(w, "페이지를 불러올 수 없습니다", http.StatusInternalServerError)
	}
}

// SubmitHandler - 상담 등록 처리 (POST)
func SubmitHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "잘못된 요청 방식입니다", http.StatusMethodNotAllowed)
		return
	}

	// 폼 데이터 파싱
	if err := r.ParseForm(); err != nil {
		log.Printf("폼 파싱 오류: %v", err)
		http.Error(w, "잘못된 요청입니다", http.StatusBadRequest)
		return
	}

	name := strings.TrimSpace(r.FormValue("name"))
	phoneNumber := strings.TrimSpace(r.FormValue("phone_number"))

	// 유효성 검사
	if name == "" {
		renderError(w, "이름을 입력해주세요.")
		return
	}

	if phoneNumber == "" {
		renderError(w, "전화번호를 입력해주세요.")
		return
	}

	// 전화번호 형식 검증 (숫자와 하이픈만 허용)
	phoneRegex := regexp.MustCompile(`^[0-9-]+$`)
	if !phoneRegex.MatchString(phoneNumber) {
		renderError(w, "올바른 전화번호 형식이 아닙니다.")
		return
	}

	// 하이픈 제거 후 길이 체크 (10자 또는 11자)
	phoneDigits := strings.ReplaceAll(phoneNumber, "-", "")
	if len(phoneDigits) < 10 || len(phoneDigits) > 11 {
		renderError(w, "올바른 전화번호 형식이 아닙니다.")
		return
	}

	// 상담신청을 통해 들어온 고객은 지점 미배정 상태 (NULL)
	// 관리자가 나중에 지점을 배정할 수 있음
	var branchSeq *int = nil

	// 고객 정보 저장
	customerSeq, err := database.CreateCustomer(branchSeq, name, phoneNumber, "", "", "상담신청")
	if err != nil {
		log.Printf("고객 정보 저장 오류: %v", err)
		renderError(w, "상담 신청 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.")
		return
	}

	log.Printf("상담 신청 완료 - Customer ID: %d, Name: %s, Phone: %s", customerSeq, name, phoneNumber)

	// 성공 페이지로 리다이렉트
	http.Redirect(w, r, "/consultation/success?name="+name, http.StatusSeeOther)
}

// SurveyHandler - 커스터마이징 상담 설문 페이지 (GET)
func SurveyHandler(w http.ResponseWriter, r *http.Request) {
	branchSeq, _ := strconv.Atoi(r.URL.Query().Get("branch_seq"))
	templateIDStr := r.URL.Query().Get("template_id")
	templateID, _ := strconv.Atoi(templateIDStr)

	// template_id 미지정 시 지점의 활성 설문지 자동 선택
	if templateID <= 0 && branchSeq > 0 {
		templates, _ := database.GetSurveyTemplatesByBranch(branchSeq)
		for _, t := range templates {
			if t.Status == "활성" {
				templateID = t.Seq
				break
			}
		}
	}

	// DB 기반 로드 (templateID가 유효한 경우)
	if templateID > 0 {
		surveyHandlerFromDB(w, r, templateID, branchSeq)
		return
	}

	// 폴백: mock 데이터 (기존 호환)
	q1Groups := surveystore.GroupedOptions("q1", []string{"현실 / 필요형", "목표 / 준비형", "라이프 스타일", "감정 / 욕망형"})
	q5Groups := surveystore.GroupedOptions("q5", []string{"월 · 수", "화 · 목", "토 · 일"})

	data := SurveyPageData{
		Title:           "E-UT 커스터마이징 상담 설문",
		BranchSeq:       branchSeq,
		InputTypes:      surveystore.AllInputTypes(),
		AgeGroupOptions: surveystore.FlatOptions("age_group"),
		OccupationData:  surveystore.BuildOccupationData(),
		AdSourceOptions: surveystore.FlatOptions("ad_source"),
		Q1Groups:        q1Groups,
		Q2Options:       surveystore.FlatOptions("q2"),
		Q4Options:       surveystore.FlatOptions("q4"),
		Q5Groups:        q5Groups,
		Q6Options:       surveystore.FlatOptions("q6"),
		Q8Options:       surveystore.FlatOptions("q8"),
		Q9Options:       surveystore.FlatOptions("q9"),
	}

	if err := Templates.ExecuteTemplate(w, "consultation/survey.html", data); err != nil {
		log.Printf("템플릿 실행 오류: %v", err)
		http.Error(w, "페이지를 불러올 수 없습니다", http.StatusInternalServerError)
	}
}

// surveyHandlerFromDB - DB 기반 설문 페이지 렌더링
func surveyHandlerFromDB(w http.ResponseWriter, r *http.Request, templateID, branchSeq int) {
	dbOptions, err := database.GetOptionsByTemplate(templateID)
	if err != nil {
		log.Printf("surveyHandlerFromDB - GetOptionsByTemplate error: %v", err)
		http.Error(w, "설문지를 불러올 수 없습니다", http.StatusInternalServerError)
		return
	}

	dbSettings, _ := database.GetSettingsByTemplate(templateID)
	dbQuestions, _ := database.GetQuestionsByTemplate(templateID)

	// DB 옵션 → SurveyOption 변환
	var allOpts []surveystore.SurveyOption
	for _, o := range dbOptions {
		allOpts = append(allOpts, surveystore.SurveyOption{
			Seq:       o.Seq,
			Question:  o.QuestionKey,
			Group:     o.GroupName,
			Label:     o.Label,
			SortOrder: o.SortOrder,
		})
	}

	// 질문별 그룹명 맵 구성
	questionGroups := make(map[string][]string)
	for _, q := range dbQuestions {
		if q.IsGrouped && q.Groups != "" {
			var groups []string
			for _, g := range strings.Split(q.Groups, ",") {
				g = strings.TrimSpace(g)
				if g != "" {
					groups = append(groups, g)
				}
			}
			questionGroups[q.QuestionKey] = groups
		}
	}

	// 헬퍼: 질문별 flat 옵션
	flatOpts := func(question string) []surveystore.SurveyOption {
		var result []surveystore.SurveyOption
		for _, o := range allOpts {
			if o.Question == question {
				result = append(result, o)
			}
		}
		return result
	}

	// 헬퍼: 그룹별 옵션
	groupedOpts := func(question string) []surveystore.OptionGroup {
		groups := questionGroups[question]
		result := make([]surveystore.OptionGroup, 0, len(groups))
		for _, g := range groups {
			var opts []surveystore.SurveyOption
			for _, o := range allOpts {
				if o.Question == question && o.Group == g {
					opts = append(opts, o)
				}
			}
			result = append(result, surveystore.OptionGroup{Name: g, Options: opts})
		}
		return result
	}

	// 직군 데이터 조합
	mainOpts := flatOpts("occupation_main")
	var occItems []surveystore.OccupationItem
	for _, o := range mainOpts {
		var subs []surveystore.SurveyOption
		for _, s := range allOpts {
			if s.Question == "occupation_detail" && s.Group == o.Label {
				subs = append(subs, s)
			}
		}
		occItems = append(occItems, surveystore.OccupationItem{
			Label:      o.Label,
			SubOptions: subs,
			IsOther:    o.Label == "기타",
		})
	}

	// InputTypes: DB 질문 기반
	inputTypes := make(map[string]string)
	for _, q := range dbQuestions {
		if t, ok := dbSettings[q.QuestionKey]; ok {
			inputTypes[q.QuestionKey] = t
		} else {
			inputTypes[q.QuestionKey] = q.InputType
		}
	}

	data := SurveyPageData{
		Title:           "E-UT 커스터마이징 상담 설문",
		BranchSeq:       branchSeq,
		InputTypes:      inputTypes,
		AgeGroupOptions: flatOpts("age_group"),
		OccupationData:  surveystore.OccupationData{Items: occItems},
		AdSourceOptions: flatOpts("ad_source"),
		Q1Groups:        groupedOpts("q1"),
		Q2Options:       flatOpts("q2"),
		Q4Options:       flatOpts("q4"),
		Q5Groups:        groupedOpts("q5"),
		Q6Options:       flatOpts("q6"),
		Q8Options:       flatOpts("q8"),
		Q9Options:       flatOpts("q9"),
	}

	if err := Templates.ExecuteTemplate(w, "consultation/survey.html", data); err != nil {
		log.Printf("surveyHandlerFromDB 템플릿 실행 오류: %v", err)
		http.Error(w, "페이지를 불러올 수 없습니다", http.StatusInternalServerError)
	}
}

// SuccessHandler - 상담 신청 완료 페이지
func SuccessHandler(w http.ResponseWriter, r *http.Request) {
	customerName := r.URL.Query().Get("name")
	if customerName == "" {
		customerName = "고객님"
	}

	data := SuccessPageData{
		CustomerName: customerName,
	}

	if err := Templates.ExecuteTemplate(w, "consultation/success.html", data); err != nil {
		log.Printf("템플릿 실행 오류: %v", err)
		http.Error(w, "페이지를 불러올 수 없습니다", http.StatusInternalServerError)
	}
}

// SurveySubmitHandler - 설문 제출 처리 (POST)
func SurveySubmitHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	if err := r.ParseForm(); err != nil {
		log.Printf("폼 파싱 오류: %v", err)
		http.Error(w, "잘못된 요청입니다", http.StatusBadRequest)
		return
	}

	branchSeq, _ := strconv.Atoi(r.FormValue("branch_seq"))
	phone := strings.ReplaceAll(r.FormValue("phone_number"), "-", "")

	submission := SurveySubmission{
		ID:               nextSubmissionID,
		SubmittedAt:      time.Now().Format("2006-01-02 15:04"),
		BranchSeq:        branchSeq,
		Name:             strings.TrimSpace(r.FormValue("name")),
		Phone:            phone,
		Gender:           r.FormValue("gender"),
		Location:         strings.TrimSpace(r.FormValue("location")),
		AgeGroup:         surveyFormValue(r, "age_group"),
		Occupation:       r.FormValue("occupation"),
		OccupationDetail: r.FormValue("occupation_detail"),
		AdSource:         surveyFormValue(r, "ad_source"),
		Q1:               surveyFormValues(r, "q1"),
		Q2:               surveyFormValues(r, "q2"),
		Q3:               strings.TrimSpace(r.FormValue("q3")),
		Q4:               surveyFormValues(r, "q4"),
		Q5:               surveyFormValues(r, "q5"),
		Q6:               surveyFormValue(r, "q6"),
		Q7:               strings.TrimSpace(r.FormValue("q7")),
		Q8:               surveyFormValue(r, "q8"),
		Q9:               surveyFormValues(r, "q9"),
	}
	nextSubmissionID++
	MockSurveySubmissions = append(MockSurveySubmissions, submission)

	log.Printf("설문 제출 완료 - ID: %d, Name: %s, BranchSeq: %d", submission.ID, submission.Name, submission.BranchSeq)
	http.Redirect(w, r, "/consultation/success?name="+url.QueryEscape(submission.Name), http.StatusSeeOther)
}

// surveyFormValue - radio 또는 checkbox 단일 값 추출
func surveyFormValue(r *http.Request, key string) string {
	if vals, ok := r.Form[key+"[]"]; ok && len(vals) > 0 {
		return vals[0]
	}
	return r.FormValue(key)
}

// surveyFormValues - checkbox 복수 값 또는 radio 단일 값을 슬라이스로 반환
func surveyFormValues(r *http.Request, key string) []string {
	if vals, ok := r.Form[key+"[]"]; ok && len(vals) > 0 {
		return vals
	}
	if val := r.FormValue(key); val != "" {
		return []string{val}
	}
	return nil
}

// SurveySubmissionsAPIHandler - 제출된 설문 목록 조회 API (GET, JSON)
func SurveySubmissionsAPIHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(MockSurveySubmissions); err != nil {
		log.Printf("JSON 인코딩 오류: %v", err)
		http.Error(w, "서버 오류", http.StatusInternalServerError)
	}
}

// renderError - 에러 메시지와 함께 등록 페이지 다시 표시
func renderError(w http.ResponseWriter, message string) {
	data := PageData{
		Title:        "CulCom - 상담 신청",
		ErrorMessage: message,
	}

	if err := Templates.ExecuteTemplate(w, "consultation/register.html", data); err != nil {
		log.Printf("템플릿 실행 오류: %v", err)
		http.Error(w, "페이지를 불러올 수 없습니다", http.StatusInternalServerError)
	}
}
