package board

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
	"strings"
	"time"
)

// 카카오 OAuth 설정
const (
	kakaoAuthURL     = "https://kauth.kakao.com/oauth/authorize"
	kakaoTokenURL    = "https://kauth.kakao.com/oauth/token"
	kakaoUserInfoURL = "https://kapi.kakao.com/v2/user/me"
	kakaoUnlinkURL   = "https://kapi.kakao.com/v1/user/unlink"
)

type boardOAuthState struct {
	Source    string `json:"source"` // "board"
	BranchSeq string `json:"branch_seq,omitempty"`
	Timestamp int64  `json:"timestamp"`
	Random    string `json:"random"`
}

type kakaoTokenResponse struct {
	AccessToken  string `json:"access_token"`
	TokenType    string `json:"token_type"`
	RefreshToken string `json:"refresh_token"`
	ExpiresIn    int    `json:"expires_in"`
	Scope        string `json:"scope"`
}

type kakaoUserInfo struct {
	ID           int64                  `json:"id"`
	ConnectedAt  string                 `json:"connected_at"`
	Properties   map[string]interface{} `json:"properties"`
	KakaoAccount kakaoAccount           `json:"kakao_account"`
}

type kakaoAccount struct {
	Name                      string `json:"name"`
	PhoneNumber               string `json:"phone_number"`
	HasPhoneNumber            bool   `json:"has_phone_number"`
	PhoneNumberNeedsAgreement bool   `json:"phone_number_needs_agreement"`
}

// KakaoLoginHandler - 공개 게시판용 카카오 로그인 시작
func KakaoLoginHandler(w http.ResponseWriter, r *http.Request) {
	branchSeq := r.URL.Query().Get("branch")
	log.Printf("카카오 로그인 요청 - branch: %s", branchSeq)
	state := generateBoardState(branchSeq)
	cfg := config.GetConfig()
	kakaoClientID := cfg.KakaoOAuth.ClientID
	redirectURI := cfg.KakaoOAuth.RedirectURI

	// 콜백 URI를 board용으로 변경
	// 기존 /ad/kakao/callback → /board/kakao/callback
	if redirectURI != "" {
		// 기존 redirectURI에서 path만 교체
		u, err := url.Parse(redirectURI)
		if err == nil {
			u.Path = "/board/kakao/callback"
			redirectURI = u.String()
		}
	} else {
		redirectURI = "http://localhost:8080/board/kakao/callback"
	}

	authURL := fmt.Sprintf("%s?client_id=%s&redirect_uri=%s&response_type=code&state=%s&scope=name,phone_number",
		kakaoAuthURL,
		kakaoClientID,
		url.QueryEscape(redirectURI),
		url.QueryEscape(state),
	)

	http.Redirect(w, r, authURL, http.StatusFound)
}

