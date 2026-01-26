package database

import "log"

// AuthenticateUser - 사용자 인증 (더미 구현)
// root/root는 성공, 그 외에는 실패
func AuthenticateUser(username, password string) bool {
	log.Printf("Authentication attempt - Username: %s", username)
	
	// 더미 인증: root/root만 성공
	if username == "root" && password == "root" {
		log.Printf("Authentication successful for user: %s", username)
		return true
	}
	
	log.Printf("Authentication failed for user: %s", username)
	return false
}
