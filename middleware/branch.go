package middleware

import (
	"backoffice/config"
	"backoffice/database"
	"context"
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

// GetBranchList - DB에서 지점 목록을 직접 가져오기 (매 요청마다 최신 데이터)
func GetBranchList(r *http.Request) []map[string]string {
	branchList, err := database.GetBranchesForSelect()
	if err != nil {
		log.Printf("[GetBranchList] DB 조회 실패: %v", err)
		return []map[string]string{}
	}

	log.Printf("[GetBranchList] DB에서 지점 목록 조회: %d개", len(branchList))
	return branchList
}
