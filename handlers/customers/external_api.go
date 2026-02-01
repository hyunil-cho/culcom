package customers

import (
	"backoffice/database"
	"backoffice/utils"
	"fmt"
	"log"
	"net/http"
)

// ExternalCustomerRequest 외부 고객 등록 요청 구조체
type ExternalCustomerRequest struct {
	Name       string `json:"name"`
	Phone      string `json:"phone"`
	Location   string `json:"location"`
	Job        string `json:"job"`
	AdName     string `json:"adname"`
	AdPlatform string `json:"adplatform"`
	Language   int    `json:"language"`
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

	log.Print("요청 파라미터 추출 중...")

	// Query parameter에서 데이터 추출
	query := r.URL.Query()
	req := ExternalCustomerRequest{
		Name:       query.Get("name"),
		Phone:      query.Get("phone"),
		Location:   query.Get("location"),
		Job:        query.Get("job"),
		AdName:     query.Get("reading"),
		AdPlatform: query.Get("writing"),
		Language:   0,
	}

	log.Printf("req object is : %s", fmt.Sprintf("%+v", req))

	// language는 숫자이므로 변환
	if langStr := query.Get("language"); langStr != "" {
		var lang int
		if _, err := fmt.Sscanf(langStr, "%d", &lang); err == nil {
			req.Language = lang
		}
	}

	// 요청 데이터 로깅
	log.Printf("요청 데이터:")
	log.Printf("  - Name: %s", req.Name)
	log.Printf("  - Phone: %s", req.Phone)
	log.Printf("  - Location: %s", req.Location)
	log.Printf("  - Job: %s", req.Job)
	log.Printf("  - AdPlatform: %s", req.AdPlatform)
	log.Printf("  - AdName: %s", req.AdName)
	log.Printf("  - Language: %d", req.Language)
	log.Println("==============================")

	// 1단계: location으로 branch_seq 조회
	branchSeq, err := database.GetBranchSeqByLocation(req.Location)
	if err != nil {
		log.Printf("지점 조회 실패: %v", err)
		utils.JSONError(w, http.StatusBadRequest, "해당 위치의 지점을 찾을 수 없습니다")
		return
	}
	log.Printf("지점 조회 성공: branch_seq=%d", branchSeq)

	// 2단계: customers 테이블에 고객 등록
	customerSeq, err := database.InsertExternalCustomer(branchSeq, req.Name, req.Phone, req.Job, req.AdPlatform, req.AdName)
	if err != nil {
		log.Printf("고객 등록 실패: %v", err)
		utils.JSONError(w, http.StatusInternalServerError, "고객 등록에 실패했습니다")
		return
	}
	log.Printf("고객 등록 성공: customer_seq=%d", customerSeq)

	// 성공 응답
	utils.JSONSuccess(w, map[string]interface{}{
		"message":      "고객이 성공적으로 등록되었습니다",
		"customer_seq": customerSeq,
		"branch_seq":   branchSeq,
	})
}

// validateExternalCustomerRequest 외부 고객 등록 요청 검증
