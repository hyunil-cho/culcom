package management

import (
	"backoffice/middleware"
	"log"
	"net/http"
	"strconv"
	"time"
)

// MOCK 전역 데이터 (실제 DB 연동 전까지 유지)
var mockMembers = []Member{
	{
		ID: 1, Name: "송예은", Level: "3-", Info: "대학생, 영어회화 관심", JoinDate: "2026-01-08",
		PhoneNumber: "01052852951", LastDate: "2025-12-22", ExpiryDate: "2036-10-21",
		Stats: "22 did 1109 left", Grade: "VVIP+", Price: "1,200,000", PaymentMethod: "카드", SignupChannel: "인스타그램", Interviewer: "김강사",
		CreatedAt: "2026-01-08 09:30", UpdatedAt: "2026-03-15 14:20",
		AttendanceHistory: []string{"O", "O", "", "O", "", "", "O", "O", "O", "O"},
	},
	{
		ID: 2, Name: "홍지완", Level: "", Info: "직장인, 조용한 성격", JoinDate: "0000-00-00",
		PhoneNumber: "01022223333", LastDate: "0000-00-00", ExpiryDate: "0000-00-00",
		Stats: "0 left", Grade: "멤버쉽", Price: "150,000", PaymentMethod: "현금", SignupChannel: "지인 소개", Interviewer: "이매니저",
		CreatedAt: "2026-02-01 11:00", UpdatedAt: "2026-02-01 11:00",
		AttendanceHistory: []string{"", "O", "O", "O", "O", "O", "", "", "", ""},
	},
	{
		ID: 3, Name: "김재민", Level: "0", Info: "고등학생, 수능 준비", JoinDate: "0000-00-00",
		PhoneNumber: "01086859818", LastDate: "2026-02-09", ExpiryDate: "2027-02-08",
		Stats: "8 did 97 left", Grade: "A+", Price: "450,000", PaymentMethod: "계좌이체", SignupChannel: "네이버 검색", Interviewer: "박교수",
		CreatedAt: "2026-01-20 10:15", UpdatedAt: "2026-03-10 16:45",
		AttendanceHistory: []string{"", "", "", "O", "", "", "", "", "", ""},
	},
	{
		ID: 4, Name: "최민지", Level: "0", Info: "주부, 취미 목적", JoinDate: "0000-00-00",
		PhoneNumber: "01040733875", LastDate: "2026-01-05", ExpiryDate: "2027-01-04",
		Stats: "18 did 87 left", Grade: "A+", Price: "450,000", PaymentMethod: "카드", SignupChannel: "전단지", Interviewer: "김강사",
		CreatedAt: "2025-12-15 13:30", UpdatedAt: "2026-02-28 09:10",
		AttendanceHistory: []string{"", "", "", "", "", "", "O", "O", "O", ""},
	},
	{
		ID: 5, Name: "김무준", Level: "0", Info: "프리랜서, 적극적", JoinDate: "2026-01-08",
		PhoneNumber: "01054117431", LastDate: "2026-01-06", ExpiryDate: "2036-01-05",
		Stats: "17 did 1026 left", Grade: "VVIP", Price: "800,000", PaymentMethod: "카드", SignupChannel: "홈페이지", Interviewer: "이매니저",
		CreatedAt: "2026-01-08 15:00", UpdatedAt: "2026-03-20 11:30",
		AttendanceHistory: []string{"O", "", "O", "O", "O", "", "", "", "", ""},
	},
}

// FindMemberByPhone - 전화번호로 회원 검색 (공개 API용)
func FindMemberByPhone(phone string) *Member {
	for _, m := range mockMembers {
		if m.PhoneNumber == phone {
			member := m
			return &member
		}
	}
	return nil
}

// MemberListHandler - 회원 관리 목록 (전체 회원 리스트)
func MemberListHandler(w http.ResponseWriter, r *http.Request) {
	data := struct {
		middleware.BasePageData
		Title      string
		ActiveMenu string
		Members    []Member
	}{
		BasePageData: middleware.GetBasePageData(r),
		Title:        "전체 회원 관리",
		ActiveMenu:   "complex_members",
		Members:      mockMembers,
	}

	if err := Templates.ExecuteTemplate(w, "dashboard/member_list.html", data); err != nil {
		log.Println("Template error:", err)
		http.Error(w, err.Error(), http.StatusInternalServerError)
	}
}

