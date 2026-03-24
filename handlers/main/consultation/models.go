package consultation

import surveystore "backoffice/handlers/complex/survey"

// PageData - 상담 등록 페이지 데이터
type PageData struct {
	Title          string
	ErrorMessage   string
	SuccessMessage string
}

// SurveyPageData - 설문 페이지 데이터 (동적 선택지 포함)
type SurveyPageData struct {
	Title      string
	InputTypes map[string]string // question key → "radio" | "checkbox"

	// Section 1: 기본 정보 (동적)
	AgeGroupOptions []surveystore.SurveyOption
	OccupationData  surveystore.OccupationData
	AdSourceOptions []surveystore.SurveyOption

	// Section 2: 영어회화 현황 (동적)
	Q1Groups  []surveystore.OptionGroup
	Q2Options []surveystore.SurveyOption
	Q4Options []surveystore.SurveyOption
	Q5Groups  []surveystore.OptionGroup
	Q6Options []surveystore.SurveyOption
	Q8Options []surveystore.SurveyOption
	Q9Options []surveystore.SurveyOption
}

// SuccessPageData - 상담 등록 성공 페이지 데이터
type SuccessPageData struct {
	CustomerName string
	PhoneNumber  string
}

// RegisterRequest - 상담 등록 요청
type RegisterRequest struct {
	Name        string `json:"name"`
	PhoneNumber string `json:"phone_number"`
}
