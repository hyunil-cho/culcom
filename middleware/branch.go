package middleware

import (
	"backoffice/config"
	"backoffice/database"
	"context"
	"fmt"
	"log"
	"net/http"
)

// Context keys
type contextKey string

const (
	branchListKey     contextKey = "branchList"
	selectedBranchKey contextKey = "selectedBranch"
)

// BasePageData - 모든 페이지에 공통으로 필요한 데이터
type BasePageData struct {
	BranchList               []map[string]string
	SelectedBranch           string // alias
	SelectedBranchName       string // 한글 이름
	SelectedBranchManager    string // 담당자
	SelectedBranchAddress    string // 주소
	SelectedBranchDirections string // 오시는 길
}

// GetBasePageData - context에서 공통 데이터를 가져오는 헬퍼 함수
func GetBasePageData(r *http.Request) BasePageData {
	branchList, _ := r.Context().Value(branchListKey).([]map[string]string)
	selectedBranch, _ := r.Context().Value(selectedBranchKey).(string)
	selectedBranchName, _ := r.Context().Value(contextKey("selectedBranchName")).(string)
	selectedBranchManager, _ := r.Context().Value(contextKey("selectedBranchManager")).(string)
	selectedBranchAddress, _ := r.Context().Value(contextKey("selectedBranchAddress")).(string)
	selectedBranchDirections, _ := r.Context().Value(contextKey("selectedBranchDirections")).(string)

	return BasePageData{
		BranchList:               branchList,
		SelectedBranch:           selectedBranch,           // 헤더 표시용 alias
		SelectedBranchName:       selectedBranchName,       // 한글 이름
		SelectedBranchManager:    selectedBranchManager,    // 담당자
		SelectedBranchAddress:    selectedBranchAddress,    // 주소
		SelectedBranchDirections: selectedBranchDirections, // 오시는 길
	}
}

// InjectBranchData - context에 지점 데이터를 주입하는 미들웨어
func InjectBranchData(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		// 세션에서 지점 정보 가져오기
		branchList := GetBranchList(r)
		selectedBranchAlias := GetSelectedBranchAlias(r)           // 헤더 표시용 alias
		selectedBranchName := GetSelectedBranchName(r)             // 한글 이름
		selectedBranchManager := GetSelectedBranchManager(r)       // 담당자
		selectedBranchAddress := GetSelectedBranchAddress(r)       // 주소
		selectedBranchDirections := GetSelectedBranchDirections(r) // 오시는 길

		// context에 저장
		ctx := context.WithValue(r.Context(), branchListKey, branchList)
		ctx = context.WithValue(ctx, selectedBranchKey, selectedBranchAlias)
		ctx = context.WithValue(ctx, contextKey("selectedBranchName"), selectedBranchName)
		ctx = context.WithValue(ctx, contextKey("selectedBranchManager"), selectedBranchManager)
		ctx = context.WithValue(ctx, contextKey("selectedBranchAddress"), selectedBranchAddress)
		ctx = context.WithValue(ctx, contextKey("selectedBranchDirections"), selectedBranchDirections)

		// 수정된 context로 다음 핸들러 호출
		next(w, r.WithContext(ctx))
	}
}

// BranchSession - URL 파라미터로 전달된 지점 정보를 세션에 저장하는 미들웨어
func BranchSession(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		// URL 파라미터에서 branch 값 확인 (alias로 전달됨)
		branchParam := r.URL.Query().Get("branch")

		if branchParam != "" {
			// alias로 seq를 찾아서 저장
			branchList := GetBranchList(r)
			for _, branch := range branchList {
				if branch["alias"] == branchParam {
					// 세션에 seq 저장
					session, _ := config.SessionStore.Get(r, "app-session")
					session.Values["selectedBranch"] = branch["seq"]
					session.Save(r, w)
					log.Printf("지점 변경: %s (seq: %s)", branchParam, branch["seq"])
					break
				}
			}
		}

		// 다음 핸들러 호출
		next(w, r)
	}
}

// GetSelectedBranch - 세션에서 선택된 지점 코드(seq)를 가져오는 헬퍼 함수
func GetSelectedBranch(r *http.Request) int {
	session, _ := config.SessionStore.Get(r, "app-session")
	if branchSeq, ok := session.Values["selectedBranch"].(string); ok && branchSeq != "" {
		// string을 int로 변환
		var seq int
		if _, err := fmt.Sscanf(branchSeq, "%d", &seq); err == nil {
			return seq
		}
	}

	// 세션에 없으면 0 반환 (로그인 하면 자동으로 설정됨)
	return 0
}

// GetSelectedBranchAlias - 세션에서 선택된 지점의 alias를 가져오는 헬퍼 함수 (헤더 표시용)
func GetSelectedBranchAlias(r *http.Request) string {
	branchSeq := GetSelectedBranch(r)
	if branchSeq == 0 {
		return ""
	}

	// branchList에서 해당 seq의 alias 찾기
	branchList := GetBranchList(r)
	for _, branch := range branchList {
		if branch["seq"] == fmt.Sprintf("%d", branchSeq) {
			return branch["alias"]
		}
	}

	return ""
}

// GetSelectedBranchName - 세션에서 선택된 지점의 한글 이름을 가져오는 헬퍼 함수
func GetSelectedBranchName(r *http.Request) string {
	branchSeq := GetSelectedBranch(r)
	if branchSeq == 0 {
		return ""
	}

	// branchList에서 해당 seq의 name 찾기
	branchList := GetBranchList(r)
	for _, branch := range branchList {
		if branch["seq"] == fmt.Sprintf("%d", branchSeq) {
			return branch["name"]
		}
	}

	return ""
}

// GetSelectedBranchManager - 세션에서 선택된 지점의 담당자를 가져오는 헬퍼 함수
func GetSelectedBranchManager(r *http.Request) string {
	branchSeq := GetSelectedBranch(r)
	if branchSeq == 0 {
		return ""
	}

	// branchList에서 해당 seq의 manager 찾기
	branchList := GetBranchList(r)
	for _, branch := range branchList {
		if branch["seq"] == fmt.Sprintf("%d", branchSeq) {
			manager := branch["manager"]
			return manager
		}
	}

	return ""
}

// GetSelectedBranchAddress - 세션에서 선택된 지점의 주소를 가져오는 헬퍼 함수
func GetSelectedBranchAddress(r *http.Request) string {
	branchSeq := GetSelectedBranch(r)
	if branchSeq == 0 {
		return ""
	}

	// branchList에서 해당 seq의 address 찾기
	branchList := GetBranchList(r)
	for _, branch := range branchList {
		if branch["seq"] == fmt.Sprintf("%d", branchSeq) {
			address := branch["address"]
			return address
		}
	}

	return ""
}

// GetSelectedBranchDirections - 세션에서 선택된 지점의 오시는 길을 가져오는 헬퍼 함수
func GetSelectedBranchDirections(r *http.Request) string {
	branchSeq := GetSelectedBranch(r)
	if branchSeq == 0 {
		return ""
	}

	// branchList에서 해당 seq의 directions 찾기
	branchList := GetBranchList(r)
	for _, branch := range branchList {
		if branch["seq"] == fmt.Sprintf("%d", branchSeq) {
			directions := branch["directions"]
			return directions
		}
	}

	return ""
}

// GetBranchList - DB에서 지점 목록을 직접 가져오기 (매 요청마다 최신 데이터)
func GetBranchList(r *http.Request) []map[string]string {
	branchList, err := database.GetBranchesForSelect()
	if err != nil {
		log.Printf("[GetBranchList] DB 조회 실패: %v", err)
		return []map[string]string{}
	}

	return branchList
}
