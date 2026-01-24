package utils

// Pagination 페이징 정보 구조체
type Pagination struct {
	CurrentPage  int
	TotalPages   int
	TotalItems   int
	ItemsPerPage int
	HasPrev      bool
	HasNext      bool
	Pages        []int
}

// CalculatePagination 페이징 정보를 계산하는 공통 함수
func CalculatePagination(currentPage, totalItems, itemsPerPage int) Pagination {
	// 기본값 설정
	if itemsPerPage <= 0 {
		itemsPerPage = 10
	}
	if currentPage <= 0 {
		currentPage = 1
	}

	// 전체 페이지 수 계산
	totalPages := (totalItems + itemsPerPage - 1) / itemsPerPage
	if totalPages == 0 {
		totalPages = 1
	}

	// 현재 페이지가 범위를 벗어나면 조정
	if currentPage > totalPages {
		currentPage = totalPages
	}

	// 페이지 번호 목록 생성 (최대 5개 표시)
	pages := []int{}
	startPage := currentPage - 2
	if startPage < 1 {
		startPage = 1
	}
	endPage := startPage + 4
	if endPage > totalPages {
		endPage = totalPages
		startPage = endPage - 4
		if startPage < 1 {
			startPage = 1
		}
	}
	for i := startPage; i <= endPage; i++ {
		pages = append(pages, i)
	}

	return Pagination{
		CurrentPage:  currentPage,
		TotalPages:   totalPages,
		TotalItems:   totalItems,
		ItemsPerPage: itemsPerPage,
		HasPrev:      currentPage > 1,
		HasNext:      currentPage < totalPages,
		Pages:        pages,
	}
}

// GetSliceRange 페이징에 따른 슬라이스 범위를 계산
func GetSliceRange(currentPage, itemsPerPage, totalItems int) (startIdx, endIdx int) {
	startIdx = (currentPage - 1) * itemsPerPage
	endIdx = startIdx + itemsPerPage

	if startIdx < 0 {
		startIdx = 0
	}
	if endIdx > totalItems {
		endIdx = totalItems
	}
	if startIdx > totalItems {
		startIdx = totalItems
	}

	return startIdx, endIdx
}
