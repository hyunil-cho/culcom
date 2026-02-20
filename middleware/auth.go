package middleware

import (
	"backoffice/config"
	"log"
	"net/http"
)

// RequireAuth - 인증 필요 미들웨어
// 세션이 없으면 로그인 페이지로 리다이렉트
func RequireAuth(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		// 세션 확인
		session, err := config.SessionStore.Get(r, "user-session")
		if err != nil {
			log.Printf("세션 가져오기 실패: %v", err)
			http.Redirect(w, r, "/login?error=unauthorized", http.StatusSeeOther)
			return
		}

		// 인증 여부 확인
		authenticated, ok := session.Values["authenticated"].(bool)
		if !ok || !authenticated {
			// 인증되지 않은 경우 로그인 페이지로 리다이렉트
			log.Printf("인증되지 않은 접근 시도: %s %s", r.Method, r.URL.Path)
			http.Redirect(w, r, "/login?error=unauthorized", http.StatusSeeOther)
			return
		}

		// 인증된 경우 다음 핸들러 실행
		next(w, r)
	}
}

// RequireAuthRecover - 인증 + Panic Recovery 미들웨어
func RequireAuthRecover(next http.HandlerFunc) http.HandlerFunc {
	return RecoverFunc(RequireAuth(next))
}
