package index

import (
	"backoffice/middleware"
)

type PageData struct {
	middleware.BasePageData
	Title               string
	ActiveMenu          string
	AdminName           string
	AttendanceStatsJSON string // 그래프용 JSON 데이터
}
