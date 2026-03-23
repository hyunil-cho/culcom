package branches

import (
	"backoffice/middleware"
	"html/template"
	"log"
	"net/http"
	"strconv"
)

var Templates *template.Template

// UI 개발을 위한 MOCK 데이터
var mockBranches = []Branch{
	{ID: 1, Name: "대구지점", Alias: "daegu", Manager: "김관리", Address: "대구광역시 중구", Directions: "반월당역 1번 출구", CreatedAt: "2026-01-01", UpdatedAt: "2026-01-01", RegisterDate: "2026-01-01"},
	{ID: 2, Name: "가산지점", Alias: "gasan", Manager: "이매니저", Address: "서울특별시 금천구", Directions: "가산디지털단지역 7번 출구", CreatedAt: "2026-01-05", UpdatedAt: "2026-01-05", RegisterDate: "2026-01-05"},
	{ID: 3, Name: "강남지점", Alias: "gangnam", Manager: "박팀장", Address: "서울특별시 강남구", Directions: "강남역 10번 출구", CreatedAt: "2026-02-10", UpdatedAt: "2026-02-10", RegisterDate: "2026-02-10"},
}

// Handler - 지점 목록
func Handler(w http.ResponseWriter, r *http.Request) {
	data := PageData{
		BasePageData: middleware.GetBasePageData(r),
		Title:        "지점 관리",
		ActiveMenu:   "complex_branches",
		AdminName:    "관리자",
		Branches:     mockBranches,
	}

	if err := Templates.ExecuteTemplate(w, "dashboard/complex_branches.html", data); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		log.Println("Template error:", err)
	}
}

func getOrDefault(v interface{}) string {
	if v == nil {
		return ""
	}
	if s, ok := v.(*string); ok && s != nil {
		return *s
	}
	if s, ok := v.(string); ok {
		return s
	}
	return ""
}

// AddHandler - 지점 추가 화면
func AddHandler(w http.ResponseWriter, r *http.Request) {
	data := struct {
		middleware.BasePageData
		Title      string
		ActiveMenu string
	}{
		BasePageData: middleware.GetBasePageData(r),
		Title:        "지점 추가",
		ActiveMenu:   "complex_branches",
	}

	if err := Templates.ExecuteTemplate(w, "dashboard/complex_branch_add.html", data); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		log.Println("Template error:", err)
	}
}

// StoreHandler - 지점 추가 처리 (POST)
func StoreHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	name := r.FormValue("name")
	alias := r.FormValue("alias")
	manager := r.FormValue("manager")
	address := r.FormValue("address")
	directions := r.FormValue("directions")

	// MOCK 추가 로직
	newID := len(mockBranches) + 1
	mockBranches = append(mockBranches, Branch{
		ID:           newID,
		Name:         name,
		Alias:        alias,
		Manager:      manager,
		Address:      address,
		Directions:   directions,
		CreatedAt:    "2026-03-15",
		UpdatedAt:    "2026-03-15",
		RegisterDate: "2026-03-15",
	})

	http.Redirect(w, r, "/complex/branches", http.StatusSeeOther)
}

// DetailHandler - 지점 상세
func DetailHandler(w http.ResponseWriter, r *http.Request) {
	id, _ := strconv.Atoi(r.URL.Query().Get("id"))
	
	var branch Branch
	for _, b := range mockBranches {
		if b.ID == id {
			branch = b
			break
		}
	}

	data := struct {
		middleware.BasePageData
		Title      string
		ActiveMenu string
		Branch     Branch
	}{
		BasePageData: middleware.GetBasePageData(r),
		Title:        "지점 상세 정보",
		ActiveMenu:   "complex_branches",
		Branch:       branch,
	}

	if err := Templates.ExecuteTemplate(w, "dashboard/complex_branch_detail.html", data); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		log.Println("Template error:", err)
	}
}

// EditHandler - 지점 수정 화면
func EditHandler(w http.ResponseWriter, r *http.Request) {
	id, _ := strconv.Atoi(r.URL.Query().Get("id"))
	
	var branch Branch
	for _, b := range mockBranches {
		if b.ID == id {
			branch = b
			break
		}
	}

	data := struct {
		middleware.BasePageData
		Title      string
		ActiveMenu string
		Branch     Branch
	}{
		BasePageData: middleware.GetBasePageData(r),
		Title:        "지점 정보 수정",
		ActiveMenu:   "complex_branches",
		Branch:       branch,
	}

	if err := Templates.ExecuteTemplate(w, "dashboard/complex_branch_edit.html", data); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		log.Println("Template error:", err)
	}
}

// UpdateHandler - 지점 정보 업데이트 처리 (POST)
func UpdateHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	id, _ := strconv.Atoi(r.FormValue("id"))
	name := r.FormValue("name")
	alias := r.FormValue("alias")
	manager := r.FormValue("manager")
	address := r.FormValue("address")
	directions := r.FormValue("directions")

	// MOCK 업데이트 로직
	for i, b := range mockBranches {
		if b.ID == id {
			mockBranches[i].Name = name
			mockBranches[i].Alias = alias
			mockBranches[i].Manager = manager
			mockBranches[i].Address = address
			mockBranches[i].Directions = directions
			mockBranches[i].UpdatedAt = "2026-03-15"
			break
		}
	}

	http.Redirect(w, r, "/complex/branches", http.StatusSeeOther)
}

// DeleteHandler - 지점 삭제 처리 (POST)
func DeleteHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	id, _ := strconv.Atoi(r.FormValue("id"))

	// MOCK 삭제 로직
	for i, b := range mockBranches {
		if b.ID == id {
			mockBranches = append(mockBranches[:i], mockBranches[i+1:]...)
			break
		}
	}

	w.WriteHeader(http.StatusOK)
}
