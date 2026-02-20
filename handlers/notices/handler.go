package notices

import (
	"backoffice/database"
	"backoffice/middleware"
	"backoffice/utils"
	"fmt"
	"html/template"
	"log"
	"net/http"
	"strconv"
)

var Templates *template.Template

// Handler - 공지사항/이벤트 목록 페이지
func Handler(w http.ResponseWriter, r *http.Request) {
	// 페이지 파라미터
	currentPage := utils.GetCurrentPageFromRequest(r)
	// 필터 (카테고리)
	filter := utils.GetQueryParam(r, "filter", "all")
	// 검색어
	searchKeyword := r.URL.Query().Get("searchKeyword")

	// 선택된 지점
	branchSeq := middleware.GetSelectedBranch(r)

	itemsPerPage := 10

	// 전체 건수 조회
	totalItems, err := database.GetNoticesCount(branchSeq, filter, searchKeyword)
	if err != nil {
		log.Printf("공지사항 수 조회 오류: %v", err)
		http.Error(w, "공지사항 조회 실패", http.StatusInternalServerError)
		return
	}

	// 페이징 계산
	pagination := utils.CalculatePagination(currentPage, totalItems, itemsPerPage)

	// 목록 조회
	dbNotices, err := database.GetNotices(branchSeq, filter, searchKeyword, currentPage, itemsPerPage)
	if err != nil {
		log.Printf("공지사항 목록 조회 오류: %v", err)
		http.Error(w, "공지사항 목록 조회 실패", http.StatusInternalServerError)
		return
	}

	// 모델 변환
	var notices []NoticeItem
	for _, n := range dbNotices {
		categoryClass := "category-notice"
		if n.Category == "이벤트" {
			categoryClass = "category-event"
		}

		createdBy := "관리자"
		if n.CreatedBy != nil {
			createdBy = *n.CreatedBy
		}

		item := NoticeItem{
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

		notices = append(notices, item)
	}

	data := ListPageData{
		BasePageData:  middleware.GetBasePageData(r),
		Title:         "공지사항 · 이벤트",
		ActiveMenu:    "notices",
		Notices:       notices,
		Pagination:    pagination,
		CurrentFilter: filter,
		SearchKeyword: searchKeyword,
		TotalCount:    totalItems,
	}

	if err := Templates.ExecuteTemplate(w, "notices/list.html", data); err != nil {
		log.Printf("템플릿 렌더링 오류: %v", err)
		http.Error(w, "페이지 렌더링 실패", http.StatusInternalServerError)
	}
}

// DetailHandler - 공지사항/이벤트 상세 페이지
func DetailHandler(w http.ResponseWriter, r *http.Request) {
	idStr := r.URL.Query().Get("id")
	if idStr == "" {
		http.Redirect(w, r, "/notices", http.StatusSeeOther)
		return
	}

	id, err := strconv.Atoi(idStr)
	if err != nil {
		http.Redirect(w, r, "/notices", http.StatusSeeOther)
		return
	}

	// 조회수 증가
	_ = database.IncrementNoticeViewCount(id)

	// 상세 조회
	n, err := database.GetNoticeByID(id)
	if err != nil {
		log.Printf("공지사항 상세 조회 오류: %v", err)
		http.Redirect(w, r, "/notices", http.StatusSeeOther)
		return
	}

	categoryClass := "category-notice"
	if n.Category == "이벤트" {
		categoryClass = "category-event"
	}

	createdBy := "관리자"
	if n.CreatedBy != nil {
		createdBy = *n.CreatedBy
	}

	lastUpdateDate := ""
	if n.LastUpdateDate != nil {
		lastUpdateDate = *n.LastUpdateDate
	}

	detail := NoticeDetail{
		ID:             strconv.Itoa(n.Seq),
		BranchName:     n.BranchName,
		Title:          n.Title,
		Content:        n.Content,
		Category:       n.Category,
		CategoryClass:  categoryClass,
		IsPinned:       n.IsPinned,
		ViewCount:      n.ViewCount,
		CreatedBy:      createdBy,
		CreatedDate:    n.CreatedDate,
		LastUpdateDate: lastUpdateDate,
		HasEventDate:   n.EventStartDate != nil,
	}

	if n.EventStartDate != nil {
		detail.EventStartDate = *n.EventStartDate
	}
	if n.EventEndDate != nil {
		detail.EventEndDate = *n.EventEndDate
	}

	data := DetailPageData{
		BasePageData: middleware.GetBasePageData(r),
		Title:        n.Title,
		ActiveMenu:   "notices",
		Notice:       detail,
	}

	if err := Templates.ExecuteTemplate(w, "notices/detail.html", data); err != nil {
		log.Printf("템플릿 렌더링 오류: %v", err)
		http.Error(w, "페이지 렌더링 실패", http.StatusInternalServerError)
	}
}

// AddHandler - 공지사항/이벤트 등록 페이지 및 처리
func AddHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method == http.MethodPost {
		// POST: 등록 처리
		branchSeq := middleware.GetSelectedBranch(r)
		title := r.FormValue("title")
		content := r.FormValue("content")
		category := r.FormValue("category")
		isPinnedStr := r.FormValue("is_pinned")
		eventStartDate := r.FormValue("event_start_date")
		eventEndDate := r.FormValue("event_end_date")
		createdBy := r.FormValue("created_by")

		isPinned := isPinnedStr == "1" || isPinnedStr == "on"

		if title == "" || content == "" {
			data := AddPageData{
				BasePageData: middleware.GetBasePageData(r),
				Title:        "공지사항 등록",
				ActiveMenu:   "notices",
				ErrorMessage: "제목과 내용은 필수 입력 항목입니다.",
			}
			Templates.ExecuteTemplate(w, "notices/add.html", data)
			return
		}

		_, err := database.InsertNotice(branchSeq, title, content, category, isPinned, eventStartDate, eventEndDate, createdBy)
		if err != nil {
			log.Printf("공지사항 등록 오류: %v", err)
			data := AddPageData{
				BasePageData: middleware.GetBasePageData(r),
				Title:        "공지사항 등록",
				ActiveMenu:   "notices",
				ErrorMessage: "등록에 실패했습니다.",
			}
			Templates.ExecuteTemplate(w, "notices/add.html", data)
			return
		}

		http.Redirect(w, r, "/notices", http.StatusSeeOther)
		return
	}

	// GET: 등록 폼
	data := AddPageData{
		BasePageData: middleware.GetBasePageData(r),
		Title:        "공지사항 등록",
		ActiveMenu:   "notices",
	}

	if err := Templates.ExecuteTemplate(w, "notices/add.html", data); err != nil {
		log.Printf("템플릿 렌더링 오류: %v", err)
		http.Error(w, "페이지 렌더링 실패", http.StatusInternalServerError)
	}
}

