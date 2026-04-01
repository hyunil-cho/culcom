package management

import (
	"backoffice/database"
	"backoffice/middleware"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"strconv"
	"time"
)

// toMemberFromDB - DB 구조체를 템플릿용 Member 구조체로 변환
func toMemberFromDB(m *database.ComplexMember) Member {
	pts := func(s *string) string {
		if s == nil {
			return ""
		}
		return *s
	}
	return Member{
		ID:            m.Seq,
		BranchSeq:     fmt.Sprintf("%d", m.BranchSeq),
		Name:          m.Name,
		PhoneNumber:   m.PhoneNumber,
		Level:         pts(m.Level),
		Language:      pts(m.Language),
		Info:          pts(m.Info),
		ChartNumber:   pts(m.ChartNumber),
		Comment:       pts(m.Comment),
		JoinDate:      pts(m.JoinDate),
		SignupChannel: pts(m.SignupChannel),
		Interviewer:   pts(m.Interviewer),
		CreatedAt:     m.CreatedDate,
		UpdatedAt:     pts(m.LastUpdateDate),
	}
}

func strPtrIfNotEmpty(s string) *string {
	if s == "" {
		return nil
	}
	return &s
}

// FindMemberByPhone - 전화번호로 회원 검색 (공개 API용)
func FindMemberByPhone(phone string) *Member {
	dbMember, err := database.FindComplexMemberByPhone(phone)
	if err != nil {
		return nil
	}
	m := toMemberFromDB(dbMember)
	return &m
}

// MemberListHandler - 회원 관리 목록
func MemberListHandler(w http.ResponseWriter, r *http.Request) {
	base := middleware.GetBasePageData(r)
	branchSeq := base.SelectedBranchSeq

	dbMembers, err := database.GetComplexMembersByBranch(branchSeq)
	if err != nil {
		log.Printf("MemberListHandler - GetComplexMembersByBranch error: %v", err)
	}

	var members []Member
	for i := range dbMembers {
		members = append(members, toMemberFromDB(&dbMembers[i]))
	}

	data := struct {
		middleware.BasePageData
		Title      string
		ActiveMenu string
		Members    []Member
	}{
		BasePageData: base,
		Title:        "전체 회원 관리",
		ActiveMenu:   "complex_members",
		Members:      members,
	}

	if err := Templates.ExecuteTemplate(w, "dashboard/member_list.html", data); err != nil {
		log.Println("Template error:", err)
		http.Error(w, err.Error(), http.StatusInternalServerError)
	}
}

// MemberAddHandler - 새 회원 등록 화면
func MemberAddHandler(w http.ResponseWriter, r *http.Request) {
	base := middleware.GetBasePageData(r)
	branchSeq := base.SelectedBranchSeq

	memberships, err := database.GetAllMemberships()
	if err != nil {
		log.Printf("MemberAddHandler - GetAllMemberships error: %v", err)
	}
	timeSlots, err := database.GetClassTimeSlotsByBranch(branchSeq)
	if err != nil {
		log.Printf("MemberAddHandler - GetClassTimeSlotsByBranch error: %v", err)
	}
	classes, err := database.GetComplexClassesByBranch(branchSeq)
	if err != nil {
		log.Printf("MemberAddHandler - GetComplexClassesByBranch error: %v", err)
	}

	data := struct {
		middleware.BasePageData
		Title       string
		ActiveMenu  string
		IsEdit      bool
		Member      Member
		Memberships []database.Membership
		TimeSlots   []map[string]interface{}
		Classes     []map[string]interface{}
	}{
		BasePageData: base,
		Title:        "새 회원 등록",
		ActiveMenu:   "complex_members",
		IsEdit:       false,
		Memberships:  memberships,
		TimeSlots:    timeSlots,
		Classes:      classes,
	}

	if err := Templates.ExecuteTemplate(w, "dashboard/member_form.html", data); err != nil {
		log.Println("Template error:", err)
		http.Error(w, err.Error(), http.StatusInternalServerError)
	}
}

