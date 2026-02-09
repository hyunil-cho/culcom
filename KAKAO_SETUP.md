# 카카오 OAuth 설정 추가 필요

`.env` 파일에 다음 환경 변수를 추가하세요:

```bash
# 카카오 OAuth 설정
KAKAO_CLIENT_ID=your_kakao_rest_api_key
KAKAO_CLIENT_SECRET=your_kakao_client_secret
KAKAO_REDIRECT_URI=http://localhost:8080/ad/kakao/callback
```

## 카카오 디벨로퍼스 설정

1. [카카오 디벨로퍼스](https://developers.kakao.com/)에 접속
2. 애플리케이션 생성
3. REST API 키를 `KAKAO_CLIENT_ID`에 설정
4. 보안 > Client Secret 생성 후 `KAKAO_CLIENT_SECRET`에 설정
5. 플랫폼 설정 > Web 플랫폼 추가
6. Redirect URI 등록: `http://localhost:8080/ad/kakao/callback`
7. 동의항목 설정 **(중요)**:
   - **이름** - 필수 동의 (사용자 실명 수집)
   - **전화번호** - 필수 동의 (연락처 수집용)
   - 각 동의항목 설정 시 "수집 목적"과 "개인정보 처리방침" 링크 필수 입력
   - 예시 수집 목적: "스터디 문의 접수 및 연락을 위한 개인정보 수집"
8. 비즈니스 > 비즈 앱 전환 **(필수)**
   - 실명과 전화번호 수집을 위해서는 비즈 앱으로 전환 필요
   - 사업자등록번호 등록 필요

## 라우트

- `/ad` - 랜딩 페이지
- `/ad/kakao/login?branch={지점번호}` - 카카오 로그인 시작
- `/ad/kakao/callback` - 카카오 OAuth 콜백