// KakaoCallbackHandler - 공개 게시판용 카카오 OAuth 콜백 처리
func KakaoCallbackHandler(w http.ResponseWriter, r *http.Request) {
	code := r.URL.Query().Get("code")
	stateParam := r.URL.Query().Get("state")

	if code == "" || stateParam == "" {
		log.Printf("카카오 콜백 - code 또는 state 누락")
		http.Redirect(w, r, "/?error=login_failed", http.StatusSeeOther)
		return
	}

	// State 검증
	stateData, err := parseBoardState(stateParam)
	if err != nil {
		log.Printf("state 파싱 실패: %v", err)
		http.Redirect(w, r, "/?error=login_failed", http.StatusSeeOther)
		return
	}

	if stateData.Source != "board" {
		log.Printf("잘못된 state source: %s", stateData.Source)
		http.Redirect(w, r, "/?error=login_failed", http.StatusSeeOther)
		return
	}

	// 타임스탬프 검증 (10분 이내)
	if time.Now().Unix()-stateData.Timestamp > 600 {
		log.Printf("카카오 콜백 - state 만료")
		http.Redirect(w, r, "/?error=login_expired", http.StatusSeeOther)
		return
	}

	// 액세스 토큰 받기
	cfg := config.GetConfig()
	redirectURI := cfg.KakaoOAuth.RedirectURI
	if redirectURI != "" {
		u, err := url.Parse(redirectURI)
		if err == nil {
			u.Path = "/board/kakao/callback"
			redirectURI = u.String()
		}
	} else {
		redirectURI = "http://localhost:8080/board/kakao/callback"
	}

	tokenResp, err := getBoardKakaoToken(code, redirectURI)
	if err != nil {
		log.Printf("카카오 토큰 받기 실패: %v", err)
		http.Redirect(w, r, "/?error=login_failed", http.StatusSeeOther)
		return
	}

	// 사용자 정보 가져오기
	userInfo, err := getBoardKakaoUserInfo(tokenResp.AccessToken)
	if err != nil {
		log.Printf("카카오 사용자 정보 가져오기 실패: %v", err)
		http.Redirect(w, r, "/?error=login_failed", http.StatusSeeOther)
		return
	}

	// 회원 정보 DB에 저장/업데이트
	memberName := userInfo.KakaoAccount.Name
	if memberName == "" {
		// Properties에서 nickname 가져오기
		if nickname, ok := userInfo.Properties["nickname"].(string); ok {
			memberName = nickname
		} else {
			memberName = "카카오 사용자"
		}
	}
	phoneNumber := userInfo.KakaoAccount.PhoneNumber

	// state에 지점 정보가 있으면 사용, 없으면 기본값
	branchSeq := 99999 // 기본 지점 (카카오 로그인용)
	if stateData.BranchSeq != "" {
		if parsed, convErr := strconv.Atoi(stateData.BranchSeq); convErr == nil {
			branchSeq = parsed
		}
	}

	memberSeq, err := database.UpsertKakaoCustomer(branchSeq, userInfo.ID, memberName, phoneNumber)
	if err != nil {
		log.Printf("카카오 고객 등록/업데이트 실패: %v", err)
		http.Redirect(w, r, "/?error=login_failed", http.StatusSeeOther)
		return
	}

	// 세션에 회원 정보 저장
	session, err := config.SessionStore.Get(r, "board-session")
	if err != nil {
		log.Printf("세션 가져오기 실패: %v", err)
		http.Redirect(w, r, "/?error=login_failed", http.StatusSeeOther)
		return
	}

	session.Values["member_seq"] = memberSeq
	session.Values["member_name"] = memberName
	session.Values["board_authenticated"] = true

	if err := session.Save(r, w); err != nil {
		log.Printf("세션 저장 실패: %v", err)
		http.Redirect(w, r, "/?error=login_failed", http.StatusSeeOther)
		return
	}

	log.Printf("카카오 회원 로그인 성공 - seq: %d, 이름: %s", memberSeq, memberName)

	// 게시판 메인으로 리다이렉트
	http.Redirect(w, r, "/", http.StatusSeeOther)
}

// BoardLogoutHandler - 공개 게시판 로그아웃
func BoardLogoutHandler(w http.ResponseWriter, r *http.Request) {
	session, err := config.SessionStore.Get(r, "board-session")
	if err == nil {
		session.Options.MaxAge = -1
		session.Save(r, w)
	}
	http.Redirect(w, r, "/", http.StatusSeeOther)
}

// GetBoardSession - 게시판 세션에서 회원 정보 가져오기
func GetBoardSession(r *http.Request) (isLoggedIn bool, memberSeq int, memberName string) {
	session, err := config.SessionStore.Get(r, "board-session")
	if err != nil {
		return false, 0, ""
	}

	authenticated, ok := session.Values["board_authenticated"].(bool)
	if !ok || !authenticated {
		return false, 0, ""
	}

	seq, ok := session.Values["member_seq"].(int)
	if !ok {
		return false, 0, ""
	}

	name, _ := session.Values["member_name"].(string)
	return true, seq, name
}

