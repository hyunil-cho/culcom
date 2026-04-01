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
	BranchSeq  int
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

// SurveySubmission - 제출된 설문 데이터
type SurveySubmission struct {
	ID               int      `json:"id"`
	SubmittedAt      string   `json:"submitted_at"`
	BranchSeq        int      `json:"branch_seq"`
	Name             string   `json:"name"`
	Phone            string   `json:"phone"`
	Gender           string   `json:"gender"`
	Location         string   `json:"location"`
	AgeGroup         string   `json:"age_group"`
	Occupation       string   `json:"occupation"`
	OccupationDetail string   `json:"occupation_detail"`
	AdSource         string   `json:"ad_source"`
	Q1               []string `json:"q1"`
	Q2               []string `json:"q2"`
	Q3               string   `json:"q3"`
	Q4               []string `json:"q4"`
	Q5               []string `json:"q5"`
	Q6               string   `json:"q6"`
	Q7               string   `json:"q7"`
	Q8               string   `json:"q8"`
	Q9               []string `json:"q9"`
}

// MockSurveySubmissions - 제출된 설문 mock 저장소
var MockSurveySubmissions = []SurveySubmission{
	{
		ID: 1, SubmittedAt: "2026-03-20 14:32", BranchSeq: 1,
		Name: "김지수", Phone: "01098765432", Gender: "여",
		Location: "서울 강남구 역삼동", AgeGroup: "32~37세",
		Occupation: "직장인", OccupationDetail: "대기업",
		AdSource: "인스타 / 페이스북",
		Q1:       []string{"회사에서 승진 및 이직", "해외 여행"},
		Q2:       []string{"학원"},
		Q3:       "시간이 맞지 않아서 그만뒀어요.",
		Q4:       []string{"실력이 실제로 느는 커리큘럼", "원하는 시간에 참여 가능한 유연한 시간표"},
		Q5:       []string{"오후 8시 ~ 오후 10시"},
		Q6:       "Int-Beginner — 의사 표현은 할 수 있어요",
		Q7:       "외국인 파트너와 자유롭게 업무 대화를 하고 싶어요.",
		Q8:       "6개월", Q9: []string{"회화 스터디", "사람들 만나기"},
	},
	{
		ID: 2, SubmittedAt: "2026-03-22 10:05", BranchSeq: 2,
		Name: "박민준", Phone: "01055443322", Gender: "남",
		Location: "서울 마포구 합정동", AgeGroup: "20~26세",
		Occupation: "학생", OccupationDetail: "대학생",
		AdSource: "지인 소개 (친구 추천)",
		Q1:       []string{"해외 거주 / 이민 준비"},
		Q2:       []string{"경험 없음"},
		Q3:       "없음",
		Q4:       []string{"재미있는 수업 분위기"},
		Q5:       []string{"오전 11시 ~ 오후 1시", "오후 2시 ~ 오후 4시"},
		Q6:       "Baby — 이제 시작해요",
		Q7:       "유학 가서 수업을 따라갈 수 있는 수준이 되고 싶습니다.",
		Q8:       "1년", Q9: []string{"문화 이벤트"},
	},
	{
		ID: 3, SubmittedAt: "2026-03-23 16:48", BranchSeq: 1,
		Name: "이서연", Phone: "01011223344", Gender: "여",
		Location: "경기 성남시 분당구", AgeGroup: "38~44세",
		Occupation: "자영업 / 사업",
		AdSource:   "네이버 검색",
		Q1:         []string{"자기 계발 (취미/재미)", "해외 여행"},
		Q2:         []string{"워홀 / 유학 / 어학연수", "학원"},
		Q3:         "비용 부담이 컸어요.",
		Q4:         []string{"실력이 실제로 느는 커리큘럼", "원어민 또는 좋은 강사님"},
		Q5:         []string{"오전 11시 ~ 오후 1시"},
		Q6:         "Intermediate — 간단한 대화 정도는 나눌 수 있어요",
		Q7:         "영어로 해외 바이어와 협상할 수 있을 정도",
		Q8:         "3개월", Q9: []string{"회화 스터디"},
	},
	{
		ID: 4, SubmittedAt: "2026-03-24 09:15", BranchSeq: 1,
		Name: "최동훈", Phone: "01077889900", Gender: "남",
		Location: "서울 송파구 잠실동", AgeGroup: "32~37세",
		Occupation: "직장인", OccupationDetail: "스타트업",
		AdSource: "인스타 / 페이스북",
		Q1:       []string{"회사에서 승진 및 이직", "해외 취업 / 유학 준비"},
		Q2:       []string{"학원"},
		Q3:       "강사가 자주 바뀌어서 그만뒀습니다.",
		Q4:       []string{"실력이 실제로 느는 커리큘럼", "원어민 또는 좋은 강사님"},
		Q5:       []string{"오후 8시 ~ 오후 10시"},
		Q6:       "Int-Beginner — 의사 표현은 할 수 있어요",
		Q7:       "영어 면접을 자신 있게 볼 수 있을 정도",
		Q8:       "6개월", Q9: []string{"회화 스터디", "취미 공유"},
	},
}

var nextSubmissionID = 5
