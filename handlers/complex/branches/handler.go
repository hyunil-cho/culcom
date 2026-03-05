package branches

import (
	"backoffice/middleware"
	"html/template"
	"log"
	"net/http"
	"strconv"
)

var Templates *template.Template

// 샘플 데이터 (임시 데이터베이스 역할)
var mockBranches = []Branch{
	{ID: 1, Name: "대구지점", Alias: "daegu", RegisterDate: "2026-01-01"},
	{ID: 2, Name: "가산지점", Alias: "gasan", RegisterDate: "2026-01-05"},
	{ID: 3, Name: "강남지점", Alias: "gangnam", RegisterDate: "2026-02-10"},
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
	}
}

// UpdateHandler - 지점 정보 업데이트 처리 (POST)
func UpdateHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	id, _ := strconv.Atoi(r.FormValue("id"))
	newName := r.FormValue("name")

	// 실제로는 DB 업데이트 로직이 들어감
	for i, b := range mockBranches {
		if b.ID == id {
			mockBranches[i].Name = newName
			break
		}
	}

	http.Redirect(w, r, "/complex/branches", http.StatusSeeOther)
}
