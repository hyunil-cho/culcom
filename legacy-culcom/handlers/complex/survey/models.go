package survey

import "backoffice/middleware"

// LabelKV - key-value 형태의 레이블
type LabelKV struct {
	Key   string
	Value string
}

// SurveyOption - 설문 선택지 하나
type SurveyOption struct {
	Seq       int
	Question  string    // "age_group", "occupation_main", "occupation_detail", "ad_source", "q1"...
	Group     string    // Q1 카테고리, Q5 요일 그룹, occupation_detail의 부모 직군 (없으면 빈 문자열)
	Label     string    // 화면 표시 텍스트 + form 값
	Labels    []LabelKV // 이 선택지에 달린 key-value 레이블 목록
	SortOrder int
}

// OptionGroup - 그룹화된 선택지 (Q1, Q5, occupation_detail 용)
type OptionGroup struct {
	Name    string
	Options []SurveyOption
}

// OccupationItem - 직군 하나 (메인 라디오 + 세부 선택지)
type OccupationItem struct {
	Label      string
	SubOptions []SurveyOption // 비어 있으면 세부 선택 없음
	IsOther    bool           // "기타" 항목 여부 → 텍스트 입력 표시
}

// OccupationData - 직군 전체 구조
type OccupationData struct {
	Items []OccupationItem
}

// QuestionMeta - 질문 메타정보 (대분류 — 변경 불가)
type QuestionMeta struct {
	Seq          int // DB seq (DB 기반일 때 사용)
	Key          string
	Title        string
	Desc         string // 관리 UI 보조 설명
	Section      int    // 1: 기본 정보, 2: 영어회화 현황
	SectionTitle string // 섹션 이름 (첫 번째 질문에만 설정)
	ShowDivider  bool   // true이면 이 질문 위에 섹션 구분선 표시
	InputType    string // "checkbox" | "radio"
	IsGrouped    bool
	Groups       []string // IsGrouped=true일 때 고정 그룹명
}

// 질문 목록 (순서·제목·타입 고정, 선택지만 편집 가능)
var Questions = []QuestionMeta{
	// ── Section 1: 기본 정보 ──────────────────────────────────
	{Key: "age_group", Title: "연령대", Section: 1, ShowDivider: true, SectionTitle: "기본 정보",
		Desc: "연령대 라디오 선택지", InputType: "radio", IsGrouped: false},
	{Key: "occupation_main", Title: "직군 — 메인 항목", Section: 1,
		Desc:      "직군 목록 (라디오). 세부 선택이 있는 항목은 아래 '직군 세부 선택'에서 관리하세요.",
		InputType: "radio", IsGrouped: false},
	{Key: "occupation_detail", Title: "직군 — 세부 선택", Section: 1,
		Desc:      "그룹명 = 세부 선택이 있는 직군명 (예: 직장인, 전문직, 학생)",
		InputType: "radio", IsGrouped: true,
		Groups: []string{"직장인", "전문직", "학생"}},
	{Key: "ad_source", Title: "E-UT 알게 된 경로", Section: 1,
		Desc:      "알게 된 경로 라디오 선택지. '기타'는 항상 마지막에 고정됩니다.",
		InputType: "radio", IsGrouped: false},

	// ── Section 2: 영어회화 현황 ───────────────────────────────
	{Key: "q1", Title: "Q1. 영어회화 동기", Section: 2, ShowDivider: true, SectionTitle: "영어회화 현황",
		InputType: "checkbox", IsGrouped: true,
		Groups: []string{"현실 / 필요형", "목표 / 준비형", "라이프 스타일", "감정 / 욕망형"}},
	{Key: "q2", Title: "Q2. 영어회화 경험", Section: 2,
		InputType: "checkbox", IsGrouped: false},
	{Key: "q4", Title: "Q4. 학원 선택 중요 요소", Section: 2,
		InputType: "checkbox", IsGrouped: false},
	{Key: "q5", Title: "Q5. 스터디 가능 시간", Section: 2,
		InputType: "checkbox", IsGrouped: true,
		Groups: []string{"월 · 수", "화 · 목", "토 · 일"}},
	{Key: "q6", Title: "Q6. 현재 회화 레벨", Section: 2,
		InputType: "radio", IsGrouped: false},
	{Key: "q8", Title: "Q8. 목표 달성 예상 기간", Section: 2,
		InputType: "radio", IsGrouped: false},
	{Key: "q9", Title: "Q9. E-UT 관심 항목", Section: 2,
		InputType: "checkbox", IsGrouped: false},
}

// ─── 헬퍼 함수 ───────────────────────────────────────────────

// FlatOptions - 특정 질문의 선택지를 순서대로 반환
func FlatOptions(question string) []SurveyOption {
	var result []SurveyOption
	for _, o := range MockOptions {
		if o.Question == question {
			result = append(result, o)
		}
	}
	return result
}

// FlatOptionsWithGroup - 특정 질문 + 그룹의 선택지 반환
func FlatOptionsWithGroup(question, group string) []SurveyOption {
	var result []SurveyOption
	for _, o := range MockOptions {
		if o.Question == question && o.Group == group {
			result = append(result, o)
		}
	}
	return result
}

// GroupedOptions - 특정 질문의 선택지를 그룹별로 묶어 반환
func GroupedOptions(question string, groups []string) []OptionGroup {
	result := make([]OptionGroup, 0, len(groups))
	for _, g := range groups {
		var opts []SurveyOption
		for _, o := range MockOptions {
			if o.Question == question && o.Group == g {
				opts = append(opts, o)
			}
		}
		result = append(result, OptionGroup{Name: g, Options: opts})
	}
	return result
}

// BuildOccupationData - 직군 메인 목록 + 각 세부 선택지를 조합
func BuildOccupationData() OccupationData {
	mainOpts := FlatOptions("occupation_main")
	items := make([]OccupationItem, 0, len(mainOpts))
	for _, o := range mainOpts {
		subs := FlatOptionsWithGroup("occupation_detail", o.Label)
		items = append(items, OccupationItem{
			Label:      o.Label,
			SubOptions: subs,
			IsOther:    o.Label == "기타",
		})
	}
	return OccupationData{Items: items}
}

// OptionsByQuestion - 관리 페이지용: 모든 질문의 선택지를 map으로 반환
func OptionsByQuestion() map[string][]SurveyOption {
	m := make(map[string][]SurveyOption)
	for _, q := range Questions {
		m[q.Key] = FlatOptions(q.Key)
	}
	return m
}

// GetInputType - 질문의 현재 선택 타입 반환 (설정 없으면 기본값)
func GetInputType(key string) string {
	if t, ok := MockSettings[key]; ok {
		return t
	}
	// Questions 기본값에서 찾기
	for _, q := range Questions {
		if q.Key == key {
			return q.InputType
		}
	}
	return "checkbox"
}

// AllInputTypes - 설문 렌더링용: 모든 질문의 현재 InputType 반환
func AllInputTypes() map[string]string {
	m := make(map[string]string, len(Questions))
	for _, q := range Questions {
		m[q.Key] = GetInputType(q.Key)
	}
	return m
}

// ─── 페이지 데이터 ────────────────────────────────────────────

type PageData struct {
	middleware.BasePageData
	Title          string
	ActiveMenu     string
	Questions      []QuestionMeta
	OptionsByQ     map[string][]SurveyOption
	InputTypes     map[string]string // question key → "radio" | "checkbox"
	TemplateID     int
	TemplateName   string
	SuccessMessage string
	ErrorMessage   string
}
