package survey

// MockSettings - 질문별 선택 타입 설정 (radio | checkbox)
// 서버 재시작 전까지 유지
var MockSettings = map[string]string{
	"age_group":         "radio",
	"occupation_main":   "radio",
	"occupation_detail": "radio",
	"ad_source":         "radio",
	"q1":                "checkbox",
	"q2":                "checkbox",
	"q4":                "checkbox",
	"q5":                "checkbox",
	"q6":                "radio",
	"q8":                "radio",
	"q9":                "checkbox",
}

// MockOptions - 설문 선택지 초기 데이터 (서버 재시작 전까지 유지)
var MockOptions = []SurveyOption{

	// ══ Section 1: 기본 정보 ══════════════════════════════════

	// ── 연령대 ────────────────────────────────────────────────
	{Seq: 101, Question: "age_group", Label: "20~26세", SortOrder: 1},
	{Seq: 102, Question: "age_group", Label: "27~31세", SortOrder: 2},
	{Seq: 103, Question: "age_group", Label: "32~37세", SortOrder: 3},
	{Seq: 104, Question: "age_group", Label: "38~44세", SortOrder: 4},
	{Seq: 105, Question: "age_group", Label: "45~52세", SortOrder: 5},
	{Seq: 106, Question: "age_group", Label: "53세 이상", SortOrder: 6},

	// ── 직군 — 메인 항목 ─────────────────────────────────────
	{Seq: 201, Question: "occupation_main", Label: "직장인", SortOrder: 1},
	{Seq: 202, Question: "occupation_main", Label: "전문직", SortOrder: 2},
	{Seq: 203, Question: "occupation_main", Label: "공무원 / 공공기관", SortOrder: 3},
	{Seq: 204, Question: "occupation_main", Label: "학생", SortOrder: 4},
	{Seq: 205, Question: "occupation_main", Label: "서비스 / 영업직", SortOrder: 5},
	{Seq: 206, Question: "occupation_main", Label: "자영업 / 사업", SortOrder: 6},
	{Seq: 207, Question: "occupation_main", Label: "프리랜서 / 크리에이터", SortOrder: 7},
	{Seq: 208, Question: "occupation_main", Label: "기타", SortOrder: 8},

	// ── 직군 — 세부 선택 ─────────────────────────────────────
	{Seq: 211, Question: "occupation_detail", Group: "직장인", Label: "대기업", SortOrder: 1},
	{Seq: 212, Question: "occupation_detail", Group: "직장인", Label: "중견", SortOrder: 2},
	{Seq: 213, Question: "occupation_detail", Group: "직장인", Label: "중소", SortOrder: 3},
	{Seq: 214, Question: "occupation_detail", Group: "직장인", Label: "스타트업", SortOrder: 4},
	{Seq: 221, Question: "occupation_detail", Group: "전문직", Label: "의료", SortOrder: 1},
	{Seq: 222, Question: "occupation_detail", Group: "전문직", Label: "법률", SortOrder: 2},
	{Seq: 223, Question: "occupation_detail", Group: "전문직", Label: "회계", SortOrder: 3},
	{Seq: 224, Question: "occupation_detail", Group: "전문직", Label: "금융", SortOrder: 4},
	{Seq: 231, Question: "occupation_detail", Group: "학생", Label: "대학생", SortOrder: 1},
	{Seq: 232, Question: "occupation_detail", Group: "학생", Label: "대학원생", SortOrder: 2},
	{Seq: 233, Question: "occupation_detail", Group: "학생", Label: "취준생", SortOrder: 3},

	// ── E-UT 알게 된 경로 ─────────────────────────────────────
	{Seq: 301, Question: "ad_source", Label: "인스타 / 페이스북", SortOrder: 1},
	{Seq: 302, Question: "ad_source", Label: "네이버 검색", SortOrder: 2},
	{Seq: 303, Question: "ad_source", Label: "구글", SortOrder: 3},
	{Seq: 304, Question: "ad_source", Label: "당근마켓", SortOrder: 4},
	{Seq: 305, Question: "ad_source", Label: "유튜브", SortOrder: 5},
	{Seq: 306, Question: "ad_source", Label: "지인 소개 (친구 추천)", SortOrder: 6},

	// ══ Section 2: 영어회화 현황 ══════════════════════════════

	// ── Q1: 영어회화 동기 ─────────────────────────────────────
	{Seq: 1, Question: "q1", Group: "현실 / 필요형", Label: "토익/오픽/아이엘츠 준비", SortOrder: 1},
	{Seq: 2, Question: "q1", Group: "현실 / 필요형", Label: "회사에서 승진 및 이직", SortOrder: 2},
	{Seq: 3, Question: "q1", Group: "현실 / 필요형", Label: "업무상 영어 필요", SortOrder: 3},
	{Seq: 4, Question: "q1", Group: "목표 / 준비형", Label: "워킹 홀리데이", SortOrder: 1},
	{Seq: 5, Question: "q1", Group: "목표 / 준비형", Label: "해외 거주 / 이민 준비", SortOrder: 2},
	{Seq: 6, Question: "q1", Group: "목표 / 준비형", Label: "해외 취업 / 유학 준비", SortOrder: 3},
	{Seq: 7, Question: "q1", Group: "라이프 스타일", Label: "해외 여행", SortOrder: 1},
	{Seq: 8, Question: "q1", Group: "라이프 스타일", Label: "영어 실력 유지", SortOrder: 2},
	{Seq: 9, Question: "q1", Group: "라이프 스타일", Label: "자기 계발 (취미/재미)", SortOrder: 3},
	{Seq: 10, Question: "q1", Group: "감정 / 욕망형", Label: "자신감 / 콤플렉스 극복", SortOrder: 1},
	{Seq: 11, Question: "q1", Group: "감정 / 욕망형", Label: "영어 자신감 향상", SortOrder: 2},
	{Seq: 12, Question: "q1", Group: "감정 / 욕망형", Label: "외국인 친구 사귀기", SortOrder: 3},

	// ── Q2: 영어회화 경험 ─────────────────────────────────────
	{Seq: 13, Question: "q2", Label: "학원", SortOrder: 1},
	{Seq: 14, Question: "q2", Label: "전화 / 화상 영어", SortOrder: 2},
	{Seq: 15, Question: "q2", Label: "어플리케이션", SortOrder: 3},
	{Seq: 16, Question: "q2", Label: "외국 친구", SortOrder: 4},
	{Seq: 17, Question: "q2", Label: "워홀 / 유학 / 어학연수", SortOrder: 5},
	{Seq: 18, Question: "q2", Label: "영어 스터디", SortOrder: 6},
	{Seq: 19, Question: "q2", Label: "시험", SortOrder: 7},
	{Seq: 20, Question: "q2", Label: "여행", SortOrder: 8},
	{Seq: 21, Question: "q2", Label: "경험 없음", SortOrder: 9},

	// ── Q4: 학원 선택 중요 요소 ───────────────────────────────
	{Seq: 22, Question: "q4", Label: "재미있는 수업 분위기", SortOrder: 1},
	{Seq: 23, Question: "q4", Label: "실력이 실제로 느는 커리큘럼", SortOrder: 2},
	{Seq: 24, Question: "q4", Label: "원어민 또는 좋은 강사님", SortOrder: 3},
	{Seq: 25, Question: "q4", Label: "나와 비슷한 나이대 멤버", SortOrder: 4},
	{Seq: 26, Question: "q4", Label: "커뮤니티 활동 (모임, 이벤트)", SortOrder: 5},
	{Seq: 27, Question: "q4", Label: "원하는 시간에 참여 가능한 유연한 시간표", SortOrder: 6},

	// ── Q5: 스터디 가능 시간 ──────────────────────────────────
	{Seq: 28, Question: "q5", Group: "월 · 수", Label: "오전 11시 ~ 오후 1시", SortOrder: 1},
	{Seq: 29, Question: "q5", Group: "월 · 수", Label: "오후 2시 ~ 오후 4시", SortOrder: 2},
	{Seq: 30, Question: "q5", Group: "월 · 수", Label: "오후 8시 ~ 오후 10시", SortOrder: 3},
	{Seq: 31, Question: "q5", Group: "화 · 목", Label: "오전 11시 ~ 오후 1시", SortOrder: 1},
	{Seq: 32, Question: "q5", Group: "화 · 목", Label: "오후 6시 ~ 오후 8시", SortOrder: 2},
	{Seq: 33, Question: "q5", Group: "화 · 목", Label: "오후 8시 ~ 오후 10시", SortOrder: 3},
	{Seq: 34, Question: "q5", Group: "토 · 일", Label: "오전 11시 ~ 오후 1시", SortOrder: 1},
	{Seq: 35, Question: "q5", Group: "토 · 일", Label: "오후 2시 ~ 오후 4시", SortOrder: 2},

	// ── Q6: 회화 레벨 ─────────────────────────────────────────
	{Seq: 36, Question: "q6", Label: "Baby — 이제 시작해요", SortOrder: 1},
	{Seq: 37, Question: "q6", Label: "Beginner — 말을 해보긴 했어요", SortOrder: 2},
	{Seq: 38, Question: "q6", Label: "Int-Beginner — 의사 표현은 할 수 있어요", SortOrder: 3},
	{Seq: 39, Question: "q6", Label: "Intermediate — 간단한 대화 정도는 나눌 수 있어요", SortOrder: 4},
	{Seq: 40, Question: "q6", Label: "Adv-Intermediate — 너무 어렵지 않은 대화는 가능해요", SortOrder: 5},
	{Seq: 41, Question: "q6", Label: "Advanced as Hell — 저 영어 잘해요!", SortOrder: 6},

	// ── Q8: 목표 달성 예상 기간 ───────────────────────────────
	{Seq: 42, Question: "q8", Label: "3개월", SortOrder: 1},
	{Seq: 43, Question: "q8", Label: "6개월", SortOrder: 2},
	{Seq: 44, Question: "q8", Label: "1년", SortOrder: 3},
	{Seq: 45, Question: "q8", Label: "3년", SortOrder: 4},
	{Seq: 46, Question: "q8", Label: "10년 이상", SortOrder: 5},

	// ── Q9: E-UT 관심 항목 ────────────────────────────────────
	{Seq: 47, Question: "q9", Label: "회화 스터디", SortOrder: 1},
	{Seq: 48, Question: "q9", Label: "문화 이벤트", SortOrder: 2},
	{Seq: 49, Question: "q9", Label: "사람들 만나기", SortOrder: 3},
	{Seq: 50, Question: "q9", Label: "취미 공유", SortOrder: 4},
	{Seq: 51, Question: "q9", Label: "원데이 클래스", SortOrder: 5},
}

var nextSeq = 400
