package config

import (
	"net/http"

	"github.com/gorilla/sessions"
)

// SessionStore - 세션 스토어 (쿠키 기반)
var SessionStore *sessions.CookieStore

// InitSession - 세션 초기화
func InitSession() {
	cfg := GetConfig()
	secret := []byte(cfg.Session.SecretKey)
	SessionStore = sessions.NewCookieStore(secret)

	// 세션 옵션 설정
	SessionStore.Options = &sessions.Options{
		Path:     "/",
		MaxAge:   cfg.Session.MaxAge,
		HttpOnly: true,
		Secure:   cfg.Session.Secure,
		SameSite: http.SameSiteLaxMode,
	}
}
