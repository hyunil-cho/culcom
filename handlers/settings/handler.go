package settings

import (
	"backoffice/database"
	"backoffice/middleware"
	"html/template"
	"log"
	"net/http"
)

var Templates *template.Template

// Handler 설정 메인 페이지
func Handler(w http.ResponseWriter, r *http.Request) {
	branchAlias := middleware.GetSelectedBranchAlias(r)

	data := PageData{
		BasePageData: middleware.GetBasePageData(r),
		Title:        "설정",
		ActiveMenu:   "settings",
		BranchCode:   branchAlias,
	}

	Templates.ExecuteTemplate(w, "settings/main.html", data)
}

// ReservationSMSConfigHandler 예약 확정 시 기본 문자 발송 설정 페이지
func ReservationSMSConfigHandler(w http.ResponseWriter, r *http.Request) {
	branchSeq := middleware.GetSelectedBranch(r)

	if r.Method == http.MethodGet {
		// 메시지 템플릿 목록 조회
		templates, err := database.GetMessageTemplates(branchSeq)
		if err != nil {
			log.Printf("템플릿 조회 오류: %v", err)
			templates = []database.MessageTemplate{}
		}

		// SMS 발신번호 목록 조회
		senderNumbers, err := database.GetSMSSenderNumbers(branchSeq)
		if err != nil {
			log.Printf("발신번호 조회 오류: %v", err)
			senderNumbers = []string{}
		}

		// 현재 설정 조회
		config, err := database.GetReservationSMSConfig(branchSeq)
		if err != nil {
			log.Printf("설정 조회: 저장된 설정이 없습니다 (신규 설정)")
			config = nil
		}

		data := ReservationSMSConfigPageData{
			BasePageData:  middleware.GetBasePageData(r),
			Title:         "예약 확정 시 기본 문자 발송 설정",
			ActiveMenu:    "settings",
			Templates:     templates,
			SenderNumbers: senderNumbers,
			Config:        config,
		}

		err = Templates.ExecuteTemplate(w, "settings/reservation-sms-config.html", data)
		if err != nil {
			log.Printf("템플릿 실행 오류: %v", err)
			http.Error(w, "템플릿 렌더링 오류", http.StatusInternalServerError)
		}
		return
	}

	if r.Method == http.MethodPost {
		// 설정 저장
		err := r.ParseForm()
		if err != nil {
			log.Printf("폼 파싱 오류: %v", err)
			http.Error(w, "잘못된 요청입니다", http.StatusBadRequest)
			return
		}

		templateSeq := r.FormValue("template_seq")
		senderNumber := r.FormValue("sender_number")
		autoSend := r.FormValue("auto_send") == "on"

		log.Printf("예약 SMS 설정 저장: template_seq=%s, sender_number=%s, auto_send=%v", templateSeq, senderNumber, autoSend)

		// 필수 필드 검증
		if templateSeq == "" || senderNumber == "" {
			log.Printf("필수 필드 누락")
			http.Redirect(w, r, "/settings/reservation-sms?error=required", http.StatusSeeOther)
			return
		}

		// DB에 저장
		err = database.SaveReservationSMSConfig(branchSeq, templateSeq, senderNumber, autoSend)
		if err != nil {
			log.Printf("설정 저장 오류: %v", err)
			http.Redirect(w, r, "/settings/reservation-sms?error=save_failed", http.StatusSeeOther)
			return
		}

		log.Printf("예약 SMS 설정 저장 완료")
		http.Redirect(w, r, "/settings/reservation-sms?success=saved", http.StatusSeeOther)
		return
	}

	http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
}

// PageData 설정 페이지 데이터
type PageData struct {
	middleware.BasePageData
	Title      string
	ActiveMenu string
	BranchCode string
}

// ReservationSMSConfigPageData 예약 SMS 설정 페이지 데이터
type ReservationSMSConfigPageData struct {
	middleware.BasePageData
	Title         string
	ActiveMenu    string
	Templates     []database.MessageTemplate
	SenderNumbers []string
	Config        *database.ReservationSMSConfig
}
