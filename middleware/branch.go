package middleware

import (
	"backoffice/config"
	"backoffice/database"
	"log"
	"net/http"
)

// BranchSession - URL 파라미터로 전달된 지점 정보를 세션에 저장하는 미들웨어
func BranchSession(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		// URL 파라미터에서 branch 값 확인
		branchParam := r.URL.Query().Get("branch")

		if branchParam != "" {
			// 세션에 지점 정보 저장
			session, _ := config.SessionStore.Get(r, "app-session")
			session.Values["selectedBranch"] = branchParam
			session.Save(r, w)
		}

		// 다음 핸들러 호출
		next(w, r)
	}
}

// GetSelectedBranch - 세션에서 선택된 지점 코드를 가져오는 헬퍼 함수
func GetSelectedBranch(r *http.Request) string {
	session, _ := config.SessionStore.Get(r, "app-session")
	if branch, ok := session.Values["selectedBranch"].(string); ok && branch != "" {
		return branch
	}

	// 세션에 값이 없으면 DB에서 첫 번째 지점 조회
	firstBranch, err := database.GetFirstBranchAlias()
	if err != nil {
		log.Printf("Error getting first branch: %v", err)
		// 에러 발생 시 폴백 기본값
		return "gasan"
	}

	return firstBranch
}
