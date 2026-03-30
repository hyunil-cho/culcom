package opens

import (
	"backoffice/database"
	"encoding/json"
	"html/template"
	"log"
	"net/http"
	"strconv"
)

var PostponementTemplates *template.Template

// PostponementHandler - 연기 요청 폼 페이지
func PostponementHandler(w http.ResponseWriter, r *http.Request) {
	data := struct {
		Title string
	}{
		Title: "수업 연기 요청",
	}

	if err := PostponementTemplates.ExecuteTemplate(w, "opens/postponement.html", data); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
	}
}

// PostponementSearchMemberHandler - 이름+전화번호로 회원 검색 API (JSON)
func PostponementSearchMemberHandler(w http.ResponseWriter, r *http.Request) {
	name := r.URL.Query().Get("name")
	phone := r.URL.Query().Get("phone")

	if name == "" || phone == "" {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]interface{}{"members": []interface{}{}})
		return
	}

	members, err := database.SearchMemberByNameAndPhone(name, phone)
	if err != nil {
		log.Printf("PostponementSearchMemberHandler - error: %v", err)
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]interface{}{"members": []interface{}{}})
		return
	}

	// 각 회원의 활성 멤버십 + 배정된 수업 조회
	type MemberResult struct {
		Seq         int                                    `json:"seq"`
		BranchSeq   int                                    `json:"branch_seq"`
		BranchName  string                                 `json:"branch_name"`
		Name        string                                 `json:"name"`
		PhoneNumber string                                 `json:"phone_number"`
		Level       string                                 `json:"level"`
		JoinDate    string                                 `json:"join_date"`
		Memberships []database.ComplexMemberMembershipInfo `json:"memberships"`
		Classes     []map[string]interface{}               `json:"classes"`
	}

	var results []MemberResult
	for _, m := range members {
		memberships, _ := database.GetActiveMembershipsByMember(m.Seq)

		// 회원의 배정 수업 조회 (complex_member_class_mapping → complex_classes)
		classes, _ := database.GetClassesByMember(m.Seq)

		level := ""
		if m.Level != nil {
			level = *m.Level
		}
		joinDate := ""
		if m.JoinDate != nil {
			joinDate = *m.JoinDate
		}

		results = append(results, MemberResult{
			Seq:         m.Seq,
			BranchSeq:   m.BranchSeq,
			BranchName:  m.BranchName,
			Name:        m.Name,
			PhoneNumber: m.PhoneNumber,
			Level:       level,
			JoinDate:    joinDate,
			Memberships: memberships,
			Classes:     classes,
		})
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{"members": results})
}

// PostponementSubmitHandler - 연기 요청 제출 처리 (POST)
func PostponementSubmitHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Invalid method", http.StatusMethodNotAllowed)
		return
	}

	name := r.FormValue("name")
	phone := r.FormValue("phone")
	branchIDStr := r.FormValue("branch_id")
	memberSeqStr := r.FormValue("member_seq")
	memberMembershipSeqStr := r.FormValue("member_membership_seq")
	timeSlot := r.FormValue("time_slot")
	currentClass := r.FormValue("current_class")
	startDate := r.FormValue("start_date")
	endDate := r.FormValue("end_date")
	reason := r.FormValue("reason")
	if reason == "기타" {
		if custom := r.FormValue("reason_custom"); custom != "" {
			reason = custom
		}
	}

	branchID, err := strconv.Atoi(branchIDStr)
	if err != nil {
		http.Error(w, "잘못된 지점 정보입니다.", http.StatusBadRequest)
		return
	}

	var memberSeq *int
	if v, err := strconv.Atoi(memberSeqStr); err == nil && v > 0 {
		memberSeq = &v
	}

	var memberMembershipSeq *int
	if v, err := strconv.Atoi(memberMembershipSeqStr); err == nil && v > 0 {
		memberMembershipSeq = &v
	}

	_, err = database.InsertPostponementRequest(branchID, memberSeq, memberMembershipSeq, name, phone, timeSlot, currentClass, startDate, endDate, reason)
	if err != nil {
		log.Printf("PostponementSubmitHandler - InsertPostponementRequest error: %v", err)
		http.Error(w, "요청 처리 중 오류가 발생했습니다.", http.StatusInternalServerError)
		return
	}

	// 지점명 조회
	branchName := ""
	branch, err := database.GetBranchByID(branchID)
	if err == nil {
		if n, ok := branch["name"].(string); ok {
			branchName = n
		}
	}

	data := struct {
		Name         string
		Phone        string
		BranchName   string
		TimeSlot     string
		CurrentClass string
		StartDate    string
		EndDate      string
		Reason       string
	}{
		Name:         name,
		Phone:        phone,
		BranchName:   branchName,
		TimeSlot:     timeSlot,
		CurrentClass: currentClass,
		StartDate:    startDate,
		EndDate:      endDate,
		Reason:       reason,
	}

	if err := PostponementTemplates.ExecuteTemplate(w, "opens/postponement_success.html", data); err != nil {
		log.Printf("PostponementSubmitHandler - template error: %v", err)
		http.Error(w, err.Error(), http.StatusInternalServerError)
	}
}
