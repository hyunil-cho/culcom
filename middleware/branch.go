package middleware

import (
	"backoffice/config"
	"context"
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
	BranchList     []map[string]string
	SelectedBranch string
}

// GetBasePageData - context에서 공통 데이터를 가져오는 헬퍼 함수
func GetBasePageData(r *http.Request) BasePageData {
	branchList, _ := r.Context().Value(branchListKey).([]map[string]string)
	selectedBranch, _ := r.Context().Value(selectedBranchKey).(string)
	
	return BasePageData{
		BranchList:     branchList,
		SelectedBranch: selectedBranch,
	}
}

// InjectBranchData - context에 지점 데이터를 주입하는 미들웨어
func InjectBranchData(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		// 세션에서 지점 정보 가져오기
		branchList := GetBranchList(r)
		selectedBranch := GetSelectedBranch(r)
		
		// context에 저장
		ctx := context.WithValue(r.Context(), branchListKey, branchList)
		ctx = context.WithValue(ctx, selectedBranchKey, selectedBranch)
		
		// 수정된 context로 다음 핸들러 호출
		next(w, r.WithContext(ctx))
	}
}

// BranchSession - URL 파라미터로 전달된 지점 정보를 세션에 저장하는 미들웨어
func BranchSession(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		// URL 파라미터에서 branch 값 확인
		branchParam := r.URL.Query().Get("branch")

		if branchParam != "" {
			// 세션에 지점 정보 저장
			session, _ := config.SessionStore.Get(r, "app-session")
			session.Values["selectedBranch"] = branchParam
			session.Save(r, w)
		}

		// 다음 핸들러 호출
		next(w, r)
	}
}

// GetSelectedBranch - 세션에서 선택된 지점 코드를 가져오는 헬퍼 함수
func GetSelectedBranch(r *http.Request) string {
	session, _ := config.SessionStore.Get(r, "app-session")
	if branch, ok := session.Values["selectedBranch"].(string); ok && branch != "" {
		return branch
	}

	// 세션에 없으면 빈 문자열 반환 (로그인 하면 자동으로 설정됨)
	return ""
}

// GetBranchList - 세션에 저장된 지점 목록을 가져오기 (로그인 시 저장됨)
func GetBranchList(r *http.Request) []map[string]string {
	session, _ := config.SessionStore.Get(r, "app-session")

	// 세션에서 지점 목록 가져오기
	if branchList, ok := session.Values["branchList"].([]map[string]string); ok && len(branchList) > 0 {
		return branchList
	}

	// 세션에 없으면 빈 리스트 반환 (로그인 하면 자동으로 설정됨)
	return []map[string]string{}
}
