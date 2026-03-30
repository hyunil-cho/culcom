package management

import (
	"backoffice/database"
	"backoffice/middleware"
	"encoding/json"
	"log"
	"net/http"
	"strconv"
	"strings"
)

// PostponementListHandler - 연기 요청 목록 (백오피스용)
func PostponementListHandler(w http.ResponseWriter, r *http.Request) {
	base := middleware.GetBasePageData(r)
	branchSeq := base.SelectedBranchSeq

	dbRequests, err := database.GetPostponementRequestsByBranch(branchSeq)
	if err != nil {
		log.Printf("PostponementListHandler - GetPostponementRequestsByBranch error: %v", err)
	}

	// DB 구조체를 템플릿용 구조체로 변환
	var requests []PostponementRequest
	for _, r := range dbRequests {
		rejectReason := ""
		if r.RejectReason != nil {
			rejectReason = *r.RejectReason
		}
		requests = append(requests, PostponementRequest{
			ID:           r.Seq,
			MemberName:   r.MemberName,
			PhoneNumber:  r.PhoneNumber,
			TimeSlot:     r.TimeSlot,
			CurrentClass: r.CurrentClass,
			StartDate:    r.StartDate,
			EndDate:      r.EndDate,
			Reason:       r.Reason,
			Status:       r.Status,
			RejectReason: rejectReason,
			RequestDate:  r.CreatedDate,
		})
	}

	data := struct {
		middleware.BasePageData
		Title      string
		ActiveMenu string
		Requests   []PostponementRequest
	}{
		BasePageData: base,
		Title:        "수업 연기 요청 관리",
		ActiveMenu:   "complex_postponements",
		Requests:     requests,
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

	var rejectReasonPtr *string
	if status == "반려" && rejectReason != "" {
		rejectReasonPtr = &rejectReason
	}

	// 변경자 정보 (향후 세션에서 가져올 수 있음)
	changedBy := "관리자"

	if err := database.UpdatePostponementStatus(id, status, rejectReasonPtr, changedBy); err != nil {
		log.Printf("PostponementUpdateStatusHandler - UpdatePostponementStatus error: %v", err)
		http.Error(w, "상태 변경 중 오류가 발생했습니다.", http.StatusInternalServerError)
		return
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

// MOCK 연기사유 목록 (사유 관리는 아직 DB 테이블 없음)
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
