package utils

import "fmt"

// MaskPassword 비밀번호 마스킹 헬퍼 함수 (로깅용)
func MaskPassword(password string) string {
	if len(password) <= 2 {
		return "***"
	}
	return password[:2] + "***"
}

// PointerToString *interface{}를 string으로 변환하는 헬퍼 함수
func PointerToString(v interface{}) string {
	if v == nil {
		return ""
	}
	if ptr, ok := v.(*string); ok {
		if ptr == nil {
			return ""
		}
		return *ptr
	}
	// nil 포인터가 아닌 경우에만 fmt.Sprintf 사용
	str := fmt.Sprintf("%v", v)
	if str == "<nil>" {
		return ""
	}
	return str
}
