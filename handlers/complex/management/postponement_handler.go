package management

import (
	"backoffice/middleware"
	"net/http"
	"strconv"
)

// MOCK 연기 요청 데이터
var mockPostponements = []PostponementRequest{
	{ID: 1, MemberName: "김철수", PhoneNumber: "01011112222", CurrentClass: "월수 오전 레벨1", StartDate: "2026-03-10", EndDate: "2026-03-24", Reason: "개인 사정 (출장)", Status: "대기", RequestDate: "2026-03-05"},
	{ID: 2, MemberName: "이영희", PhoneNumber: "01033334444", CurrentClass: "화목 오후 프리토킹", StartDate: "2026-03-15", EndDate: "2026-04-15", Reason: "건강 상의 이유", Status: "승인", RequestDate: "2026-03-01"},
	{ID: 3, MemberName: "박지민", PhoneNumber: "01055556666", CurrentClass: "주말 집중반", StartDate: "2026-03-08", EndDate: "2026-03-15", Reason: "이사", Status: "반려", RequestDate: "2026-03-04"},
}

// PostponementListHandler - 연기 요청 목록 (백오피스용)
func PostponementListHandler(w http.ResponseWriter, r *http.Request) {
	data := struct {
		middleware.BasePageData
		Title      string
		ActiveMenu string
		Requests   []PostponementRequest
	}{
		BasePageData: middleware.GetBasePageData(r),
		Title:        "수업 연기 요청 관리",
		ActiveMenu:   "complex_postponements",
		Requests:     mockPostponements,
	}

	if err := Templates.ExecuteTemplate(w, "dashboard/postponement_list.html", data); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
	}
}

// PostponementUpdateStatusHandler - 연기 요청 상태 변경 처리
func PostponementUpdateStatusHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Invalid method", http.StatusMethodNotAllowed)
		return
	}

	idStr := r.FormValue("id")
	status := r.FormValue("status")
	id, _ := strconv.Atoi(idStr)

	for i, req := range mockPostponements {
		if req.ID == id {
			mockPostponements[i].Status = status
			break
		}
	}

	http.Redirect(w, r, "/complex/postponements", http.StatusSeeOther)
}
