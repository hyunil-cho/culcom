package board

import (
	"backoffice/config"
	"backoffice/database"
	"encoding/json"
	"log"
	"net/http"
)

// MypageData - 마이페이지 템플릿 데이터
type MypageData struct {
	Title      string
	MemberName string
	MemberSeq  int
	MemberInfo *database.KakaoCustomer
	IsLoggedIn bool
}

// MypageHandler - 마이페이지 핸들러
func MypageHandler(w http.ResponseWriter, r *http.Request) {
	isLoggedIn, memberSeq, memberName := GetBoardSession(r)
	if !isLoggedIn {
		http.Redirect(w, r, "/", http.StatusSeeOther)
		return
	}

	// DB에서 고객 정보 조회
	customer, err := database.GetCustomerBySeqForMypage(memberSeq)
	if err != nil {
		log.Printf("고객 정보 조회 실패: %v", err)
		// 세션이 있지만 DB에 없으면 세션 삭제 후 리다이렉트
		session, _ := config.SessionStore.Get(r, "board-session")
		session.Options.MaxAge = -1
		session.Save(r, w)
		http.Redirect(w, r, "/", http.StatusSeeOther)
		return
	}

	data := MypageData{
		Title:      "마이페이지",
		MemberName: memberName,
		MemberSeq:  memberSeq,
		MemberInfo: customer,
		IsLoggedIn: true,
	}

	if err := PublicTemplates.ExecuteTemplate(w, "board/mypage.html", data); err != nil {
		log.Printf("마이페이지 템플릿 렌더링 오류: %v", err)
		http.Error(w, "페이지를 불러올 수 없습니다", http.StatusInternalServerError)
	}
}

// WithdrawHandler - 회원탈퇴 처리 API
func WithdrawHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	isLoggedIn, memberSeq, memberName := GetBoardSession(r)
	if !isLoggedIn {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusUnauthorized)
		json.NewEncoder(w).Encode(map[string]string{"error": "로그인이 필요합니다"})
		return
	}

	// DB에서 고객 삭제
	if err := database.DeleteCustomerBySeq(memberSeq); err != nil {
		log.Printf("회원탈퇴 실패 - seq: %d, error: %v", memberSeq, err)
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": "회원탈퇴 처리 중 오류가 발생했습니다"})
		return
	}

	log.Printf("회원탈퇴 완료 - seq: %d, 이름: %s", memberSeq, memberName)

	// 세션 삭제
	session, _ := config.SessionStore.Get(r, "board-session")
	session.Options.MaxAge = -1
	session.Save(r, w)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"success": "회원탈퇴가 완료되었습니다"})
}
