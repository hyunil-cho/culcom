package management

import (
	"backoffice/database"
	"backoffice/middleware"
	"fmt"
	"log"
	"net/http"
	"strconv"
)

// toStaffFromDB - DB 구조체를 템플릿용 Staff 구조체로 변환
func toStaffFromDB(s *database.ComplexStaff) Staff {
	return Staff{
		ID:                   s.Seq,
		BranchSeq:            fmt.Sprintf("%d", s.BranchSeq),
		BranchName:           s.BranchName,
		Name:                 s.Name,
		PhoneNumber:          ptrToStr(s.PhoneNumber),
		Email:                ptrToStr(s.Email),
		Subject:              ptrToStr(s.Subject),
		Status:               s.Status,
		JoinDate:             ptrToStr(s.JoinDate),
		Comment:              ptrToStr(s.Comment),
		AssignedClassIDs:     s.AssignedClassIDs,
		Interviewer:          ptrToStr(s.Interviewer),
		PaymentMethod:        ptrToStr(s.PaymentMethod),
		DepositAmount:        ptrToStr(s.DepositAmount),
		RefundableDeposit:    ptrToStr(s.RefundableDeposit),
		NonRefundableDeposit: ptrToStr(s.NonRefundableDeposit),
		RefundBank:           ptrToStr(s.RefundBank),
		RefundAccount:        ptrToStr(s.RefundAccount),
		RefundAmount:         ptrToStr(s.RefundAmount),
	}
}

func ptrToStr(s *string) string {
	if s == nil {
		return ""
	}
	return *s
}

func strToPtr(s string) *string {
	if s == "" {
		return nil
	}
	return &s
}

// StaffListHandler - 스태프 목록
func StaffListHandler(w http.ResponseWriter, r *http.Request) {
	base := middleware.GetBasePageData(r)
	branchSeq := base.SelectedBranchSeq

	dbStaffs, err := database.GetStaffListByBranch(branchSeq)
	if err != nil {
		log.Printf("StaffListHandler - GetStaffsByBranch error: %v", err)
		dbStaffs = nil
	}

	var staffs []Staff
	for i := range dbStaffs {
		staffs = append(staffs, toStaffFromDB(&dbStaffs[i]))
	}

	data := struct {
		middleware.BasePageData
		Title      string
		ActiveMenu string
		Staffs     []Staff
		TotalCount int
	}{
		BasePageData: base,
		Title:        "스태프 관리",
		ActiveMenu:   "complex_staffs",
		Staffs:       staffs,
		TotalCount:   len(staffs),
	}

	if err := Templates.ExecuteTemplate(w, "dashboard/staff_list.html", data); err != nil {
		log.Println("Template error:", err)
		http.Error(w, err.Error(), http.StatusInternalServerError)
	}
}

// StaffAddHandler - 새 스태프 등록 화면
func StaffAddHandler(w http.ResponseWriter, r *http.Request) {
	base := middleware.GetBasePageData(r)
	branchSeq := base.SelectedBranchSeq

	timeSlots, _ := database.GetClassTimeSlotsByBranch(branchSeq)
	classes, _ := database.GetComplexClassesByBranch(branchSeq)

	data := struct {
		middleware.BasePageData
		Title      string
		ActiveMenu string
		IsEdit     bool
		Staff      Staff
		TimeSlots  []map[string]interface{}
		Classes    []map[string]interface{}
	}{
		BasePageData: base,
		Title:        "새 스태프 등록",
		ActiveMenu:   "complex_staffs",
		IsEdit:       false,
		TimeSlots:    timeSlots,
		Classes:      classes,
	}

	if err := Templates.ExecuteTemplate(w, "dashboard/staff_form.html", data); err != nil {
		log.Println("Template error:", err)
		http.Error(w, err.Error(), http.StatusInternalServerError)
	}
}

// StaffEditHandler - 스태프 정보 수정 화면
func StaffEditHandler(w http.ResponseWriter, r *http.Request) {
	idStr := r.URL.Query().Get("id")
	id, err := strconv.Atoi(idStr)
	if err != nil {
		http.Redirect(w, r, "/complex/staffs", http.StatusSeeOther)
		return
	}

	base := middleware.GetBasePageData(r)
	branchSeq := base.SelectedBranchSeq

	dbStaff, err := database.GetStaffByID(id)
	if err != nil {
		log.Printf("StaffEditHandler - GetStaffByID error: %v", err)
		http.Redirect(w, r, "/complex/staffs", http.StatusSeeOther)
		return
	}

	staff := toStaffFromDB(dbStaff)

	timeSlots, _ := database.GetClassTimeSlotsByBranch(branchSeq)
	classes, _ := database.GetComplexClassesByBranch(branchSeq)

	data := struct {
		middleware.BasePageData
		Title      string
		ActiveMenu string
		IsEdit     bool
		Staff      Staff
		TimeSlots  []map[string]interface{}
		Classes    []map[string]interface{}
	}{
		BasePageData: base,
		Title:        "스태프 정보 수정",
		ActiveMenu:   "complex_staffs",
		IsEdit:       true,
		Staff:        staff,
		TimeSlots:    timeSlots,
		Classes:      classes,
	}

	if err := Templates.ExecuteTemplate(w, "dashboard/staff_form.html", data); err != nil {
		log.Println("Template error:", err)
		http.Error(w, err.Error(), http.StatusInternalServerError)
	}
}

