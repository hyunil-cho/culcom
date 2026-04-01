package utils

import "net/http"

// SearchParams - 검색 파라미터를 담는 구조체
type SearchParams struct {
	SearchType    string
	SearchKeyword string
	Filter        string
}

// GetQueryParam - URL 쿼리 파라미터를 가져옵니다. 값이 없으면 기본값을 반환합니다.
func GetQueryParam(r *http.Request, key string, defaultValue string) string {
	value := r.URL.Query().Get(key)
	if value == "" {
		return defaultValue
	}
	return value
}

// GetSearchParams - 요청에서 검색 파라미터를 가져옵니다
func GetSearchParams(r *http.Request) SearchParams {
	return SearchParams{
		SearchType:    GetQueryParam(r, "searchType", "name"),
		SearchKeyword: GetQueryParam(r, "searchKeyword", ""),
		Filter:        GetQueryParam(r, "filter", ""),
	}
}
