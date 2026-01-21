package branches

import (
	"backoffice/handlers/errorhandler"
	"html/template"
	"log"
	"net/http"
)

var Templates *template.Template

// 더미 데이터 (실제로는 데이터베이스에서 가져와야 함)
var dummyBranches = []Branch{
	{ID: "BR001", Name: "강남점", Alias: "gangnam", Address: "서울시 강남구 테헤란로 123", Representative: "김철수", RegisterDate: "2025-01-01"},
	{ID: "BR002", Name: "홍대점", Alias: "hongdae", Address: "서울시 마포구 홍익로 45", Representative: "이영희", RegisterDate: "2025-02-15"},
	{ID: "BR003", Name: "신촌점", Alias: "sinchon", Address: "서울시 서대문구 신촌로 78", Representative: "박민수", RegisterDate: "2025-03-10"},
	{ID: "BR004", Name: "판교점", Alias: "pangyo", Address: "경기도 성남시 분당구 판교역로 234", Representative: "정수진", RegisterDate: "2025-04-20"},
	{ID: "BR005", Name: "부산점", Alias: "busan", Address: "부산시 해운대구 센텀중앙로 99", Representative: "최동욱", RegisterDate: "2025-05-05"},
}

// getBranchByID - ID로 지점 조회
func getBranchByID(id string) *Branch {
	for _, branch := range dummyBranches {
		if branch.ID == id {
			return &branch
		}
	}
	return nil
}

// Handler - 지점 관리 페이지 핸들러
func Handler(w http.ResponseWriter, r *http.Request) {
	data := PageData{
		Title:      "지점 관리",
		ActiveMenu: "branches",
		Branches:   dummyBranches,
	}

	if err := Templates.ExecuteTemplate(w, "branches/list.html", data); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		log.Println("Template error:", err)
	}
}

// DetailHandler - 지점 상세 페이지 핸들러
func DetailHandler(w http.ResponseWriter, r *http.Request) {
	id := r.URL.Query().Get("id")
	if id == "" {
		http.Redirect(w, r, "/branches", http.StatusSeeOther)
		return
	}

	branch := getBranchByID(id)
	if branch == nil {
		errorhandler.Handler404(w, r)
		return
	}

	data := DetailPageData{
		Title:      "지점 상세",
		ActiveMenu: "branches",
		Branch:     *branch,
	}

	if err := Templates.ExecuteTemplate(w, "branches/detail.html", data); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		log.Println("Template error:", err)
	}
}

// EditHandler - 지점 수정 페이지 핸들러
func EditHandler(w http.ResponseWriter, r *http.Request) {
	id := r.URL.Query().Get("id")
	if id == "" {
		http.Redirect(w, r, "/branches", http.StatusSeeOther)
		return
	}

	branch := getBranchByID(id)
	if branch == nil {
		errorhandler.Handler404(w, r)
		return
	}

	data := EditPageData{
		Title:      "지점 수정",
		ActiveMenu: "branches",
		Branch:     *branch,
	}

	if err := Templates.ExecuteTemplate(w, "branches/edit.html", data); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		log.Println("Template error:", err)
	}
}

// AddHandler - 지점 추가 페이지 핸들러
func AddHandler(w http.ResponseWriter, r *http.Request) {
	data := PageData{
		Title:      "지점 추가",
		ActiveMenu: "branches",
	}

	if err := Templates.ExecuteTemplate(w, "branches/add.html", data); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		log.Println("Template error:", err)
	}
}
