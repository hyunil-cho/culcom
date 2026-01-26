package config

import (
	"net/http"

	"github.com/gorilla/sessions"
)

// SessionStore - 세션 스토어 (쿠키 기반)
var SessionStore *sessions.CookieStore

// InitSession - 세션 초기화
func InitSession() {
	// TODO: 실제 배포 시에는 환경변수나 설정 파일에서 시크릿 키를 가져와야 합니다
	// 예: os.Getenv("SESSION_SECRET")
	secret := []byte("your-secret-key-change-this-in-production")
	SessionStore = sessions.NewCookieStore(secret)

	// 세션 옵션 설정
	SessionStore.Options = &sessions.Options{
		Path:     "/",
		MaxAge:   3600, // 1시간
		HttpOnly: true,
		Secure:   false, // HTTPS 사용 시 true로 변경
		SameSite: http.SameSiteLaxMode,
	}
}
