package utils

// IsValidPhoneNumber - 전화번호 형식 검증 (010으로 시작하는 11자리 숫자)
func IsValidPhoneNumber(phone string) bool {
	if len(phone) != 11 {
		return false
	}
	if phone[0:3] != "010" {
		return false
	}
	for _, c := range phone {
		if c < '0' || c > '9' {
			return false
		}
	}
	return true
}