// EditHandler - 공지사항/이벤트 수정 페이지 및 처리
func EditHandler(w http.ResponseWriter, r *http.Request) {
	idStr := r.URL.Query().Get("id")
	if idStr == "" {
		http.Redirect(w, r, "/notices", http.StatusSeeOther)
		return
	}

	id, err := strconv.Atoi(idStr)
	if err != nil {
		http.Redirect(w, r, "/notices", http.StatusSeeOther)
		return
	}

	if r.Method == http.MethodPost {
		// POST: 수정 처리
		title := r.FormValue("title")
		content := r.FormValue("content")
		category := r.FormValue("category")
		isPinnedStr := r.FormValue("is_pinned")
		eventStartDate := r.FormValue("event_start_date")
		eventEndDate := r.FormValue("event_end_date")

		isPinned := isPinnedStr == "1" || isPinnedStr == "on"

		if title == "" || content == "" {
			n, _ := database.GetNoticeByID(id)
			detail := noticeToDetail(n)
			data := EditPageData{
				BasePageData: middleware.GetBasePageData(r),
				Title:        "공지사항 수정",
				ActiveMenu:   "notices",
				Notice:       detail,
				ErrorMessage: "제목과 내용은 필수 입력 항목입니다.",
			}
			Templates.ExecuteTemplate(w, "notices/edit.html", data)
			return
		}

		_, err := database.UpdateNotice(id, title, content, category, isPinned, eventStartDate, eventEndDate)
		if err != nil {
			log.Printf("공지사항 수정 오류: %v", err)
		}

		http.Redirect(w, r, fmt.Sprintf("/notices/detail?id=%d", id), http.StatusSeeOther)
		return
	}

	// GET: 수정 폼
	n, err := database.GetNoticeByID(id)
	if err != nil {
		log.Printf("공지사항 조회 오류: %v", err)
		http.Redirect(w, r, "/notices", http.StatusSeeOther)
		return
	}

	detail := noticeToDetail(n)

	data := EditPageData{
		BasePageData: middleware.GetBasePageData(r),
		Title:        "공지사항 수정",
		ActiveMenu:   "notices",
		Notice:       detail,
	}

	if err := Templates.ExecuteTemplate(w, "notices/edit.html", data); err != nil {
		log.Printf("템플릿 렌더링 오류: %v", err)
		http.Error(w, "페이지 렌더링 실패", http.StatusInternalServerError)
	}
}

// DeleteHandler - 공지사항/이벤트 삭제 처리
func DeleteHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Redirect(w, r, "/notices", http.StatusSeeOther)
		return
	}

	idStr := r.FormValue("id")
	id, err := strconv.Atoi(idStr)
	if err != nil {
		http.Redirect(w, r, "/notices", http.StatusSeeOther)
		return
	}

	_, err = database.DeleteNotice(id)
	if err != nil {
		log.Printf("공지사항 삭제 오류: %v", err)
	}

	http.Redirect(w, r, "/notices", http.StatusSeeOther)
}

// noticeToDetail - DB Notice를 NoticeDetail로 변환
func noticeToDetail(n *database.Notice) NoticeDetail {
	if n == nil {
		return NoticeDetail{}
	}

	categoryClass := "category-notice"
	if n.Category == "이벤트" {
		categoryClass = "category-event"
	}

	createdBy := "관리자"
	if n.CreatedBy != nil {
		createdBy = *n.CreatedBy
	}

	lastUpdateDate := ""
	if n.LastUpdateDate != nil {
		lastUpdateDate = *n.LastUpdateDate
	}

	detail := NoticeDetail{
		ID:             strconv.Itoa(n.Seq),
		BranchName:     n.BranchName,
		Title:          n.Title,
		Content:        n.Content,
		Category:       n.Category,
		CategoryClass:  categoryClass,
		IsPinned:       n.IsPinned,
		ViewCount:      n.ViewCount,
		CreatedBy:      createdBy,
		CreatedDate:    n.CreatedDate,
		LastUpdateDate: lastUpdateDate,
		HasEventDate:   n.EventStartDate != nil,
	}

	if n.EventStartDate != nil {
		detail.EventStartDate = *n.EventStartDate
	}
	if n.EventEndDate != nil {
		detail.EventEndDate = *n.EventEndDate
	}

	return detail
}
