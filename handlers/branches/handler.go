package branches

import (
	"backoffice/database"
	"backoffice/handlers/errorhandler"
	"backoffice/middleware"
	"backoffice/utils"
	"fmt"
	"html/template"
	"log"
	"net/http"
	"strconv"
	"strings"
)

var Templates *template.Template

// getBranchByID - ID로 지점 조회 (DB에서)
func getBranchByID(id string) *Branch {
	// ID를 정수로 변환
	idInt, err := strconv.Atoi(id)
	if err != nil {
		log.Printf("Invalid ID format: %s", id)
		return nil
	}

	// DB에서 지점 조회
	branchData, err := database.GetBranchByID(idInt)
	if err != nil {
		log.Printf("getBranchByID error: %v", err)
		return nil
	}

	// map을 Branch 구조체로 변환
	branch := &Branch{
		ID:           fmt.Sprintf("%v", branchData["id"]),
		Name:         fmt.Sprintf("%v", branchData["name"]),
		Alias:        fmt.Sprintf("%v", branchData["alias"]),
		Address:      utils.PointerToString(branchData["address"]),
		Directions:   utils.PointerToString(branchData["directions"]),
		RegisterDate: fmt.Sprintf("%v", branchData["created_at"]),
	}

	return branch
}

// Handler - 지점 관리 페이지 핸들러
func Handler(w http.ResponseWriter, r *http.Request) {
	// 세션에서 플래시 메시지 읽기
	successMessage := utils.GetFlashMessage(w, r, "success")

	// 검색 파라미터 가져오기
	searchParams := utils.GetSearchParams(r)

	// 페이지 번호 가져오기 (기본값: 1)
	currentPage := utils.GetCurrentPageFromRequest(r)

	// DB에서 지점 목록 조회
	branchesData, err := database.GetAllBranches()
	if err != nil {
		log.Println("Database error:", err)
		http.Redirect(w, r, "/error", http.StatusSeeOther)
		return
	}

	// DB 결과를 Branch 구조체로 변환
	var allBranches []Branch
	for _, row := range branchesData {
		branch := Branch{
			ID:           fmt.Sprintf("%v", row["id"]),
			Name:         fmt.Sprintf("%v", row["name"]),
			Alias:        fmt.Sprintf("%v", row["alias"]),
			Address:      utils.PointerToString(row["address"]),
			Directions:   utils.PointerToString(row["directions"]),
			RegisterDate: fmt.Sprintf("%v", row["created_at"]),
		}
		allBranches = append(allBranches, branch)
	}

	// 검색 필터링 적용
	var filteredBranches []Branch
	if searchParams.SearchKeyword != "" {
		for _, branch := range allBranches {
			switch searchParams.SearchType {
			case "name":
				if containsIgnoreCase(branch.Name, searchParams.SearchKeyword) {
					filteredBranches = append(filteredBranches, branch)
				}
			case "alias":
				if containsIgnoreCase(branch.Alias, searchParams.SearchKeyword) {
					filteredBranches = append(filteredBranches, branch)
				}
			}
		}
		allBranches = filteredBranches
	}

	// 페이지네이션 계산
	itemsPerPage := 10
	totalItems := len(allBranches)
	pagination := utils.CalculatePagination(currentPage, totalItems, itemsPerPage)

	// 현재 페이지에 해당하는 데이터만 추출
	startIdx, endIdx := utils.GetSliceRange(currentPage, itemsPerPage, totalItems)
	var branches []Branch
	if totalItems > 0 {
		branches = allBranches[startIdx:endIdx]
	}

	data := PageData{
		BasePageData:   middleware.GetBasePageData(r),
		Title:          "지점 어드민",
		ActiveMenu:     "branches",
		Branches:       branches,
		SuccessMessage: successMessage,
		Pagination:     pagination,
		SearchType:     searchParams.SearchType,
		SearchKeyword:  searchParams.SearchKeyword,
	}

	if err := Templates.ExecuteTemplate(w, "branches/list.html", data); err != nil {
		log.Println("Template error:", err)
		http.Redirect(w, r, "/error", http.StatusSeeOther)
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
		BasePageData: middleware.GetBasePageData(r),
		Title:        "지점 상세",
		ActiveMenu:   "branches",
		Branch:       *branch,
	}

	if err := Templates.ExecuteTemplate(w, "branches/detail.html", data); err != nil {
		log.Println("Template error:", err)
		http.Redirect(w, r, "/error", http.StatusSeeOther)
	}
}

