package landing

import (
	"backoffice/config"
	"backoffice/database"
	"crypto/rand"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"net/url"
	"strconv"
	"time"
)

// 카카오 OAuth 설정
const (
	KakaoAuthURL     = "https://kauth.kakao.com/oauth/authorize"
	KakaoTokenURL    = "https://kauth.kakao.com/oauth/token"
	KakaoUserInfoURL = "https://kapi.kakao.com/v2/user/me"
)

// KakaoUserInfo 카카오 사용자 정보
type KakaoUserInfo struct {
	ID           int64                  `json:"id"`
	ConnectedAt  string                 `json:"connected_at"`
	Properties   map[string]interface{} `json:"properties"`
	KakaoAccount KakaoAccount           `json:"kakao_account"`
}

type KakaoAccount struct {
	Name                      string `json:"name"`
	PhoneNumber               string `json:"phone_number"`
	HasPhoneNumber            bool   `json:"has_phone_number"`
	PhoneNumberNeedsAgreement bool   `json:"phone_number_needs_agreement"`
}

// KakaoTokenResponse 카카오 토큰 응답
type KakaoTokenResponse struct {
	AccessToken  string `json:"access_token"`
	TokenType    string `json:"token_type"`
	RefreshToken string `json:"refresh_token"`
	ExpiresIn    int    `json:"expires_in"`
	Scope        string `json:"scope"`
}

// OAuthState state 파라미터에 포함할 데이터
type OAuthState struct {
	BranchSeq string `json:"branch_seq"`
	Timestamp int64  `json:"timestamp"`
	Random    string `json:"random"`
}

// KakaoLoginHandler 카카오 로그인 시작 (OAuth 인증 페이지로 리다이렉트)
func KakaoLoginHandler(w http.ResponseWriter, r *http.Request) {
	// 지점 정보 가져오기
	branchSeq := r.URL.Query().Get("branch")
	if branchSeq == "" {
		branchSeq = "99999"
	}

	// State 생성 (지점 정보 및 CSRF 방지용 랜덤 값 포함)
	state := generateStateWithData(branchSeq)

	// 카카오 OAuth URL 생성
	kakaoClientID := getEnv("KAKAO_CLIENT_ID", "")
	redirectURI := getEnv("KAKAO_REDIRECT_URI", "http://localhost:8080/ad/kakao/callback")

	authURL := fmt.Sprintf("%s?client_id=%s&redirect_uri=%s&response_type=code&state=%s&scope=name,phone_number",
		KakaoAuthURL,
		kakaoClientID,
		url.QueryEscape(redirectURI),
		url.QueryEscape(state),
	)

	http.Redirect(w, r, authURL, http.StatusFound)
}

// KakaoCallbackHandler 카카오 OAuth 콜백 처리
func KakaoCallbackHandler(w http.ResponseWriter, r *http.Request) {
	// 인증 코드와 state 가져오기
	code := r.URL.Query().Get("code")
	state := r.URL.Query().Get("state")

	if code == "" {
		http.Redirect(w, r, "/ad/error", http.StatusSeeOther)
		return
	}

	if state == "" {
		http.Redirect(w, r, "/ad/error", http.StatusSeeOther)
		return
	}

	// State에서 지점 정보 추출
	stateData, err := parseStateData(state)
	if err != nil {
		log.Printf("state 파싱 실패: %v", err)
		http.Redirect(w, r, "/ad/error", http.StatusSeeOther)
		return
	}

	// 타임스탬프 검증 (10분 이내)
	if time.Now().Unix()-stateData.Timestamp > 600 {
		http.Error(w, "요청이 만료되었습니다. 다시 시도해주세요.", http.StatusBadRequest)
		return
	}

	branchSeq := stateData.BranchSeq

	// 액세스 토큰 받기
	tokenResp, err := getKakaoToken(code)
	if err != nil {
		log.Printf("카카오 토큰 받기 실패: %v", err)
		http.Redirect(w, r, "/ad/error", http.StatusSeeOther)
		return
	}

	// 사용자 정보 가져오기
	userInfo, err := getKakaoUserInfo(tokenResp.AccessToken)
	if err != nil {
		log.Printf("카카오 사용자 정보 가져오기 실패: %v", err)
		http.Redirect(w, r, "/ad/error", http.StatusSeeOther)
		return
	}

	// 고객 정보를 DB에 저장 (테스트용: 닉네임 사용)
	customerName := userInfo.KakaoAccount.Name
	if customerName == "" {
		customerName = "테스트 사용자"
	}
	phoneNumber := userInfo.KakaoAccount.PhoneNumber // 테스트용 임시 전화번호

	// branchSeq를 숫자로 변환
	branchID, err := strconv.Atoi(branchSeq)
	if err != nil {
		log.Printf("지점 번호 변환 실패: %v", err)
		http.Redirect(w, r, "/ad/error", http.StatusSeeOther)
		return
	}

	// DB에 고객 등록
	_, err = database.InsertExternalCustomer(branchID, customerName, phoneNumber, "카카오", "카카오")
	if err != nil {
		log.Printf("고객 등록 실패: %v", err)
		http.Redirect(w, r, "/ad/error", http.StatusSeeOther)
		// 에러가 발생해도 계속 진행
	}

	// 고객 이름을 base64로 인코딩
	encodedName := base64.URLEncoding.EncodeToString([]byte(customerName))

	// 성공 페이지로 리다이렉트 (인코딩된 파라미터 전달)
	http.Redirect(w, r, "/ad/success?data="+encodedName, http.StatusSeeOther)
}

