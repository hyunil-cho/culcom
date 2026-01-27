package middleware

import (
	"backoffice/handlers/errorhandler"
	"fmt"
	"log"
	"net/http"
	"runtime/debug"
)

// RecoverMiddleware panic을 잡아서 500 에러 페이지로 보내는 미들웨어
func RecoverMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		defer func() {
			if err := recover(); err != nil {
				// 스택 트레이스 로그 출력
				log.Printf("PANIC: %v\n%s", err, debug.Stack())

				// 에러 메시지 생성
				errorMsg := fmt.Sprintf("%v", err)
				stackTrace := string(debug.Stack())

				// 500 에러 페이지 표시
				errorhandler.ShowError(w, 500,
					"서버 내부 오류가 발생했습니다",
					"예상치 못한 오류가 발생했습니다. 관리자에게 문의해주세요.",
					fmt.Sprintf("Error: %s\n\nStack Trace:\n%s", errorMsg, stackTrace))
			}
		}()

		next.ServeHTTP(w, r)
	})
}

// RecoverFunc http.HandlerFunc를 래핑하는 헬퍼 함수
// + 지점 세션 처리 및 데이터 주입 미들웨어 자동 적용
func RecoverFunc(handler http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		defer func() {
			if err := recover(); err != nil {
				log.Printf("PANIC: %v\n%s", err, debug.Stack())

				errorMsg := fmt.Sprintf("%v", err)
				stackTrace := string(debug.Stack())

				errorhandler.ShowError(w, 500,
					"서버 내부 오류가 발생했습니다",
					"예상치 못한 오류가 발생했습니다. 관리자에게 문의해주세요.",
					fmt.Sprintf("Error: %s\n\nStack Trace:\n%s", errorMsg, stackTrace))
			}
		}()

		// 지점 세션 처리 → 지점 데이터 주입 → 핸들러 실행 순서로 적용
		BranchSession(InjectBranchData(handler))(w, r)
	}
}
