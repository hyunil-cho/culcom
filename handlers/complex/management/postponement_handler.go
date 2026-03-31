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

// ReasonLabelKV - 연기사유 레이블 key-value (템플릿용)
type ReasonLabelKV struct {
	Key   string `json:"Key"`
	Value string `json:"Value"`
}

// PostponementReasonView - 연기사유 항목 (템플릿용)
type PostponementReasonView struct {
	ID     int
	Label  string
	Labels []ReasonLabelKV
}

// PostponementReasonListHandler - 연기사유 관리 페이지 (GET)
func PostponementReasonListHandler(w http.ResponseWriter, r *http.Request) {
	base := middleware.GetBasePageData(r)
	branchSeq := base.SelectedBranchSeq

	dbReasons, labelsMap, err := database.GetPostponementReasonsByBranch(branchSeq)
	if err != nil {
		log.Printf("PostponementReasonListHandler error: %v", err)
	}

	var reasons []PostponementReasonView
	for _, r := range dbReasons {
		var kvs []ReasonLabelKV
		for _, l := range labelsMap[r.Seq] {
			kvs = append(kvs, ReasonLabelKV{Key: l.LabelKey, Value: l.LabelVal})
		}
		reasons = append(reasons, PostponementReasonView{
			ID:     r.Seq,
			Label:  r.Label,
			Labels: kvs,
		})
	}

	data := struct {
		middleware.BasePageData
		Title      string
		ActiveMenu string
		Reasons    []PostponementReasonView
	}{
		BasePageData: base,
		Title:        "연기사유 관리",
		ActiveMenu:   "complex_postponement_reasons",
		Reasons:      reasons,
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

	base := middleware.GetBasePageData(r)
	branchSeq := base.SelectedBranchSeq

	label := strings.TrimSpace(r.FormValue("label"))
	if label == "" {
		http.Redirect(w, r, "/complex/postponements/reasons", http.StatusSeeOther)
		return
	}

	var labelKVs []ReasonLabelKV
	rawLabels := strings.TrimSpace(r.FormValue("labels"))
	if rawLabels != "" {
		_ = json.Unmarshal([]byte(rawLabels), &labelKVs)
	}

	var dbLabels []database.EntityLabel
	for _, kv := range labelKVs {
		dbLabels = append(dbLabels, database.EntityLabel{
			LabelKey: kv.Key,
			LabelVal: kv.Value,
		})
	}

	if _, err := database.InsertPostponementReasonWithLabels(branchSeq, label, dbLabels); err != nil {
		log.Printf("PostponementReasonAddHandler error: %v", err)
		http.Error(w, "사유 추가 중 오류가 발생했습니다.", http.StatusInternalServerError)
		return
	}

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

	if _, err := database.DeleteEntityLabel(database.EntityTypePostponementReason, reasonID, labelKey, labelValue); err != nil {
		log.Printf("PostponementReasonLabelDeleteHandler error: %v", err)
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
	if _, err := database.DeletePostponementReason(id); err != nil {
		log.Printf("PostponementReasonDeleteHandler error: %v", err)
	}

	http.Redirect(w, r, "/complex/postponements/reasons", http.StatusSeeOther)
}
