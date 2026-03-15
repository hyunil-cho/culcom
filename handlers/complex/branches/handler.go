package branches

import (
	"backoffice/database"
	"backoffice/middleware"
	"html/template"
	"log"
	"net/http"
	"strconv"
)

var Templates *template.Template

// Handler - 지점 목록
func Handler(w http.ResponseWriter, r *http.Request) {
	dbBranches, err := database.GetAllBranches()
	if err != nil {
		log.Println("GetAllBranches error:", err)
		http.Error(w, "지점 목록을 가져오는 데 실패했습니다.", http.StatusInternalServerError)
		return
	}

	var branches []Branch
	for _, dbB := range dbBranches {
		branches = append(branches, Branch{
			ID:           dbB["id"].(int),
			Name:         dbB["name"].(string),
			Alias:        dbB["alias"].(string),
			Manager:      getOrDefault(dbB["manager"]),
			Address:      getOrDefault(dbB["address"]),
			Directions:   getOrDefault(dbB["directions"]),
			CreatedAt:    dbB["created_at"].(string),
			UpdatedAt:    dbB["updated_at"].(string),
			RegisterDate: dbB["created_at"].(string), // For backward compatibility
		})
	}

	data := PageData{
		BasePageData: middleware.GetBasePageData(r),
		Title:        "지점 관리",
		ActiveMenu:   "complex_branches",
		AdminName:    "관리자",
		Branches:     branches,
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

	_, err := database.InsertBranch(name, alias, manager, address, directions)
	if err != nil {
		log.Println("InsertBranch error:", err)
		http.Error(w, "지점 추가에 실패했습니다.", http.StatusInternalServerError)
		return
	}

	http.Redirect(w, r, "/complex/branches", http.StatusSeeOther)
}

// DetailHandler - 지점 상세
func DetailHandler(w http.ResponseWriter, r *http.Request) {
	id, _ := strconv.Atoi(r.URL.Query().Get("id"))
	
	dbBranch, err := database.GetBranchByID(id)
	if err != nil {
		log.Println("GetBranchByID error:", err)
		http.Error(w, "지점 정보를 가져오는 데 실패했습니다.", http.StatusInternalServerError)
		return
	}

	branch := Branch{
		ID:           dbBranch["id"].(int),
		Name:         dbBranch["name"].(string),
		Alias:        dbBranch["alias"].(string),
		Manager:      getOrDefault(dbBranch["manager"]),
		Address:      getOrDefault(dbBranch["address"]),
		Directions:   getOrDefault(dbBranch["directions"]),
		CreatedAt:    dbBranch["created_at"].(string),
		UpdatedAt:    dbBranch["updated_at"].(string),
		RegisterDate: dbBranch["created_at"].(string),
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
	
	dbBranch, err := database.GetBranchByID(id)
	if err != nil {
		log.Println("GetBranchByID error:", err)
		http.Error(w, "지점 정보를 가져오는 데 실패했습니다.", http.StatusInternalServerError)
		return
	}

	branch := Branch{
		ID:           dbBranch["id"].(int),
		Name:         dbBranch["name"].(string),
		Alias:        dbBranch["alias"].(string),
		Manager:      getOrDefault(dbBranch["manager"]),
		Address:      getOrDefault(dbBranch["address"]),
		Directions:   getOrDefault(dbBranch["directions"]),
		CreatedAt:    dbBranch["created_at"].(string),
		UpdatedAt:    dbBranch["updated_at"].(string),
		RegisterDate: dbBranch["created_at"].(string),
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

// DeleteHandler - 지점 삭제 처리 (POST)
func DeleteHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	id, _ := strconv.Atoi(r.FormValue("id"))

	_, err := database.DeleteBranch(id)
	if err != nil {
		log.Println("DeleteBranch error:", err)
		http.Error(w, "지점 삭제에 실패했습니다.", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
}
