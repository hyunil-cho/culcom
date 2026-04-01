package management

import (
	"backoffice/middleware"
	"net/http"
	"strconv"
)

// MOCK 환불 요청 데이터
var mockRefunds = []RefundRequest{
	{ID: 1, MemberName: "김지수", PhoneNumber: "01098765432", Grade: "VVIP", CurrentClass: "월수 오전 레벨1", PaymentAmount: "1,200,000", RefundAmount: "800,000", Reason: "개인 사정으로 더 이상 수업 참여가 어렵습니다.", BankName: "카카오뱅크", AccountNumber: "3333-01-1234567", AccountHolder: "김지수", Status: "진행중", RequestDate: "2026-03-20"},
	{ID: 2, MemberName: "박민준", PhoneNumber: "01055443322", Grade: "A+", CurrentClass: "화목 오후 프리토킹", PaymentAmount: "450,000", RefundAmount: "300,000", Reason: "해외 이주 예정으로 환불 요청드립니다.", BankName: "신한은행", AccountNumber: "110-123-456789", AccountHolder: "박민준", Status: "승인", RequestDate: "2026-03-18"},
	{ID: 3, MemberName: "이서연", PhoneNumber: "01011223344", Grade: "VVIP+", CurrentClass: "주말 집중반", PaymentAmount: "2,400,000", RefundAmount: "1,600,000", Reason: "건강 상의 이유로 수업 참여가 힘듭니다.", BankName: "국민은행", AccountNumber: "123456-78-901234", AccountHolder: "이서연", Status: "반려", RejectReason: "잔여 수업 횟수 확인 후 금액 조정이 필요합니다. 담당자에게 연락 바랍니다.", RequestDate: "2026-03-15"},
	{ID: 4, MemberName: "최동훈", PhoneNumber: "01077889900", Grade: "멤버쉽", CurrentClass: "월수 오전 레벨2", PaymentAmount: "150,000", RefundAmount: "100,000", Reason: "수업 시간이 변경되어 참석이 불가합니다.", BankName: "토스뱅크", AccountNumber: "1000-1234-5678", AccountHolder: "최동훈", Status: "진행중", RequestDate: "2026-03-22"},
}

// RefundListHandler - 환불 요청 목록 (백오피스용)
func RefundListHandler(w http.ResponseWriter, r *http.Request) {
	data := struct {
		middleware.BasePageData
		Title      string
		ActiveMenu string
		Requests   []RefundRequest
	}{
		BasePageData: middleware.GetBasePageData(r),
		Title:        "환불 요청 관리",
		ActiveMenu:   "complex_refunds",
		Requests:     mockRefunds,
	}

	if err := Templates.ExecuteTemplate(w, "dashboard/refund_list.html", data); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
	}
}

// RefundUpdateStatusHandler - 환불 요청 상태 변경 처리
func RefundUpdateStatusHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Invalid method", http.StatusMethodNotAllowed)
		return
	}

	idStr := r.FormValue("id")
	status := r.FormValue("status")
	rejectReason := r.FormValue("reject_reason")
	id, _ := strconv.Atoi(idStr)

	for i, req := range mockRefunds {
		if req.ID == id {
			mockRefunds[i].Status = status
			if status == "반려" {
				mockRefunds[i].RejectReason = rejectReason
			} else {
				mockRefunds[i].RejectReason = ""
			}
			break
		}
	}

	http.Redirect(w, r, "/complex/refunds", http.StatusSeeOther)
}