// getKakaoToken 인증 코드로 액세스 토큰 받기
func getKakaoToken(code string) (*KakaoTokenResponse, error) {
	kakaoClientID := getEnv("KAKAO_CLIENT_ID", "")
	kakaoClientSecret := getEnv("KAKAO_CLIENT_SECRET", "")
	redirectURI := getEnv("KAKAO_REDIRECT_URI", "http://localhost:8080/ad/kakao/callback")

	data := url.Values{}
	data.Set("grant_type", "authorization_code")
	data.Set("client_id", kakaoClientID)
	data.Set("client_secret", kakaoClientSecret)
	data.Set("redirect_uri", redirectURI)
	data.Set("code", code)

	resp, err := http.PostForm(KakaoTokenURL, data)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("카카오 토큰 요청 실패: %s", string(body))
	}

	var tokenResp KakaoTokenResponse
	if err := json.Unmarshal(body, &tokenResp); err != nil {
		return nil, err
	}

	return &tokenResp, nil
}

// getKakaoUserInfo 액세스 토큰으로 사용자 정보 가져오기
func getKakaoUserInfo(accessToken string) (*KakaoUserInfo, error) {
	req, err := http.NewRequest("GET", KakaoUserInfoURL, nil)
	if err != nil {
		return nil, err
	}

	req.Header.Set("Authorization", "Bearer "+accessToken)

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("사용자 정보 요청 실패: %s", string(body))
	}

	var userInfo KakaoUserInfo
	if err := json.Unmarshal(body, &userInfo); err != nil {
		return nil, err
	}

	return &userInfo, nil
}

// generateState CSRF 방지용 랜덤 state 생성
func generateState() string {
	b := make([]byte, 32)
	rand.Read(b)
	return base64.URLEncoding.EncodeToString(b)
}

// generateStateWithData 지점 정보를 포함한 state 생성
func generateStateWithData(branchSeq string) string {
	stateData := OAuthState{
		BranchSeq: branchSeq,
		Timestamp: time.Now().Unix(),
		Random:    generateRandomString(16),
	}

	jsonData, err := json.Marshal(stateData)
	if err != nil {
		log.Printf("state JSON 생성 실패: %v", err)
		return generateRandomString(32)
	}

	return base64.URLEncoding.EncodeToString(jsonData)
}

// parseStateData state에서 데이터 추출
func parseStateData(state string) (*OAuthState, error) {
	decoded, err := base64.URLEncoding.DecodeString(state)
	if err != nil {
		return nil, fmt.Errorf("base64 디코딩 실패: %w", err)
	}

	var stateData OAuthState
	if err := json.Unmarshal(decoded, &stateData); err != nil {
		return nil, fmt.Errorf("JSON 파싱 실패: %w", err)
	}

	return &stateData, nil
}

// generateRandomString 랜덤 문자열 생성
func generateRandomString(length int) string {
	b := make([]byte, length)
	rand.Read(b)
	return base64.URLEncoding.EncodeToString(b)[:length]
}

// generateState CSRF 방지용 랜덤 state 생성 (하위 호환성)ring(b)

// getEnv 환경 변수 가져오기 (기본값 포함)
func getEnv(key, defaultValue string) string {
	cfg := config.GetConfig()
	switch key {
	case "KAKAO_CLIENT_ID":
		if cfg.KakaoOAuth.ClientID != "" {
			return cfg.KakaoOAuth.ClientID
		}
	case "KAKAO_CLIENT_SECRET":
		if cfg.KakaoOAuth.ClientSecret != "" {
			return cfg.KakaoOAuth.ClientSecret
		}
	case "KAKAO_REDIRECT_URI":
		if cfg.KakaoOAuth.RedirectURI != "" {
			return cfg.KakaoOAuth.RedirectURI
		}
	}
	return defaultValue
}
