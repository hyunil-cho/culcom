package opens

import (
	"backoffice/handlers/complex/management"
	"encoding/json"
	"fmt"
	"html/template"
	"math/rand"
	"net/http"
	"time"
)

var MembershipCheckTemplates *template.Template

// MembershipCheckHandler - 멤버쉽 확인 페이지 (전화번호 입력)
func MembershipCheckHandler(w http.ResponseWriter, r *http.Request) {
	if err := MembershipCheckTemplates.ExecuteTemplate(w, "membership_check.html", nil); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
	}
}

// AttendanceRecord - 출석 기록 항목
type AttendanceRecord struct {
	Date      string `json:"date"`
	ClassName string `json:"className"`
	Status    string `json:"status"`
}

// generateMockAttendance - 회원 데이터 기반 mock 출석 기록 생성
func generateMockAttendance(member *management.Member) []AttendanceRecord {
	records := []AttendanceRecord{}
	if member == nil {
		return records
	}

	classes := []string{"레벨1-1반", "레벨1-2반", "프리토킹 A반"}
	rng := rand.New(rand.NewSource(int64(member.ID * 12345)))

	today := time.Now()
	for i := 0; i < 60; i++ {
		d := today.AddDate(0, 0, -i)
		if d.Weekday() == time.Saturday || d.Weekday() == time.Sunday {
			continue
		}

		status := "O"
		if rng.Intn(8) == 0 {
			status = "X"
		}

		// AttendanceHistory 데이터가 있으면 최근 기록에 반영
		histIdx := len(records)
		if histIdx < len(member.AttendanceHistory) && member.AttendanceHistory[histIdx] != "" {
			status = member.AttendanceHistory[histIdx]
		}

		records = append(records, AttendanceRecord{
			Date:      d.Format("2006-01-02"),
			ClassName: classes[rng.Intn(len(classes))],
			Status:    status,
		})
	}

	return records
}

// MembershipResultHandler - 멤버쉽 조회 결과 페이지
func MembershipResultHandler(w http.ResponseWriter, r *http.Request) {
	phone := r.URL.Query().Get("phone")
	if phone == "" {
		http.Redirect(w, r, "/complex/membership", http.StatusSeeOther)
		return
	}

	member := management.FindMemberByPhone(phone)

	// 출석 데이터 JSON 생성
	attendanceJSON := "[]"
	presentCount := 0
	absentCount := 0
	if member != nil {
		records := generateMockAttendance(member)
		for _, rec := range records {
			if rec.Status == "O" {
				presentCount++
			} else {
				absentCount++
			}
		}
		jsonBytes, err := json.Marshal(records)
		if err == nil {
			attendanceJSON = string(jsonBytes)
		}
	}

	attendanceRate := 0
	total := presentCount + absentCount
	if total > 0 {
		attendanceRate = presentCount * 100 / total
	}

	// mock 연기 횟수
	postponeCount := 0
	if member != nil {
		postponeCount = (member.ID % 3) + 1 // mock: 1~3회
	}

	data := struct {
		Phone          string
		Member         *management.Member
		AttendanceJSON template.JS
		PresentCount   int
		AbsentCount    int
		TotalCount     int
		AttendanceRate int
		PostponeCount  int
		Team           string
	}{
		Phone:          phone,
		Member:         member,
		AttendanceJSON: template.JS(attendanceJSON),
		PresentCount:   presentCount,
		AbsentCount:    absentCount,
		TotalCount:     total,
		AttendanceRate: attendanceRate,
		PostponeCount:  postponeCount,
		Team:           getTeamName(member),
	}

	if err := MembershipCheckTemplates.ExecuteTemplate(w, "membership_result.html", data); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
	}
}

func getTeamName(member *management.Member) string {
	if member == nil {
		return ""
	}
	// mock: 등급 기반 팀명 생성
	switch member.Grade {
	case "VVIP+", "VVIP":
		return fmt.Sprintf("월수 오전팀 (VIP)")
	case "A+":
		return "화목 오후팀"
	default:
		return "주말 집중팀"
	}
}
