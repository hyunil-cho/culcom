package utils

// MaskPassword 비밀번호 마스킹 헬퍼 함수 (로깅용)
func MaskPassword(password string) string {
	if len(password) <= 2 {
		return "***"
	}
	return password[:2] + "***"
}
