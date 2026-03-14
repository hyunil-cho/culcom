package board

import (
	"backoffice/database"
	"backoffice/utils"
	"html/template"
	"log"
	"net/http"
	"strconv"
)

// PublicTemplates - 공개 페이지 전용 템플릿 (백오피스 레이아웃과 완전 분리)
var PublicTemplates *template.Template

// PublicNoticeItem - 공개 목록 아이템
type PublicNoticeItem struct {
	ID             string
	BranchName     string
	Title          string
	Content        string
	Category       string
	CategoryClass  string
	IsPinned       bool
	ViewCount      int
	EventStartDate string
	EventEndDate   string
	CreatedBy      string
	CreatedDate    string
	HasEventDate   bool
}

// PublicListPageData - 공개 목록 페이지 데이터
type PublicListPageData struct {
	Title         string
	Notices       []PublicNoticeItem
	Pagination    utils.Pagination
	CurrentFilter string
	SearchKeyword string
	TotalCount    int
	IsLoggedIn    bool
	MemberName    string
}

// PublicDetailPageData - 공개 상세 페이지 데이터
type PublicDetailPageData struct {
	Title      string
	Notice     PublicNoticeItem
	IsLoggedIn bool
	MemberName string
}

// ListHandler - 일반 사용자용 공지사항/이벤트 목록 (인증 불필요)
func ListHandler(w http.ResponseWriter, r *http.Request) {
	// 세션에서 로그인 상태 확인
	isLoggedIn, _, memberName := GetBoardSession(r)

	currentPage := utils.GetCurrentPageFromRequest(r)
	filter := utils.GetQueryParam(r, "filter", "all")
	searchKeyword := r.URL.Query().Get("q")

	// 전체 지점 공지 조회 (branchSeq = 0)
	itemsPerPage := 12

	totalItems, err := database.GetNoticesCount(0, filter, searchKeyword)
	if err != nil {
		log.Printf("공지사항 수 조회 오류: %v", err)
		http.Error(w, "페이지를 불러올 수 없습니다", http.StatusInternalServerError)
		return
	}

	pagination := utils.CalculatePagination(currentPage, totalItems, itemsPerPage)

	dbNotices, err := database.GetNotices(0, filter, searchKeyword, currentPage, itemsPerPage)
	if err != nil {
		log.Printf("공지사항 목록 조회 오류: %v", err)
		http.Error(w, "페이지를 불러올 수 없습니다", http.StatusInternalServerError)
		return
	}

	var notices []PublicNoticeItem
	for _, n := range dbNotices {
		notices = append(notices, dbToPublicItem(n))
	}

	data := PublicListPageData{
		Title:         "공지사항 · 이벤트",
		Notices:       notices,
		Pagination:    pagination,
		CurrentFilter: filter,
		SearchKeyword: searchKeyword,
		TotalCount:    totalItems,
		IsLoggedIn:    isLoggedIn,
		MemberName:    memberName,
	}

	if err := PublicTemplates.ExecuteTemplate(w, "board/list.html", data); err != nil {
		log.Printf("템플릿 렌더링 오류: %v", err)
		http.Error(w, "페이지를 불러올 수 없습니다", http.StatusInternalServerError)
	}
}

// DetailHandler - 일반 사용자용 공지사항/이벤트 상세 (인증 불필요)
func DetailHandler(w http.ResponseWriter, r *http.Request) {
	// 세션에서 로그인 상태 확인
	isLoggedIn, _, memberName := GetBoardSession(r)

	idStr := r.URL.Query().Get("id")
	if idStr == "" {
		http.Redirect(w, r, "/", http.StatusSeeOther)
		return
	}

	id, err := strconv.Atoi(idStr)
	if err != nil {
		http.Redirect(w, r, "/", http.StatusSeeOther)
		return
	}

	// 조회수 증가
	_ = database.IncrementNoticeViewCount(id)

	n, err := database.GetNoticeByID(id)
	if err != nil {
		log.Printf("공지사항 조회 오류: %v", err)
		http.Redirect(w, r, "/", http.StatusSeeOther)
		return
	}

	item := dbToPublicItem(*n)
	item.Content = n.Content

	data := PublicDetailPageData{
		Title:      n.Title,
		Notice:     item,
		IsLoggedIn: isLoggedIn,
		MemberName: memberName,
	}

	if err := PublicTemplates.ExecuteTemplate(w, "board/detail.html", data); err != nil {
		log.Printf("템플릿 렌더링 오류: %v", err)
		http.Error(w, "페이지를 불러올 수 없습니다", http.StatusInternalServerError)
	}
}

// dbToPublicItem - DB Notice → PublicNoticeItem 변환
func dbToPublicItem(n database.Notice) PublicNoticeItem {
	categoryClass := "badge-notice"
	if n.Category == "이벤트" {
		categoryClass = "badge-event"
	}

	createdBy := "관리자"
	if n.CreatedBy != nil {
		createdBy = *n.CreatedBy
	}

	item := PublicNoticeItem{
		ID:            strconv.Itoa(n.Seq),
		BranchName:    n.BranchName,
		Title:         n.Title,
		Category:      n.Category,
		CategoryClass: categoryClass,
		IsPinned:      n.IsPinned,
		ViewCount:     n.ViewCount,
		CreatedBy:     createdBy,
		CreatedDate:   n.CreatedDate,
		HasEventDate:  n.EventStartDate != nil,
	}

	if n.EventStartDate != nil {
		item.EventStartDate = *n.EventStartDate
	}
	if n.EventEndDate != nil {
		item.EventEndDate = *n.EventEndDate
	}

	return item
}