// MemberEditHandler - 회원 정보 수정 화면
func MemberEditHandler(w http.ResponseWriter, r *http.Request) {
	idStr := r.URL.Query().Get("id")
	id, err := strconv.Atoi(idStr)
	if err != nil {
		http.Redirect(w, r, "/complex/members", http.StatusSeeOther)
		return
	}

	dbMember, err := database.GetComplexMemberByID(id)
	if err != nil {
		log.Printf("MemberEditHandler - GetComplexMemberByID error: %v", err)
		http.Redirect(w, r, "/complex/members", http.StatusSeeOther)
		return
	}

	member := toMemberFromDB(dbMember)

	base := middleware.GetBasePageData(r)
	branchSeq := base.SelectedBranchSeq

	memberships, err := database.GetAllMemberships()
	if err != nil {
		log.Printf("MemberEditHandler - GetAllMemberships error: %v", err)
	}
	timeSlots, err := database.GetClassTimeSlotsByBranch(branchSeq)
	if err != nil {
		log.Printf("MemberEditHandler - GetClassTimeSlotsByBranch error: %v", err)
	}
	classes, err := database.GetComplexClassesByBranch(branchSeq)
	if err != nil {
		log.Printf("MemberEditHandler - GetComplexClassesByBranch error: %v", err)
	}

	data := struct {
		middleware.BasePageData
		Title       string
		ActiveMenu  string
		IsEdit      bool
		Member      Member
		Memberships []database.Membership
		TimeSlots   []map[string]interface{}
		Classes     []map[string]interface{}
	}{
		BasePageData: base,
		Title:        "회원 정보 수정",
		ActiveMenu:   "complex_members",
		IsEdit:       true,
		Member:       member,
		Memberships:  memberships,
		TimeSlots:    timeSlots,
		Classes:      classes,
	}

	if err := Templates.ExecuteTemplate(w, "dashboard/member_form.html", data); err != nil {
		log.Println("Template error:", err)
		http.Error(w, err.Error(), http.StatusInternalServerError)
	}
}

