package login

import (
	"backoffice/config"
	"backoffice/database"
	"html/template"
	"log"
	"net/http"
)

//TODO :: 로그인 세션이 존재하는 사용자가 로그인 페이지로 가면, 대시보드로 리다이렉트 시키기

var Templates *template.Template

// Handler - 로그인 페이지 핸들러 (GET)
func Handler(w http.ResponseWriter, r *http.Request) {
	data := PageData{
		Title: "로그인",
		Error: "",
	}

	// 에러 파라미터 확인
	errorParam := r.URL.Query().Get("error")
	if errorParam == "login_failed" {
		data.Error = "아이디 또는 비밀번호가 일치하지 않습니다."
	} else if errorParam == "invalid_request" {
		data.Error = "잘못된 요청입니다."
	} else if errorParam == "unauthorized" {
		data.Error = "로그인이 필요합니다. 로그인 후 이용해주세요."
	}

	if err := Templates.ExecuteTemplate(w, "auth/login.html", data); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		log.Println("Template error:", err)
	}
}

// LoginHandler - 로그인 처리 핸들러 (POST)
func LoginHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Redirect(w, r, "/", http.StatusSeeOther)
		return
	}

	// 폼 데이터 파싱
	if err := r.ParseForm(); err != nil {
		http.Redirect(w, r, "/?error=invalid_request", http.StatusSeeOther)
		return
	}

	username := r.FormValue("username")
	password := r.FormValue("password")

	// DB 인증
	authenticated, userSeq := database.AuthenticateUser(username, password)

	if authenticated {
		// 세션에 사용자 ID와 Seq 저장
		session, err := config.SessionStore.Get(r, "user-session")
		if err != nil {
			log.Printf("세션 가져오기 실패: %v", err)
			http.Redirect(w, r, "/?error=invalid_request", http.StatusSeeOther)
			return
		}

		session.Values["user_id"] = username
		session.Values["user_seq"] = userSeq
		session.Values["authenticated"] = true

		if err := session.Save(r, w); err != nil {
			log.Printf("세션 저장 실패: %v", err)
			http.Redirect(w, r, "/?error=invalid_request", http.StatusSeeOther)
			return
		}

		// 지점 정보 세션에 저장 - 로그인 시 한 번만 DB 조회
		appSession, _ := config.SessionStore.Get(r, "app-session")
		branchList, err := database.GetBranchesForSelect()
		if err == nil && len(branchList) > 0 {
			// 전체 지점 목록 저장
			appSession.Values["branchList"] = branchList
			// 첫 번째 지점을 기본값으로 설정
			appSession.Values["selectedBranch"] = branchList[0]["alias"]
			appSession.Save(r, w)
			log.Printf("로그인 시 지점 목록 저장: %d개, 기본 지점: %s", len(branchList), branchList[0]["alias"])
		} else {
			log.Printf("지점 목록 조회 실패: %v", err)
		}

		// 성공: 대시보드로 리다이렉트
		http.Redirect(w, r, "/dashboard", http.StatusSeeOther)
	} else {
		// 실패: 로그인 페이지로 리다이렉트하고 에러 메시지 표시
		http.Redirect(w, r, "/?error=login_failed", http.StatusSeeOther)
	}
}

// LogoutHandler - 로그아웃 처리 핸들러
func LogoutHandler(w http.ResponseWriter, r *http.Request) {
	// 세션 가져오기
	session, err := config.SessionStore.Get(r, "user-session")
	if err != nil {
		log.Printf("세션 가져오기 실패: %v", err)
		http.Redirect(w, r, "/", http.StatusSeeOther)
		return
	}

	// 세션 무효화 (MaxAge를 -1로 설정하면 즉시 삭제됨)
	session.Options.MaxAge = -1

	// 세션 저장 (실제로는 삭제)
	if err := session.Save(r, w); err != nil {
		log.Printf("세션 삭제 실패: %v", err)
	}

	// 로그인 페이지로 리다이렉트
	http.Redirect(w, r, "/", http.StatusSeeOther)
}