// StaffUpdateHandler - 스태프 정보 저장/업데이트
func StaffUpdateHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Invalid method", http.StatusMethodNotAllowed)
		return
	}

	idStr := r.FormValue("id")
	name := r.FormValue("name")
	phone := r.FormValue("phone_number")
	email := r.FormValue("email")
	subject := r.FormValue("subject")
	status := r.FormValue("status")
	joinDate := r.FormValue("join_date")
	comment := r.FormValue("comment")
	branchSeqStr := r.FormValue("branch_seq")
	interviewer := r.FormValue("interviewer")
	paymentMethod := r.FormValue("payment_method")
	if paymentMethod == "기타" {
		if custom := r.FormValue("payment_method_custom"); custom != "" {
			paymentMethod = custom
		}
	}
	depositAmount := r.FormValue("deposit_amount")
	refundableDeposit := r.FormValue("refundable_deposit")
	nonRefundableDeposit := r.FormValue("non_refundable_deposit")
	refundBank := r.FormValue("refund_bank")
	refundAccount := r.FormValue("refund_account")
	refundAmount := r.FormValue("refund_amount")
	assignedClasses := r.FormValue("assigned_classes")

	branchSeq, err := strconv.Atoi(branchSeqStr)
	if err != nil {
		log.Printf("StaffUpdateHandler - invalid branch_seq: %s", branchSeqStr)
		http.Error(w, "잘못된 지점 정보입니다.", http.StatusBadRequest)
		return
	}

	classIDs := database.ParseClassIDs(assignedClasses)

	if idStr == "" {
		// 신규 등록
		_, err := database.InsertStaff(
			branchSeq,
			name, strToPtr(phone), strToPtr(email), strToPtr(subject),
			status, strToPtr(joinDate), strToPtr(comment), strToPtr(interviewer), strToPtr(paymentMethod),
			strToPtr(depositAmount), strToPtr(refundableDeposit), strToPtr(nonRefundableDeposit),
			strToPtr(refundBank), strToPtr(refundAccount), strToPtr(refundAmount),
			classIDs,
		)
		if err != nil {
			log.Printf("StaffUpdateHandler - InsertStaff error: %v", err)
			http.Error(w, "스태프 등록 중 오류가 발생했습니다.", http.StatusInternalServerError)
			return
		}
	} else {
		// 수정
		id, err := strconv.Atoi(idStr)
		if err != nil {
			http.Error(w, "잘못된 스태프 ID입니다.", http.StatusBadRequest)
			return
		}

		err = database.UpdateStaff(
			id, branchSeq,
			name, strToPtr(phone), strToPtr(email), strToPtr(subject),
			status, strToPtr(joinDate), strToPtr(comment), strToPtr(interviewer), strToPtr(paymentMethod),
			strToPtr(depositAmount), strToPtr(refundableDeposit), strToPtr(nonRefundableDeposit),
			strToPtr(refundBank), strToPtr(refundAccount), strToPtr(refundAmount),
			classIDs,
		)
		if err != nil {
			log.Printf("StaffUpdateHandler - UpdateStaff error: %v", err)
			http.Error(w, "스태프 수정 중 오류가 발생했습니다.", http.StatusInternalServerError)
			return
		}
	}

	http.Redirect(w, r, "/complex/staffs", http.StatusSeeOther)
}

// StaffDeleteHandler - 스태프 삭제
func StaffDeleteHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Invalid method", http.StatusMethodNotAllowed)
		return
	}

	idStr := r.FormValue("id")
	id, err := strconv.Atoi(idStr)
	if err != nil {
		http.Error(w, "잘못된 스태프 ID입니다.", http.StatusBadRequest)
		return
	}

	if err := database.DeleteStaff(id); err != nil {
		log.Printf("StaffDeleteHandler - DeleteStaff error: %v", err)
		http.Error(w, "스태프 삭제 중 오류가 발생했습니다.", http.StatusInternalServerError)
		return
	}

	http.Redirect(w, r, "/complex/staffs", http.StatusSeeOther)
}