// UnlinkKakaoUser - 카카오 연결 끊기 (회원탈퇴 시 호출)
// Admin Key를 사용하여 서버에서 직접 카카오 연결을 해제합니다.
// 참고: https://developers.kakao.com/docs/latest/ko/kakaologin/rest-api#unlink
func UnlinkKakaoUser(kakaoID int64) error {
	cfg := config.GetConfig()
	adminKey := cfg.KakaoOAuth.AdminKey

	if adminKey == "" {
		return fmt.Errorf("KAKAO_ADMIN_KEY가 설정되지 않았습니다")
	}

	if kakaoID == 0 {
		return fmt.Errorf("카카오 ID가 유효하지 않습니다")
	}

	data := url.Values{}
	data.Set("target_id_type", "user_id")
	data.Set("target_id", strconv.FormatInt(kakaoID, 10))

	req, err := http.NewRequest("POST", kakaoUnlinkURL, strings.NewReader(data.Encode()))
	if err != nil {
		return fmt.Errorf("unlink 요청 생성 실패: %w", err)
	}

	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	req.Header.Set("Authorization", "KakaoAK "+adminKey)

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return fmt.Errorf("unlink API 호출 실패: %w", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return fmt.Errorf("unlink 응답 읽기 실패: %w", err)
	}

	if resp.StatusCode != http.StatusOK {
		log.Printf("카카오 unlink 실패 - status: %d, body: %s, kakao_id: %d", resp.StatusCode, string(body), kakaoID)
		return fmt.Errorf("카카오 unlink API 실패 (status: %d): %s", resp.StatusCode, string(body))
	}

	log.Printf("카카오 unlink 성공 - kakao_id: %d, response: %s", kakaoID, string(body))
	return nil
}

// --- 내부 헬퍼 함수 ---

func generateBoardState(branchSeq string) string {
	stateData := boardOAuthState{
		Source:    "board",
		BranchSeq: branchSeq,
		Timestamp: time.Now().Unix(),
		Random:    generateBoardRandomString(16),
	}

	jsonData, err := json.Marshal(stateData)
	if err != nil {
		return generateBoardRandomString(32)
	}

	return base64.URLEncoding.EncodeToString(jsonData)
}

func parseBoardState(state string) (*boardOAuthState, error) {
	decoded, err := base64.URLEncoding.DecodeString(state)
	if err != nil {
		return nil, fmt.Errorf("base64 디코딩 실패: %w", err)
	}

	var stateData boardOAuthState
	if err := json.Unmarshal(decoded, &stateData); err != nil {
		return nil, fmt.Errorf("JSON 파싱 실패: %w", err)
	}

	return &stateData, nil
}

func generateBoardRandomString(length int) string {
	b := make([]byte, length)
	rand.Read(b)
	return base64.URLEncoding.EncodeToString(b)[:length]
}

func getBoardKakaoToken(code, redirectURI string) (*kakaoTokenResponse, error) {
	cfg := config.GetConfig()
	kakaoClientID := cfg.KakaoOAuth.ClientID
	kakaoClientSecret := cfg.KakaoOAuth.ClientSecret

	data := url.Values{}
	data.Set("grant_type", "authorization_code")
	data.Set("client_id", kakaoClientID)
	data.Set("client_secret", kakaoClientSecret)
	data.Set("redirect_uri", redirectURI)
	data.Set("code", code)

	resp, err := http.PostForm(kakaoTokenURL, data)
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

	var tokenResp kakaoTokenResponse
	if err := json.Unmarshal(body, &tokenResp); err != nil {
		return nil, err
	}

	return &tokenResp, nil
}

func getBoardKakaoUserInfo(accessToken string) (*kakaoUserInfo, error) {
	req, err := http.NewRequest("GET", kakaoUserInfoURL, nil)
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

	var userInfo kakaoUserInfo
	if err := json.Unmarshal(body, &userInfo); err != nil {
		return nil, err
	}

	return &userInfo, nil
}
