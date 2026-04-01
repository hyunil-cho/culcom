package attendance

import (
	"backoffice/database"
	"backoffice/handlers/complex/management"
	"backoffice/middleware"
	"encoding/json"
	"fmt"
	"html/template"
	"log"
	"net/http"
	"time"
)

var Templates *template.Template

// Handler - 등록현황(통합) 페이지
func Handler(w http.ResponseWriter, r *http.Request) {
	baseData := middleware.GetBasePageData(r)
	branchSeq := baseData.SelectedBranchSeq

	today := time.Now().Format("2006-01-02")

	// 수업 목록 조회
	classes, err := database.GetAttendanceClasses(branchSeq)
	if err != nil {
		log.Printf("Handler: GetAttendanceClasses error: %v", err)
		http.Error(w, "수업 데이터를 불러올 수 없습니다.", http.StatusInternalServerError)
		return
	}

	// 회원 + 오늘 출석 상태 조회
	members, err := database.GetAttendanceMembers(branchSeq, today)
	if err != nil {
		log.Printf("Handler: GetAttendanceMembers error: %v", err)
		http.Error(w, "회원 데이터를 불러올 수 없습니다.", http.StatusInternalServerError)
		return
	}

	// 수업별 회원 맵 구성
	membersByClass := make(map[int][]management.Member)
	for _, m := range members {
		membersByClass[m.ClassSeq] = append(membersByClass[m.ClassSeq], management.Member{
			ID:          m.MemberSeq,
			Name:        m.Name,
			PhoneNumber: m.PhoneNumber,
			Status:      m.Status,
			IsStaff:     m.IsStaff,
			IsPostponed: m.IsPostponed,
		})
	}

	// 시간대별 그룹핑
	slotMap := make(map[int]*management.SlotGroup) // timeSlotSeq → SlotGroup
	var slotOrder []int                            // 순서 보존용

	for _, c := range classes {
		if _, exists := slotMap[c.TimeSlotSeq]; !exists {
			slotName := fmt.Sprintf("%s %s (%s ~ %s)", c.TimeSlotName, c.DaysOfWeek, c.StartTime, c.EndTime)
			slotMap[c.TimeSlotSeq] = &management.SlotGroup{TimeSlotSeq: c.TimeSlotSeq, SlotName: slotName}
			slotOrder = append(slotOrder, c.TimeSlotSeq)
		}

		slotMap[c.TimeSlotSeq].Classes = append(slotMap[c.TimeSlotSeq].Classes, management.ClassWithMembers{
			Class: management.Class{
				ID:           c.Seq,
				Name:         c.Name,
				TimeSlotName: c.TimeSlotName,
				Capacity:     c.Capacity,
			},
			Members: membersByClass[c.Seq],
		})
	}

	// 순서대로 SlotGroup 배열 구성
	var groups []management.SlotGroup
	for _, tsSeq := range slotOrder {
		groups = append(groups, *slotMap[tsSeq])
	}

	data := management.ComplexViewPageData{
		BasePageData: baseData,
		Title:        "지점 통합 등록현황",
		ActiveMenu:   "complex_attendance",
		Groups:       groups,
	}

	if err := Templates.ExecuteTemplate(w, "dashboard/attendance.html", data); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		log.Println("Template error:", err)
	}
}