// MemberUpdateHandler - 회원 정보 저장/업데이트
func MemberUpdateHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Invalid method", http.StatusMethodNotAllowed)
		return
	}

	idStr := r.FormValue("id")
	name := r.FormValue("name")
	phone := r.FormValue("phone_number")
	branchSeqStr := r.FormValue("branch_seq")
	level := r.FormValue("level")
	language := r.FormValue("language")
	info := r.FormValue("info")
	chartNumber := r.FormValue("chart_number")
	comment := r.FormValue("comment")
	joinDate := r.FormValue("join_date")
	signupChannel := r.FormValue("signup_channel")
	if signupChannel == "기타" {
		if custom := r.FormValue("signup_channel_custom"); custom != "" {
			signupChannel = custom
		}
	}
	interviewer := r.FormValue("interviewer")

	// 멤버십 관련 필드
	membershipSeqStr := r.FormValue("membership_seq")
	expiryDate := r.FormValue("expiry_date")
	price := r.FormValue("price")
	paymentDate := r.FormValue("payment_date")
	paymentMethod := r.FormValue("payment_method")
	if paymentMethod == "기타" {
		if custom := r.FormValue("payment_method_custom"); custom != "" {
			paymentMethod = custom
		}
	}
	depositAmount := r.FormValue("deposit_amount")

	// 수업 배정
	classIDStr := r.FormValue("class_id")

	branchSeq, err := strconv.Atoi(branchSeqStr)
	if err != nil {
		http.Error(w, "잘못된 지점 정보입니다.", http.StatusBadRequest)
		return
	}

	var memberID int64

	if idStr == "" {
		// 신규 등록
		memberID, err = database.InsertComplexMember(
			branchSeq, name, phone,
			strPtrIfNotEmpty(level), strPtrIfNotEmpty(language), strPtrIfNotEmpty(info),
			strPtrIfNotEmpty(chartNumber), strPtrIfNotEmpty(comment), strPtrIfNotEmpty(joinDate),
			strPtrIfNotEmpty(signupChannel), strPtrIfNotEmpty(interviewer),
		)
		if err != nil {
			log.Printf("MemberUpdateHandler - InsertComplexMember error: %v", err)
			http.Error(w, "회원 등록 중 오류가 발생했습니다.", http.StatusInternalServerError)
			return
		}
	} else {
		// 수정
		id, err := strconv.Atoi(idStr)
		if err != nil {
			http.Error(w, "잘못된 회원 ID입니다.", http.StatusBadRequest)
			return
		}
		memberID = int64(id)

		err = database.UpdateComplexMember(
			id, branchSeq, name, phone,
			strPtrIfNotEmpty(level), strPtrIfNotEmpty(language), strPtrIfNotEmpty(info),
			strPtrIfNotEmpty(chartNumber), strPtrIfNotEmpty(comment), strPtrIfNotEmpty(joinDate),
			strPtrIfNotEmpty(signupChannel), strPtrIfNotEmpty(interviewer),
		)
		if err != nil {
			log.Printf("MemberUpdateHandler - UpdateComplexMember error: %v", err)
			http.Error(w, "회원 수정 중 오류가 발생했습니다.", http.StatusInternalServerError)
			return
		}
	}

	// 멤버십 연결 (선택된 경우)
	if membershipSeqStr != "" {
		msSeq, err := strconv.Atoi(membershipSeqStr)
		if err == nil && msSeq > 0 {
			ms, err := database.GetMembershipByID(msSeq)
			if err == nil {
				startDate := joinDate
				if startDate == "" {
					startDate = time.Now().Format("2006-01-02")
				}
				if expiryDate == "" {
					start, _ := time.Parse("2006-01-02", startDate)
					expiryDate = start.AddDate(0, 0, ms.Duration).Format("2006-01-02")
				}

				_, err = database.InsertMemberMembership(
					int(memberID), msSeq, startDate, expiryDate, ms.Count,
					strPtrIfNotEmpty(price), strPtrIfNotEmpty(depositAmount),
					strPtrIfNotEmpty(paymentMethod), strPtrIfNotEmpty(paymentDate),
				)
				if err != nil {
					log.Printf("MemberUpdateHandler - InsertMemberMembership error: %v", err)
				}
			}
		}
	}

	// 수업 배정 (선택된 경우)
	if classIDStr != "" {
		classID, err := strconv.Atoi(classIDStr)
		if err == nil && classID > 0 {
			if err := database.AssignMemberToClass(int(memberID), classID); err != nil {
				log.Printf("MemberUpdateHandler - AssignMemberToClass error: %v", err)
			}
		}
	}

	http.Redirect(w, r, "/complex/members", http.StatusSeeOther)
}

// MemberDeleteHandler - 회원 삭제
func MemberDeleteHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Invalid method", http.StatusMethodNotAllowed)
		return
	}

	idStr := r.FormValue("id")
	id, err := strconv.Atoi(idStr)
	if err != nil {
		http.Error(w, "잘못된 회원 ID입니다.", http.StatusBadRequest)
		return
	}

	if err := database.DeleteComplexMember(id); err != nil {
		log.Printf("MemberDeleteHandler - DeleteComplexMember error: %v", err)
		http.Error(w, "회원 삭제 중 오류가 발생했습니다.", http.StatusInternalServerError)
		return
	}

	http.Redirect(w, r, "/complex/members", http.StatusSeeOther)
}

// MemberMembershipsAPIHandler - 회원의 멤버십 목록 조회 API (JSON)
func MemberMembershipsAPIHandler(w http.ResponseWriter, r *http.Request) {
	memberSeqStr := r.URL.Query().Get("member_seq")
	memberSeq, err := strconv.Atoi(memberSeqStr)
	if err != nil || memberSeq <= 0 {
		w.Header().Set("Content-Type", "application/json")
		w.Write([]byte(`{"memberships":[]}`))
		return
	}

	memberships, err := database.GetActiveMembershipsByMember(memberSeq)
	if err != nil {
		log.Printf("MemberMembershipsAPIHandler error: %v", err)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]any{"memberships": memberships})
}