// EditHandler - 지점 수정 페이지 핸들러
func EditHandler(w http.ResponseWriter, r *http.Request) {
	id := r.URL.Query().Get("id")
	if id == "" {
		http.Redirect(w, r, "/branches", http.StatusSeeOther)
		return
	}

	if r.Method == http.MethodGet {
		// GET 요청: 수정 폼 표시
		branch := getBranchByID(id)
		if branch == nil {
			errorhandler.Handler404(w, r)
			return
		}

		data := EditPageData{
			BasePageData: middleware.GetBasePageData(r),
			Title:        "지점 수정",
			ActiveMenu:   "branches",
			Branch:       *branch,
		}

		if err := Templates.ExecuteTemplate(w, "branches/edit.html", data); err != nil {
			log.Println("Template error:", err)
			http.Redirect(w, r, "/error", http.StatusSeeOther)
		}
		return
	}

	if r.Method == http.MethodPost {
		// POST 요청: 수정 처리
		if err := r.ParseForm(); err != nil {
			log.Println("Form parse error:", err)
			http.Redirect(w, r, "/error", http.StatusSeeOther)
			return
		}

		name := r.FormValue("name")
		alias := r.FormValue("alias")
		address := r.FormValue("address")
		directions := r.FormValue("directions")

		// 유효성 검증
		if name == "" || alias == "" {
			log.Println("Validation error: name or alias is empty")
			http.Redirect(w, r, "/error", http.StatusSeeOther)
			return
		}

		// ID를 정수로 변환
		idInt := 0
		if _, err := fmt.Sscanf(id, "%d", &idInt); err != nil {
			log.Println("Invalid ID format:", err)
			http.Redirect(w, r, "/error", http.StatusSeeOther)
			return
		}

		// 데이터베이스 업데이트
		if _, err := database.UpdateBranch(idInt, name, alias, address, directions); err != nil {
			log.Println("Database error:", err)
			http.Redirect(w, r, "/error", http.StatusSeeOther)
			return
		}

		// 세션에 플래시 메시지 저장
		utils.SetFlashMessage(w, r, "success", "지점이 성공적으로 수정되었습니다.")

		// 성공 시 목록 페이지로 리다이렉트
		http.Redirect(w, r, "/branches", http.StatusSeeOther)
		return
	}

	// 다른 메서드는 허용하지 않음
	log.Println("Method not allowed:", r.Method)
	http.Redirect(w, r, "/error", http.StatusSeeOther)
}

// AddHandler - 지점 추가 페이지 핸들러
func AddHandler(w http.ResponseWriter, r *http.Request) {
	// GET 요청: 지점 추가 페이지 렌더링
	if r.Method == http.MethodGet {
		data := PageData{
			BasePageData: middleware.GetBasePageData(r),
			Title:        "지점 추가",
			ActiveMenu:   "branches",
		}

		if err := Templates.ExecuteTemplate(w, "branches/add.html", data); err != nil {
			log.Println("Template error:", err)
			http.Redirect(w, r, "/error", http.StatusSeeOther)
		}
		return
	}

	// POST 요청: 지점 추가 처리
	if r.Method == http.MethodPost {
		// 폼 데이터 파싱
		err := r.ParseForm()
		if err != nil {
			log.Println("Form parse error:", err)
			http.Redirect(w, r, "/error", http.StatusSeeOther)
			return
		}

		// 폼에서 값 추출
		branchName := r.FormValue("name")
		branchAlias := r.FormValue("alias")
		address := r.FormValue("address")
		directions := r.FormValue("directions")

		// 값 검증
		if branchName == "" || branchAlias == "" {
			log.Println("필수값 누락 - 지점명 또는 alias")
			http.Redirect(w, r, "/error", http.StatusSeeOther)
			return
		}

		// 받은 값 로그 출력 (확인용)
		log.Printf("지점 추가 요청 - 지점명: %s, Alias: %s, 주소: %s", branchName, branchAlias, address)

		// DB에 지점 저장
		branchID, err := database.InsertBranch(branchName, branchAlias, address, directions)
		if err != nil {
			log.Printf("지점 저장 오류: %v", err)
			http.Redirect(w, r, "/error", http.StatusSeeOther)
			return
		}

		log.Printf("지점 추가 성공 - ID: %d", branchID)

		// 세션에 플래시 메시지 저장
		utils.SetFlashMessage(w, r, "success", "지점이 성공적으로 추가되었습니다.")

		// 성공 시 목록 페이지로 리다이렉트
		http.Redirect(w, r, "/branches", http.StatusSeeOther)
		return
	}

	// 다른 HTTP 메서드는 허용하지 않음
	log.Printf("허용되지 않은 HTTP 메서드: %s", r.Method)
	http.Redirect(w, r, "/error", http.StatusSeeOther)
}

// DeleteHandler - 지점 삭제 핸들러
func DeleteHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		log.Printf("허용되지 않은 HTTP 메서드: %s", r.Method)
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// ID 파라미터 가져오기
	idStr := r.URL.Query().Get("id")
	if idStr == "" {
		log.Println("지점 ID가 제공되지 않음")
		http.Redirect(w, r, "/branches?error=invalid_id", http.StatusSeeOther)
		return
	}

	id, err := strconv.Atoi(idStr)
	if err != nil {
		log.Printf("잘못된 지점 ID: %s", idStr)
		http.Redirect(w, r, "/branches?error=invalid_id", http.StatusSeeOther)
		return
	}

	// DB에서 지점 삭제
	rowsAffected, err := database.DeleteBranch(id)
	if err != nil {
		log.Printf("지점 삭제 오류: %v", err)
		http.Redirect(w, r, "/branches?error=delete_failed", http.StatusSeeOther)
		return
	}

	if rowsAffected == 0 {
		log.Printf("삭제할 지점을 찾을 수 없음 - ID: %d", id)
		http.Redirect(w, r, "/branches?error=not_found", http.StatusSeeOther)
		return
	}

	log.Printf("지점 삭제 성공 - ID: %d", id)

	// 세션에 플래시 메시지 저장
	utils.SetFlashMessage(w, r, "success", "지점이 성공적으로 삭제되었습니다.")

	// 목록 페이지로 리다이렉트
	http.Redirect(w, r, "/branches", http.StatusSeeOther)
}

// containsIgnoreCase - 대소문자 구분 없이 문자열 포함 여부 확인
func containsIgnoreCase(str, substr string) bool {
	return strings.Contains(strings.ToLower(str), strings.ToLower(substr))
}
