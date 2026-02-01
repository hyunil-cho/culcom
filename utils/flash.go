package utils

import (
	"backoffice/config"
	"net/http"
)

// GetFlashMessage - 플래시 세션에서 메시지를 읽어옵니다
// 한 번 읽으면 자동으로 삭제됩니다
func GetFlashMessage(w http.ResponseWriter, r *http.Request, flashType string) string {
	session, _ := config.SessionStore.Get(r, "flash-session")
	flashes := session.Flashes(flashType)
	session.Save(r, w) // 플래시는 한 번 읽으면 자동 삭제됨

	if len(flashes) > 0 {
		if msg, ok := flashes[0].(string); ok {
			return msg
		}
	}
	return ""
}

// SetFlashMessage - 플래시 세션에 메시지를 저장합니다
func SetFlashMessage(w http.ResponseWriter, r *http.Request, flashType string, message string) error {
	session, _ := config.SessionStore.Get(r, "flash-session")
	session.AddFlash(message, flashType)
	return session.Save(r, w)
}
