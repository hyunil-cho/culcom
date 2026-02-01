package customers

import (
	"backoffice/utils"
	"fmt"
	"log"
	"net/http"
)

// ExternalCustomerRequest 외부 고객 등록 요청 구조체
type ExternalCustomerRequest struct {
	Name     string `json:"name"`
	Phone    string `json:"phone"`
	Location string `json:"location"`
	Job      string `json:"job"`
	Reading  string `json:"reading"`
	Language int    `json:"language"`
}

// ExternalRegisterCustomerHandler godoc
// @Summary      외부 고객 등록 API
// @Description  외부 시스템에서 고객 정보를 등록합니다
// @Tags         external
// @Accept       json
// @Produce      json
// @Param        request  body      ExternalCustomerRequest  true  "고객 정보"
// @Success      200      {object}  map[string]interface{}  "성공"
// @Failure      400      {string}  string  "잘못된 요청"
// @Failure      500      {string}  string  "서버 오류"
// @Router       /external/customers [post]
func ExternalRegisterCustomerHandler(w http.ResponseWriter, r *http.Request) {
	// 요청 정보 로깅
	log.Println("=== 외부 고객 등록 API 호출 ===")
	log.Printf("요청 메소드: %s", r.Method)
	log.Printf("요청 URL: %s", r.URL.String())
	log.Printf("클라이언트 IP: %s", r.RemoteAddr)
	log.Printf("User-Agent: %s", r.UserAgent())

	if r.Method != http.MethodGet {
		log.Printf("잘못된 메소드 요청: %s", r.Method)
		utils.JSONError(w, http.StatusMethodNotAllowed, "Method not allowed")
		return
	}

	// Query parameter에서 데이터 추출
	query := r.URL.Query()
	req := ExternalCustomerRequest{
		Name:     query.Get("name"),
		Phone:    query.Get("phone"),
		Location: query.Get("location"),
		Job:      query.Get("job"),
		Reading:  query.Get("reading"),
		Language: 0,
	}

	// language는 숫자이므로 변환
	if langStr := query.Get("language"); langStr != "" {
		var lang int
		if _, err := fmt.Sscanf(langStr, "%d", &lang); err == nil {
			req.Language = lang
		}
	}

	// 요청 데이터 로깅
	log.Printf("요청 데이터:")
	log.Printf("  - 이름: %s", req.Name)
	log.Printf("  - 전화번호: %s", req.Phone)
	log.Printf("  - 위치: %s", req.Location)
	log.Printf("  - 직업: %s", req.Job)
	log.Printf("  - 독서: %s", req.Reading)
	log.Printf("  - 언어: %d", req.Language)
	log.Println("==============================")

	// 성공 응답
	utils.JSONSuccess(w, map[string]interface{}{
		"message": "고객이 성공적으로 등록되었습니다",
	})
}

// validateExternalCustomerRequest 외부 고객 등록 요청 검증
