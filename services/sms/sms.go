package sms

import (
	"backoffice/config"
	"backoffice/database"
	"crypto/tls"
	"fmt"
	"io"
	"log"
	"net/http"
	"net/url"
	"strconv"
	"strings"
	"time"
)

// SendRequest SMS 발송 요청 구조체
type SendRequest struct {
	AccountID     string
	Password      string
	SenderPhone   string
	ReceiverPhone string
	Message       string
	Subject       string // LMS 제목 (선택)
}

// SendResponse SMS 발송 응답 구조체
type SendResponse struct {
	Success bool
	Message string
	Code    string
	Nums    string
	Cols    string
}

// APIResponse SMS API 응답 구조체
type APIResponse struct {
	Code string `json:"code"` // 성공 및 오류 코드
	Msg  string `json:"msg"`  // 리턴 메시지
	Nums string `json:"nums"` // 전송된 문자메시지 개수
	Cols string `json:"cols"` // 전송 후 남은 잔여콜수
	Etc1 string `json:"etc1"` // remote_etc1 리턴
	Etc2 string `json:"etc2"` // remote_etc2 리턴
}

// SmsSendRequest SMS 발송 요청 (HTTP 핸들러용)
type SmsSendRequest struct {
	AccountID     string `json:"account_id"`
	Password      string `json:"password"`
	SenderPhone   string `json:"sender_phone"`
	ReceiverPhone string `json:"receiver_phone"`
	Message       string `json:"message"`
}

// SmsSendResponse SMS 발송 응답 (HTTP 핸들러용)
type SmsSendResponse struct {
	Success bool   `json:"success"`
	Message string `json:"message"`
}

// SMS API 응답 코드 매핑 테이블
var responseCodeMessages = map[string]string{
	"0000": "전송성공",
	"0001": "접속에러",
	"0002": "인증에러",
	"0003": "잔여콜수 없음",
	"0004": "메시지 형식에러",
	"0005": "콜백번호 에러",
	"0006": "수신번호 개수 에러",
	"0007": "예약시간 에러",
	"0008": "잔여콜수 부족",
	"0009": "전송실패",
	"0010": "MMS NO IMG (이미지없음)",
	"0011": "MMS ERROR TRANSFER (이미지전송오류)",
	"0012": "메시지 길이오류(2000바이트초과)",
	"0030": "CALLBACK AUTH FAIL (발신번호 사전등록 미등록)",
	"0033": "CALLBACK TYPE FAIL (발신번호 형식에러)",
	"0080": "발송제한",
	"6666": "일시차단",
	"9999": "요금미납",
}

// getResponseMessage 응답 코드에 해당하는 메시지 반환
func getResponseMessage(code string) string {
	if msg, exists := responseCodeMessages[code]; exists {
		return msg
	}
	return "알 수 없는 오류"
}

