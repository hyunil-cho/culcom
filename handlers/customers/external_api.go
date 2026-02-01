package customers

import (
	"backoffice/utils"
	"encoding/json"
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
	if r.Method != http.MethodPost {
		utils.JSONError(w, http.StatusMethodNotAllowed, "Method not allowed")
		return
	}

	// JSON 요청 파싱
	var req ExternalCustomerRequest
	err := json.NewDecoder(r.Body).Decode(&req)
	if err != nil {
		log.Printf("외부 고객 등록 - 요청 파싱 오류: %v", err)
		utils.JSONError(w, http.StatusBadRequest, "잘못된 요청 형식입니다")
		return
	}

	// 요청 로깅
	log.Printf("=== 외부 고객 등록 요청 ===")
	log.Printf("이름: %s", req.Name)
	log.Printf("전화번호: %s", req.Phone)
	log.Printf("위치: %s", req.Location)
	log.Printf("직업: %s", req.Job)
	log.Printf("독서: %s", req.Reading)
	log.Printf("언어: %d", req.Language)
	log.Println("========================")

	// 성공 응답
	utils.JSONSuccess(w, map[string]interface{}{
		"message": "고객이 성공적으로 등록되었습니다",
	})
}

// validateExternalCustomerRequest 외부 고객 등록 요청 검증
