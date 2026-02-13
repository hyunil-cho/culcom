# Patches Directory

이 디렉토리는 시스템의 버그 수정, 개선사항, 기능 업데이트에 대한 릴리스 노트와 패치 문서를 포함합니다.

## 📋 릴리스 목록

### v1.1.0 (2026-02-13)
**타입:** Bug Fix & Refactoring

### 요청사항
<백오피스 에러 수정 요청>
1. 자동문자 발신 시, 수정된 이름 데이터가 반영되지 않음. 
2. 구글캘린더 팝업 생성 시, 수정된 이름 데이터가 반영되지 않음
3. 작업 중 ‘전화상 안함’ 버튼을 눌러 완료 상태로 상태를 변경하였을 시, ”누적콜수“ 콜럼의 값이 자동으로 5회로 변경됨

**주요 변경사항:**
- ✅ 고객 이름 변경 시 데이터 동기화 문제 해결
- ✅ 단일 진실의 원천(Single Source of Truth) 패턴 적용
- ✅ 함수 시그니처 단순화 및 코드 품질 개선

**상세 내역:** [RELEASE_NOTES_v1.1.0.md](./RELEASE_NOTES_v1.1.0.md)

---

## 📌 패치 작성 가이드

새로운 패치나 릴리스 노트를 추가할 때는 다음 형식을 따라주세요:

### 파일명 규칙
```
RELEASE_NOTES_v{major}.{minor}.{patch}.md
```

### 필수 섹션
1. **변경 사항 요약** - 한 문장으로 요약
2. **버그 수정** - 수정된 버그 목록
3. **리팩토링** - 코드 개선 사항
4. **새 기능** - 추가된 기능 (있는 경우)
5. **테스트 시나리오** - 검증 방법
6. **Breaking Changes** - 하위 호환성 관련

---

## 🔖 버전 관리 정책

### Semantic Versioning (SemVer)

- **Major (X.0.0):** Breaking Changes - 하위 호환성이 깨지는 변경
- **Minor (0.X.0):** 새로운 기능 추가 (하위 호환성 유지)
- **Patch (0.0.X):** 버그 수정 및 작은 개선

### 현재 버전
**v1.1.0**

### 버전 확인 방법

1. **VERSION 파일**: 프로젝트 루트의 `VERSION` 파일 확인
2. **실행 로그**: 애플리케이션 시작 시 콘솔에 버전 정보 출력
3. **API 엔드포인트**: 
   - `GET /api/version` - 상세 버전 정보
   - `GET /health` - 헬스 체크 (간단한 버전 포함)

자세한 버전 관리 및 빌드 방법은 [BUILD.md](../BUILD.md)를 참고하세요.

---

## 📦 빌드 및 배포

### 빌드 스크립트 사용

```powershell
# PowerShell
.\build.ps1
```

```bash
# Linux/Mac
chmod +x build.sh
./build.sh
```

### 수동 빌드

```bash
# VERSION 파일의 버전 정보로 빌드
go build -o culcom.exe

# 상세 버전 정보를 포함한 빌드
go build -ldflags "-X 'backoffice/config.Version=1.1.0' ..." -o culcom.exe
```

자세한 내용은 [BUILD.md](../BUILD.md)를 참고하세요.

---

## 📞 문의

패치나 릴리스 노트에 대한 질문이 있으시면 개발팀에 문의해주세요.
