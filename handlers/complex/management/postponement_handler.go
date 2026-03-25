package management

import (
	"backoffice/middleware"
	"encoding/json"
	"net/http"
	"strconv"
	"strings"
)

// MOCK 연기 요청 데이터
var mockPostponements = []PostponementRequest{
	{ID: 1, MemberName: "김철수", PhoneNumber: "01011112222", CurrentClass: "월수 오전 레벨1", StartDate: "2026-03-10", EndDate: "2026-03-24", Reason: "개인 사정 (출장)", Status: "대기", RequestDate: "2026-03-05", UsedCount: 1, RemainingCount: 2},
	{ID: 2, MemberName: "이영희", PhoneNumber: "01033334444", CurrentClass: "화목 오후 프리토킹", StartDate: "2026-03-15", EndDate: "2026-04-15", Reason: "건강 상의 이유", Status: "승인", RequestDate: "2026-03-01", UsedCount: 2, RemainingCount: 1},
	{ID: 3, MemberName: "박지민", PhoneNumber: "01055556666", CurrentClass: "주말 집중반", StartDate: "2026-03-08", EndDate: "2026-03-15", Reason: "이사", Status: "반려", RejectReason: "연기 기간이 너무 짧아 수업 조정이 어렵습니다.", RequestDate: "2026-03-04", UsedCount: 0, RemainingCount: 3},
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
	rejectReason := r.FormValue("reject_reason")
	id, _ := strconv.Atoi(idStr)

	for i, req := range mockPostponements {
		if req.ID == id {
			mockPostponements[i].Status = status
			if status == "반려" {
				mockPostponements[i].RejectReason = rejectReason
			} else {
				mockPostponements[i].RejectReason = ""
			}
			break
		}
	}

	http.Redirect(w, r, "/complex/postponements", http.StatusSeeOther)
}

// ReasonLabelKV - 연기사유 레이블 key-value
type ReasonLabelKV struct {
	Key   string `json:"Key"`
	Value string `json:"Value"`
}

// PostponementReason - 연기사유 항목
type PostponementReason struct {
	ID     int
	Label  string
	Labels []ReasonLabelKV
}

// MOCK 연기사유 목록
var mockPostponementReasons = []PostponementReason{
	{ID: 1, Label: "개인 사정 (출장/여행)", Labels: []ReasonLabelKV{{Key: "카테고리", Value: "개인"}, {Key: "평균기간", Value: "1~2주"}}},
	{ID: 2, Label: "건강 상의 이유", Labels: []ReasonLabelKV{{Key: "카테고리", Value: "건강"}, {Key: "증빙", Value: "진단서 권장"}}},
	{ID: 3, Label: "업무 일정 변경", Labels: []ReasonLabelKV{{Key: "카테고리", Value: "업무"}}},
	{ID: 4, Label: "가족 행사 / 경조사"},
	{ID: 5, Label: "시험 준비", Labels: []ReasonLabelKV{{Key: "카테고리", Value: "학업"}}},
	{ID: 6, Label: "이사 / 거주지 변경"},
}

var nextReasonID = 7

// PostponementReasonListHandler - 연기사유 관리 페이지 (GET)
func PostponementReasonListHandler(w http.ResponseWriter, r *http.Request) {
	data := struct {
		middleware.BasePageData
		Title      string
		ActiveMenu string
		Reasons    []PostponementReason
	}{
		BasePageData: middleware.GetBasePageData(r),
		Title:        "연기사유 관리",
		ActiveMenu:   "complex_postponement_reasons",
		Reasons:      mockPostponementReasons,
	}

	if err := Templates.ExecuteTemplate(w, "dashboard/postponement_reasons.html", data); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
	}
}

// PostponementReasonAddHandler - 연기사유 추가 (POST)
func PostponementReasonAddHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Invalid method", http.StatusMethodNotAllowed)
		return
	}

	label := strings.TrimSpace(r.FormValue("label"))
	if label == "" {
		http.Redirect(w, r, "/complex/postponements/reasons", http.StatusSeeOther)
		return
	}

	var labels []ReasonLabelKV
	rawLabels := strings.TrimSpace(r.FormValue("labels"))
	if rawLabels != "" {
		_ = json.Unmarshal([]byte(rawLabels), &labels)
	}

	mockPostponementReasons = append(mockPostponementReasons, PostponementReason{
		ID:     nextReasonID,
		Label:  label,
		Labels: labels,
	})
	nextReasonID++

	http.Redirect(w, r, "/complex/postponements/reasons", http.StatusSeeOther)
}

// PostponementReasonLabelDeleteHandler - 연기사유의 개별 레이블 삭제 (POST)
func PostponementReasonLabelDeleteHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Invalid method", http.StatusMethodNotAllowed)
		return
	}

	reasonID, _ := strconv.Atoi(r.FormValue("id"))
	labelKey := r.FormValue("key")
	labelValue := r.FormValue("value")

	for i, reason := range mockPostponementReasons {
		if reason.ID == reasonID {
			for j, l := range reason.Labels {
				if l.Key == labelKey && l.Value == labelValue {
					mockPostponementReasons[i].Labels = append(reason.Labels[:j], reason.Labels[j+1:]...)
					break
				}
			}
			break
		}
	}

	http.Redirect(w, r, "/complex/postponements/reasons", http.StatusSeeOther)
}

// PostponementReasonDeleteHandler - 연기사유 삭제 (POST)
func PostponementReasonDeleteHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Invalid method", http.StatusMethodNotAllowed)
		return
	}

	id, _ := strconv.Atoi(r.FormValue("id"))
	for i, reason := range mockPostponementReasons {
		if reason.ID == id {
			mockPostponementReasons = append(mockPostponementReasons[:i], mockPostponementReasons[i+1:]...)
			break
		}
	}

	http.Redirect(w, r, "/complex/postponements/reasons", http.StatusSeeOther)
}
