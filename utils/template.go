package utils

import (
	"strings"
	"time"
)

// ReplaceTemplateVariables 템플릿 변수를 실제 값으로 치환
func ReplaceTemplateVariables(template string, variables map[string]string) string {
	result := template
	for key, value := range variables {
		result = strings.ReplaceAll(result, "{{"+key+"}}", value)
	}
	return result
}

// FormatReservationDate 예약 날짜를 포맷팅
func FormatReservationDate(t time.Time) string {
	// 예: "2026년 2월 1일 14:30"
	return t.Format("2006년 1월 2일 15:04")
}

// FormatReservationDateShort 예약 날짜를 짧게 포맷팅
func FormatReservationDateShort(t time.Time) string {
	// 예: "2/1 14:30"
	return t.Format("1/2 15:04")
}