// MemberAddHandler - 새 회원 등록 화면
func MemberAddHandler(w http.ResponseWriter, r *http.Request) {
	data := struct {
		middleware.BasePageData
		Title      string
		ActiveMenu string
		IsEdit     bool
		Member     Member
	}{
		BasePageData: middleware.GetBasePageData(r),
		Title:        "새 회원 등록",
		ActiveMenu:   "complex_members",
		IsEdit:       false,
	}

	if err := Templates.ExecuteTemplate(w, "dashboard/member_form.html", data); err != nil {
		log.Println("Template error:", err)
		http.Error(w, err.Error(), http.StatusInternalServerError)
	}
}

// MemberEditHandler - 회원 정보 수정 화면
func MemberEditHandler(w http.ResponseWriter, r *http.Request) {
	idStr := r.URL.Query().Get("id")
	id, _ := strconv.Atoi(idStr)

	var member Member
	for _, m := range mockMembers {
		if m.ID == id {
			member = m
			break
		}
	}

	data := struct {
		middleware.BasePageData
		Title      string
		ActiveMenu string
		IsEdit     bool
		Member     Member
	}{
		BasePageData: middleware.GetBasePageData(r),
		Title:        "회원 정보 수정",
		ActiveMenu:   "complex_members",
		IsEdit:       true,
		Member:       member,
	}

	if err := Templates.ExecuteTemplate(w, "dashboard/member_form.html", data); err != nil {
		log.Println("Template error:", err)
		http.Error(w, err.Error(), http.StatusInternalServerError)
	}
}

// MemberUpdateHandler - 회원 정보 저장/업데이트
func MemberUpdateHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Invalid method", http.StatusMethodNotAllowed)
		return
	}

	idStr := r.FormValue("id")
	name := r.FormValue("name")
	level := r.FormValue("level")
	info := r.FormValue("info")
	phone := r.FormValue("phone_number")
	joinDate := r.FormValue("join_date")
	lastDate := r.FormValue("last_date")
	expiryDate := r.FormValue("expiry_date")
	grade := r.FormValue("grade")
	stats := r.FormValue("stats")
	chartNumber := r.FormValue("chart_number")
	comment := r.FormValue("comment")
	price := r.FormValue("price")
	paymentMethod := r.FormValue("payment_method")
	if paymentMethod == "기타" {
		if custom := r.FormValue("payment_method_custom"); custom != "" {
			paymentMethod = custom
		}
	}
	signupChannel := r.FormValue("signup_channel")
	if signupChannel == "기타" {
		if custom := r.FormValue("signup_channel_custom"); custom != "" {
			signupChannel = custom
		}
	}

	interviewer := r.FormValue("interviewer")
	now := time.Now().Format("2006-01-02 15:04")

	if idStr == "" { // 신규
		newID := len(mockMembers) + 1
		mockMembers = append(mockMembers, Member{
			ID: newID, Name: name, Level: level, Info: info,
			PhoneNumber: phone, JoinDate: joinDate, LastDate: lastDate,
			ExpiryDate: expiryDate, Grade: grade, Stats: stats,
			ChartNumber: chartNumber, Comment: comment,
			Price: price, PaymentMethod: paymentMethod, SignupChannel: signupChannel,
			Interviewer: interviewer,
			CreatedAt:   now, UpdatedAt: now,
			AttendanceHistory: []string{"", "", "", "", "", "", "", "", "", ""},
		})
	} else { // 수정
		id, _ := strconv.Atoi(idStr)
		for i, m := range mockMembers {
			if m.ID == id {
				mockMembers[i].Name = name
				mockMembers[i].Level = level
				mockMembers[i].Info = info
				mockMembers[i].PhoneNumber = phone
				mockMembers[i].JoinDate = joinDate
				mockMembers[i].LastDate = lastDate
				mockMembers[i].ExpiryDate = expiryDate
				mockMembers[i].Grade = grade
				mockMembers[i].Stats = stats
				mockMembers[i].ChartNumber = chartNumber
				mockMembers[i].Comment = comment
				mockMembers[i].Price = price
				mockMembers[i].PaymentMethod = paymentMethod
				mockMembers[i].SignupChannel = signupChannel
				mockMembers[i].Interviewer = interviewer
				mockMembers[i].UpdatedAt = now
				break
			}
		}
	}

	http.Redirect(w, r, "/complex/members", http.StatusSeeOther)
}

// MemberDeleteHandler - 회원 삭제
func MemberDeleteHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Invalid method", http.StatusMethodNotAllowed)
		return
	}

	idStr := r.FormValue("id")
	id, _ := strconv.Atoi(idStr)

	for i, m := range mockMembers {
		if m.ID == id {
			mockMembers = append(mockMembers[:i], mockMembers[i+1:]...)
			break
		}
	}

	http.Redirect(w, r, "/complex/members", http.StatusSeeOther)
}
