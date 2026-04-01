package opens

import (
	"backoffice/database"
	"encoding/json"
	"html/template"
	"log"
	"net/http"
	"strconv"
)

var RefundTemplates *template.Template

// RefundHandler - 멤버십 환불 신청 페이지 (공개)
func RefundHandler(w http.ResponseWriter, r *http.Request) {
	if err := RefundTemplates.ExecuteTemplate(w, "refund.html", nil); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
	}
}

// RefundSearchMemberHandler - 이름+전화번호로 회원 검색 + 활성 멤버십 조회 (JSON)
func RefundSearchMemberHandler(w http.ResponseWriter, r *http.Request) {
	name := r.URL.Query().Get("name")
	phone := r.URL.Query().Get("phone")

	w.Header().Set("Content-Type", "application/json")

	if name == "" || phone == "" {
		json.NewEncoder(w).Encode(map[string]any{"members": []any{}})
		return
	}

	members, err := database.SearchMemberByNameAndPhone(name, phone)
	if err != nil {
		log.Printf("RefundSearchMemberHandler - search error: %v", err)
		json.NewEncoder(w).Encode(map[string]any{"members": []any{}})
		return
	}

	type MemberResult struct {
		Seq         int                                    `json:"seq"`
		BranchSeq   int                                    `json:"branch_seq"`
		BranchName  string                                 `json:"branch_name"`
		Name        string                                 `json:"name"`
		PhoneNumber string                                 `json:"phone_number"`
		Memberships []database.ComplexMemberMembershipInfo `json:"memberships"`
	}

	var results []MemberResult
	for _, m := range members {
		memberships, _ := database.GetActiveMembershipsByMember(m.Seq)
		results = append(results, MemberResult{
			Seq:         m.Seq,
			BranchSeq:   m.BranchSeq,
			BranchName:  m.BranchName,
			Name:        m.Name,
			PhoneNumber: m.PhoneNumber,
			Memberships: memberships,
		})
	}

	json.NewEncoder(w).Encode(map[string]any{"members": results})
}

// RefundSubmitHandler - 환불 요청 제출 (POST)
func RefundSubmitHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Invalid method", http.StatusMethodNotAllowed)
		return
	}

	branchSeq, _ := strconv.Atoi(r.FormValue("branch_seq"))
	memberSeq, _ := strconv.Atoi(r.FormValue("member_seq"))
	memberMembershipSeq, _ := strconv.Atoi(r.FormValue("member_membership_seq"))
	memberName := r.FormValue("member_name")
	phoneNumber := r.FormValue("phone_number")
	membershipName := r.FormValue("membership_name")
	price := r.FormValue("price")
	reason := r.FormValue("reason")
	bankName := r.FormValue("bank_name")
	accountNumber := r.FormValue("account_number")
	accountHolder := r.FormValue("account_holder")

	if memberName == "" || reason == "" || bankName == "" || accountNumber == "" || accountHolder == "" {
		http.Error(w, "필수 항목을 모두 입력해주세요.", http.StatusBadRequest)
		return
	}

	_, err := database.InsertRefundRequest(
		branchSeq, memberSeq, memberMembershipSeq,
		memberName, phoneNumber, membershipName, price,
		reason, bankName, accountNumber, accountHolder,
	)
	if err != nil {
		log.Printf("RefundSubmitHandler - InsertRefundRequest error: %v", err)
		http.Error(w, "요청 처리 중 오류가 발생했습니다.", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]any{"success": true})
}