// Send SMS/LMS 발송 함수
func Send(req SendRequest) (*SendResponse, error) {
	// Mock 모드 체크 (local 또는 test 환경)
	if config.IsMockMode() {
		log.Println("[Mock Mode] 실제 SMS 발송 없이 성공 응답 반환")
		return &SendResponse{
			Success: true,
			Message: "테스트 메시지가 발송되었습니다 (Mock)",
			Code:    "00",
			Nums:    "1",
			Cols:    "9999",
		}, nil
	}

	// 설정 로드
	cfg := config.GetConfig()

	// 메시지 바이트 길이 계산 (UTF-8 기준)
	messageBytes := []byte(req.Message)
	messageByteLength := len(messageBytes)

	// 메시지 길이에 따라 SMS/LMS 엔드포인트 결정
	// SMS: 90바이트 이내, LMS: 2000바이트 이내
	endpoint := cfg.SMS.APIBaseURL + cfg.SMS.SMSEndpoint
	isLMS := messageByteLength > cfg.SMS.MaxLength

	if isLMS {
		endpoint = cfg.SMS.APIBaseURL + cfg.SMS.LMSEndpoint
		log.Printf("LMS 발송 (메시지 바이트 길이: %d바이트, 문자 수: %d)", messageByteLength, len(req.Message))

		// LMS 바이트 제한 체크 (2000바이트)
		if messageByteLength > 2000 {
			return nil, fmt.Errorf("LMS 메시지가 너무 깁니다 (최대 2000바이트, 현재 %d바이트)", messageByteLength)
		}
	} else {
		log.Printf("SMS 발송 (메시지 바이트 길이: %d바이트, 문자 수: %d)", messageByteLength, len(req.Message))

		// SMS 바이트 제한 체크 (90바이트)
		if messageByteLength > 90 {
			return nil, fmt.Errorf("SMS 메시지가 너무 깁니다 (최대 90바이트, 현재 %d바이트)", messageByteLength)
		}
	}

	// API 요청 파라미터 구성
	formData := url.Values{}
	formData.Set("remote_id", req.AccountID)
	formData.Set("remote_pass", req.Password)
	formData.Set("remote_num", "1") // 1명에게 전송
	formData.Set("remote_phone", req.ReceiverPhone)
	formData.Set("remote_callback", req.SenderPhone)
	formData.Set("remote_msg", req.Message) // url.Values가 자동으로 URL 인코딩

	// LMS일 경우 제목 추가
	if isLMS {
		subject := req.Subject
		if subject == "" {
			subject = "안내 메시지" // 기본 제목
		}
		formData.Set("remote_subject", subject)
		log.Printf("LMS 제목: %s", subject)
	}

	log.Printf("SMS API 요청 - 수신번호: %s, 발신번호: %s, 메시지 길이: %d바이트",
		req.ReceiverPhone, req.SenderPhone, messageByteLength)
	// HTTPS 클라이언트 생성
	client := &http.Client{
		Timeout: 30 * time.Second,
		Transport: &http.Transport{
			TLSClientConfig: &tls.Config{
				InsecureSkipVerify: false, // 운영 환경에서는 false
			},
		},
	}

	// HTTP POST 요청
	resp, err := client.Post(endpoint, "application/x-www-form-urlencoded", strings.NewReader(formData.Encode()))
	if err != nil {
		log.Printf("SMS API 요청 오류: %v", err)
		return nil, fmt.Errorf("SMS 발송 중 오류가 발생했습니다: %w", err)
	}
	defer resp.Body.Close()

	// 응답 읽기
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		log.Printf("SMS API 응답 읽기 오류: %v", err)
		return nil, fmt.Errorf("SMS 응답 처리 중 오류가 발생했습니다: %w", err)
	}

	log.Printf("SMS API 응답 (Status: %d): %s", resp.StatusCode, string(body))

	// 응답 상태 코드 확인
	if resp.StatusCode != http.StatusOK {
		return &SendResponse{
			Success: false,
			Message: fmt.Sprintf("SMS 발송 실패 (HTTP %d): %s", resp.StatusCode, string(body)),
		}, nil
	}

	// API 응답 파싱 (형식: code|msg|nums|cols)
	// 예: "0000|전송 성공|3517|1"
	responseText := strings.TrimSpace(string(body))
	parts := strings.Split(responseText, "|")

	if len(parts) < 4 {
		log.Printf("SMS API 응답 형식 오류: 예상된 4개 필드, 실제 %d개 필드", len(parts))
		return nil, fmt.Errorf("SMS 응답 형식 오류: %s", responseText)
	}

	apiResp := APIResponse{
		Code: parts[0],
		Msg:  parts[1],
		Nums: parts[2],
		Cols: parts[3],
	}

	// 추가 필드가 있으면 저장
	if len(parts) > 4 {
		apiResp.Etc1 = parts[4]
	}
	if len(parts) > 5 {
		apiResp.Etc2 = parts[5]
	}

	// 응답 코드에 맞는 메시지 가져오기
	responseMessage := getResponseMessage(apiResp.Code)

	// 응답 코드로 성공/실패 판단
	log.Printf("SMS API 결과 - Code: %s, Msg: %s, Nums: %s, Cols: %s",
		apiResp.Code, responseMessage, apiResp.Nums, apiResp.Cols)

	// code가 "0000"이면 성공
	isSuccess := apiResp.Code == "0000"

	return &SendResponse{
		Success: isSuccess,
		Message: responseMessage,
		Code:    apiResp.Code,
		Nums:    apiResp.Nums,
		Cols:    apiResp.Cols,
	}, nil
}

// UpdateRemainingCount SMS 발송 후 잔여건수 업데이트
// branchSeq: 지점 seq, cols: API 응답의 잔여건수
func UpdateRemainingCount(branchSeq int, cols string) error {
	// cols를 정수로 변환
	remainingCount, err := strconv.Atoi(cols)
	if err != nil {
		log.Printf("UpdateRemainingCount - cols 변환 실패: %v", err)
		return err
	}

	// 데이터베이스 업데이트
	return database.UpdateRemainingCount(branchSeq, remainingCount)
}