// DetailHandler - 특정 시간대의 상세 등록현황(출석부) 페이지
func DetailHandler(w http.ResponseWriter, r *http.Request) {
	baseData := middleware.GetBasePageData(r)
	branchSeq := baseData.SelectedBranchSeq

	slotSeqStr := r.URL.Query().Get("slotSeq")
	if slotSeqStr == "" {
		http.Redirect(w, r, "/complex/attendance", http.StatusFound)
		return
	}
	var slotSeq int
	if _, err := fmt.Sscanf(slotSeqStr, "%d", &slotSeq); err != nil {
		http.Error(w, "잘못된 슬롯 ID입니다.", http.StatusBadRequest)
		return
	}

	// 수업 목록 조회 (sort_order 적용)
	classes, err := database.GetDetailClassesBySlot(branchSeq, slotSeq)
	if err != nil {
		log.Printf("DetailHandler: GetDetailClassesBySlot error: %v", err)
		http.Error(w, "수업 데이터를 불러올 수 없습니다.", http.StatusInternalServerError)
		return
	}

	// 슬롯 이름 조합
	slotName := ""
	if len(classes) > 0 {
		c := classes[0]
		slotName = fmt.Sprintf("%s %s (%s ~ %s)", c.TimeSlotName, c.DaysOfWeek, c.StartTime, c.EndTime)
	}

	// 회원 상세 정보 조회
	detailMembers, err := database.GetDetailMembers(branchSeq, slotSeq)
	if err != nil {
		log.Printf("DetailHandler: GetDetailMembers error: %v", err)
		http.Error(w, "회원 데이터를 불러올 수 없습니다.", http.StatusInternalServerError)
		return
	}

	// 최근 출석 기록 조회
	attendRecords, err := database.GetRecentAttendanceBySlot(branchSeq, slotSeq)
	if err != nil {
		log.Printf("DetailHandler: GetRecentAttendanceBySlot error: %v", err)
		http.Error(w, "출석 기록을 불러올 수 없습니다.", http.StatusInternalServerError)
		return
	}

	// 출석 기록을 (classSeq, memberSeq) → []string 맵으로 구성 (최근 10건)
	type histKey struct{ classSeq, memberSeq int }
	histMap := make(map[histKey][]string)
	for _, r := range attendRecords {
		k := histKey{r.ClassSeq, r.MemberSeq}
		if len(histMap[k]) < 10 {
			histMap[k] = append(histMap[k], r.Status)
		}
	}

	// 회원을 수업별로 그룹핑
	membersByClass := make(map[int][]management.Member)
	for _, dm := range detailMembers {
		remaining := dm.TotalCount - dm.UsedCount
		if remaining < 0 {
			remaining = 0
		}
		stats := fmt.Sprintf("%d did %d left", dm.UsedCount, remaining)

		history := histMap[histKey{dm.ClassSeq, dm.MemberSeq}]

		membersByClass[dm.ClassSeq] = append(membersByClass[dm.ClassSeq], management.Member{
			ID:          dm.MemberSeq,
			Name:        dm.Name,
			PhoneNumber: dm.PhoneNumber,
			Level:       dm.Level,
			Info:        dm.Info,
			JoinDate:    dm.JoinDate,
			ExpiryDate:  dm.ExpiryDate,
			Stats:       stats,
			Grade:       dm.Grade,
			IsStaff:     dm.IsStaff,
			IsPostponed: dm.IsPostponed,
			Status: func() string {
				if dm.IsPostponed {
					return "△"
				}
				return ""
			}(),
			AttendanceHistory: history,
		})
	}

	// ClassWithMembers 조합 (스태프를 첫 번째로)
	var displayClasses []management.ClassWithMembers
	for _, c := range classes {
		displayClasses = append(displayClasses, management.ClassWithMembers{
			Class: management.Class{
				ID:           c.Seq,
				Name:         c.Name,
				TimeSlotName: c.TimeSlotName,
				Capacity:     c.Capacity,
			},
			Members: membersByClass[c.Seq],
		})
	}

	today := time.Now().Format("2006-01-02")

	data := struct {
		middleware.BasePageData
		Title      string
		ActiveMenu string
		SlotName   string
		Today      string
		Classes    []management.ClassWithMembers
	}{
		BasePageData: baseData,
		Title:        slotName + " 등록현황",
		ActiveMenu:   "complex_attendance",
		SlotName:     slotName,
		Today:        today,
		Classes:      displayClasses,
	}

	if err := Templates.ExecuteTemplate(w, "dashboard/attendance_detail.html", data); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		log.Println("Template error:", err)
	}
}

// ReorderClassesHandler - 수업 카드 순서 저장 API
func ReorderClassesHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method Not Allowed", http.StatusMethodNotAllowed)
		return
	}

	var req struct {
		ClassOrders []struct {
			ID        int `json:"id"`
			SortOrder int `json:"sortOrder"`
		} `json:"classOrders"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Bad Request", http.StatusBadRequest)
		return
	}

	orders := make([]struct {
		Seq       int
		SortOrder int
	}, len(req.ClassOrders))

	for i, co := range req.ClassOrders {
		orders[i].Seq = co.ID
		orders[i].SortOrder = co.SortOrder
	}

	if err := database.UpdateClassSortOrder(orders); err != nil {
		log.Printf("ReorderClassesHandler error: %v", err)
		http.Error(w, "Internal Server Error", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"status": "ok"})
}

// BulkAttendanceHandler - 일괄 출석 저장 API
func BulkAttendanceHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method Not Allowed", http.StatusMethodNotAllowed)
		return
	}

	var req struct {
		ClassID int `json:"classId"`
		Members []struct {
			ID       int  `json:"id"`
			IsStaff  bool `json:"isStaff"`
			Attended bool `json:"attended"`
		} `json:"members"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Bad Request", http.StatusBadRequest)
		return
	}

	today := time.Now().Format("2006-01-02")

	items := make([]database.BulkAttendanceItem, len(req.Members))
	for i, m := range req.Members {
		items[i] = database.BulkAttendanceItem{
			MemberSeq: m.ID,
			IsStaff:   m.IsStaff,
			Attended:  m.Attended,
		}
	}

	results, err := database.SaveBulkAttendance(req.ClassID, today, items)
	if err != nil {
		log.Printf("BulkAttendanceHandler error: %v", err)
		http.Error(w, "Internal Server Error", http.StatusInternalServerError)
		return
	}

	type resultItem struct {
		MemberSeq int    `json:"memberSeq"`
		Name      string `json:"name"`
		Status    string `json:"status"`
	}
	resp := make([]resultItem, len(results))
	for i, r := range results {
		resp[i] = resultItem{MemberSeq: r.MemberSeq, Name: r.Name, Status: r.Status}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(resp)
}
