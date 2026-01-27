package database

import (
	"log"
	"time"
)

// MessageTemplate 메시지 템플릿
type MessageTemplate struct {
	ID          int
	Name        string
	Content     string
	Description string
	IsActive    bool
	IsDefault   bool
	CreatedAt   time.Time
	UpdatedAt   time.Time
}

// Placeholder 플레이스홀더
type Placeholder struct {
	Key         string
	Label       string
	Description string
	Example     string
}

// GetMessageTemplates 메시지 템플릿 목록 조회 (더미 데이터)
func GetMessageTemplates(branchCode string) ([]MessageTemplate, error) {
	log.Printf("[MessageTemplate] GetMessageTemplates 호출 - BranchCode: %s (더미 데이터 반환)\n", branchCode)

	// 더미 데이터 (20개)
	templates := []MessageTemplate{
		{
			ID:          1,
			Name:        "예약 확인 메시지",
			Content:     "{이름}님, {날짜} {시간}에 {지점명} 예약이 완료되었습니다.",
			Description: "고객 예약 확인용 메시지",
			IsActive:    true,
			IsDefault:   true,
			CreatedAt:   time.Now().Add(-480 * time.Hour),
			UpdatedAt:   time.Now().Add(-480 * time.Hour),
		},
		{
			ID:          2,
			Name:        "결제 완료 안내",
			Content:     "{이름}님, {금액}원 결제가 완료되었습니다. 감사합니다.",
			Description: "결제 완료 시 발송되는 메시지",
			IsActive:    true,
			IsDefault:   false,
			CreatedAt:   time.Now().Add(-456 * time.Hour),
			UpdatedAt:   time.Now().Add(-456 * time.Hour),
		},
		{
			ID:          3,
			Name:        "예약 리마인더",
			Content:     "{이름}님, 내일 {시간}에 {지점명} 예약이 있습니다.",
			Description: "예약 하루 전 발송되는 알림",
			IsActive:    true,
			IsDefault:   false,
			CreatedAt:   time.Now().Add(-432 * time.Hour),
			UpdatedAt:   time.Now().Add(-432 * time.Hour),
		},
		{
			ID:          4,
			Name:        "예약 취소 확인",
			Content:     "{이름}님, {날짜} {시간} 예약이 취소되었습니다.",
			Description: "예약 취소 시 발송되는 메시지",
			IsActive:    true,
			IsDefault:   false,
			CreatedAt:   time.Now().Add(-408 * time.Hour),
			UpdatedAt:   time.Now().Add(-408 * time.Hour),
		},
		{
			ID:          5,
			Name:        "신규 회원 환영",
			Content:     "{이름}님, 회원가입을 환영합니다! 첫 구매 시 10% 할인 혜택을 드립니다.",
			Description: "신규 회원 가입 시 환영 메시지",
			IsActive:    true,
			IsDefault:   false,
			CreatedAt:   time.Now().Add(-384 * time.Hour),
			UpdatedAt:   time.Now().Add(-384 * time.Hour),
		},
		{
			ID:          6,
			Name:        "생일 축하 메시지",
			Content:     "{이름}님, 생일을 진심으로 축하드립니다! 특별한 쿠폰을 선물로 드립니다.",
			Description: "고객 생일 축하 메시지",
			IsActive:    true,
			IsDefault:   false,
			CreatedAt:   time.Now().Add(-360 * time.Hour),
			UpdatedAt:   time.Now().Add(-360 * time.Hour),
		},
		{
			ID:          7,
			Name:        "이벤트 안내",
			Content:     "[{지점명}] {이름}님께 특별한 혜택을 드립니다. {이벤트내용}",
			Description: "프로모션 및 이벤트 안내용",
			IsActive:    true,
			IsDefault:   false,
			CreatedAt:   time.Now().Add(-336 * time.Hour),
			UpdatedAt:   time.Now().Add(-336 * time.Hour),
		},
		{
			ID:          8,
			Name:        "결제 실패 안내",
			Content:     "{이름}님, 결제 처리 중 오류가 발생했습니다. 다시 시도해주세요.",
			Description: "결제 실패 시 안내 메시지",
			IsActive:    true,
			IsDefault:   false,
			CreatedAt:   time.Now().Add(-312 * time.Hour),
			UpdatedAt:   time.Now().Add(-312 * time.Hour),
		},
		{
			ID:          9,
			Name:        "포인트 적립 알림",
			Content:     "{이름}님, {금액}원 구매로 {포인트}P가 적립되었습니다.",
			Description: "포인트 적립 완료 알림",
			IsActive:    true,
			IsDefault:   false,
			CreatedAt:   time.Now().Add(-288 * time.Hour),
			UpdatedAt:   time.Now().Add(-288 * time.Hour),
		},
		{
			ID:          10,
			Name:        "예약 변경 확인",
			Content:     "{이름}님, 예약이 {날짜} {시간}으로 변경되었습니다.",
			Description: "예약 변경 시 발송되는 메시지",
			IsActive:    true,
			IsDefault:   false,
			CreatedAt:   time.Now().Add(-264 * time.Hour),
			UpdatedAt:   time.Now().Add(-264 * time.Hour),
		},
		{
			ID:          11,
			Name:        "서비스 완료 안내",
			Content:     "{이름}님, {지점명}에서 서비스가 완료되었습니다. 이용해 주셔서 감사합니다.",
			Description: "서비스 완료 후 발송 메시지",
			IsActive:    true,
			IsDefault:   false,
			CreatedAt:   time.Now().Add(-240 * time.Hour),
			UpdatedAt:   time.Now().Add(-240 * time.Hour),
		},
		{
			ID:          12,
			Name:        "문의 접수 확인",
			Content:     "{이름}님, 문의가 접수되었습니다. 빠른 시일 내에 답변 드리겠습니다.",
			Description: "고객 문의 접수 확인 메시지",
			IsActive:    true,
			IsDefault:   false,
			CreatedAt:   time.Now().Add(-216 * time.Hour),
			UpdatedAt:   time.Now().Add(-216 * time.Hour),
		},
		{
			ID:          13,
			Name:        "배송 시작 알림",
			Content:     "{이름}님, 주문하신 상품이 배송 시작되었습니다. 송장번호: {송장번호}",
			Description: "상품 배송 시작 알림",
			IsActive:    true,
			IsDefault:   false,
			CreatedAt:   time.Now().Add(-192 * time.Hour),
			UpdatedAt:   time.Now().Add(-192 * time.Hour),
		},
		{
			ID:          14,
			Name:        "배송 완료 알림",
			Content:     "{이름}님, 상품이 배송 완료되었습니다. 확인 부탁드립니다.",
			Description: "상품 배송 완료 알림",
			IsActive:    true,
			IsDefault:   false,
			CreatedAt:   time.Now().Add(-168 * time.Hour),
			UpdatedAt:   time.Now().Add(-168 * time.Hour),
		},
		{
			ID:          15,
			Name:        "쿠폰 발급 알림",
			Content:     "{이름}님께 {쿠폰명} 쿠폰이 발급되었습니다. 유효기간: {날짜}",
			Description: "쿠폰 발급 시 알림 메시지",
			IsActive:    true,
			IsDefault:   false,
			CreatedAt:   time.Now().Add(-144 * time.Hour),
			UpdatedAt:   time.Now().Add(-144 * time.Hour),
		},
		{
			ID:          16,
			Name:        "멤버십 등급 변경",
			Content:     "{이름}님, 축하드립니다! 멤버십 등급이 {등급}으로 상향되었습니다.",
			Description: "멤버십 등급 변경 안내",
			IsActive:    false,
			IsDefault:   false,
			CreatedAt:   time.Now().Add(-120 * time.Hour),
			UpdatedAt:   time.Now().Add(-120 * time.Hour),
		},
		{
			ID:          17,
			Name:        "재입고 알림",
			Content:     "{이름}님, 관심 상품 [{상품명}]이 재입고되었습니다.",
			Description: "상품 재입고 알림 메시지",
			IsActive:    false,
			IsDefault:   false,
			CreatedAt:   time.Now().Add(-96 * time.Hour),
			UpdatedAt:   time.Now().Add(-96 * time.Hour),
		},
		{
			ID:          18,
			Name:        "리뷰 작성 요청",
			Content:     "{이름}님, 구매하신 상품은 만족하셨나요? 리뷰를 남겨주시면 {포인트}P를 드립니다.",
			Description: "구매 후 리뷰 작성 요청",
			IsActive:    false,
			IsDefault:   false,
			CreatedAt:   time.Now().Add(-72 * time.Hour),
			UpdatedAt:   time.Now().Add(-72 * time.Hour),
		},
		{
			ID:          19,
			Name:        "비밀번호 변경 확인",
			Content:     "{이름}님, 비밀번호가 성공적으로 변경되었습니다. 본인이 아니라면 즉시 고객센터로 연락주세요.",
			Description: "비밀번호 변경 완료 알림",
			IsActive:    false,
			IsDefault:   false,
			CreatedAt:   time.Now().Add(-48 * time.Hour),
			UpdatedAt:   time.Now().Add(-48 * time.Hour),
		},
		{
			ID:          20,
			Name:        "서비스 점검 안내",
			Content:     "{날짜} {시간}부터 시스템 점검이 예정되어 있습니다. 이용에 불편을 드려 죄송합니다.",
			Description: "시스템 점검 사전 안내",
			IsActive:    false,
			IsDefault:   false,
			CreatedAt:   time.Now().Add(-24 * time.Hour),
			UpdatedAt:   time.Now().Add(-24 * time.Hour),
		},
	}

	return templates, nil
}

// GetPlaceholders 플레이스홀더 목록 조회 (더미 데이터)
func GetPlaceholders() ([]Placeholder, error) {
	log.Println("[Placeholder] GetPlaceholders 호출 - 더미 데이터 반환")

	placeholders := []Placeholder{
		{Key: "{이름}", Label: "고객 이름", Description: "고객의 이름", Example: "홍길동"},
		{Key: "{날짜}", Label: "날짜", Description: "예약 또는 이벤트 날짜", Example: "2024년 1월 23일"},
		{Key: "{시간}", Label: "시간", Description: "예약 시간", Example: "14:00"},
		{Key: "{지점명}", Label: "지점명", Description: "서비스 제공 지점", Example: "강남점"},
		{Key: "{금액}", Label: "금액", Description: "결제 또는 청구 금액", Example: "50,000"},
		{Key: "{전화번호}", Label: "전화번호", Description: "고객 전화번호", Example: "010-1234-5678"},
		{Key: "{이메일}", Label: "이메일", Description: "고객 이메일", Example: "customer@example.com"},
		{Key: "{주소}", Label: "주소", Description: "고객 주소", Example: "서울시 강남구"},
		{Key: "{이벤트내용}", Label: "이벤트 내용", Description: "이벤트 상세 내용", Example: "20% 할인 쿠폰"},
		{Key: "{담당자}", Label: "담당자", Description: "담당 직원 이름", Example: "김매니저"},
		{Key: "{포인트}", Label: "포인트", Description: "적립/사용 포인트", Example: "1,000"},
		{Key: "{쿠폰명}", Label: "쿠폰명", Description: "쿠폰 이름", Example: "신규회원 할인쿠폰"},
		{Key: "{등급}", Label: "등급", Description: "멤버십 등급", Example: "VIP"},
		{Key: "{상품명}", Label: "상품명", Description: "상품 이름", Example: "프리미엄 패키지"},
		{Key: "{송장번호}", Label: "송장번호", Description: "배송 송장번호", Example: "1234567890"},
	}

	return placeholders, nil
}

// GetMessageTemplateByID 특정 메시지 템플릿 조회 (더미 데이터)
func GetMessageTemplateByID(id int) (*MessageTemplate, error) {
	log.Printf("[MessageTemplate] GetMessageTemplateByID 호출 - ID: %d (더미 데이터 반환)\n", id)

	// 간단히 첫 번째 템플릿 반환
	template := &MessageTemplate{
		ID:          id,
		Name:        "예약 확인 메시지",
		Content:     "{이름}님, {날짜} {시간}에 {지점명} 예약이 완료되었습니다.",
		Description: "고객 예약 확인용 메시지",
		IsActive:    true,
		IsDefault:   true,
		CreatedAt:   time.Now().Add(-240 * time.Hour),
		UpdatedAt:   time.Now().Add(-240 * time.Hour),
	}

	return template, nil
}

// SaveMessageTemplate 메시지 템플릿 저장 (로그만)
func SaveMessageTemplate(branchCode, name, content, description string, isActive bool) error {
	log.Printf("[MessageTemplate] SaveMessageTemplate 호출 - BranchCode: %s, Name: %s, IsActive: %v\n", branchCode, name, isActive)
	log.Printf("[MessageTemplate] Content: %s\n", content)
	log.Printf("[MessageTemplate] Description: %s\n", description)
	log.Println("[MessageTemplate] 현재 DB 연동 전 - 저장 성공 처리")
	return nil
}

// UpdateMessageTemplate 메시지 템플릿 수정 (로그만)
func UpdateMessageTemplate(branchCode string, id int, name, content, description string, isActive bool) error {
	log.Printf("[MessageTemplate] UpdateMessageTemplate 호출 - BranchCode: %s, ID: %d, Name: %s, IsActive: %v\n", branchCode, id, name, isActive)
	log.Printf("[MessageTemplate] Content: %s\n", content)
	log.Printf("[MessageTemplate] Description: %s\n", description)
	log.Println("[MessageTemplate] 현재 DB 연동 전 - 수정 성공 처리")
	return nil
}

// DeleteMessageTemplate 메시지 템플릿 삭제 (로그만)
func DeleteMessageTemplate(branchCode string, id int) error {
	log.Printf("[MessageTemplate] DeleteMessageTemplate 호출 - BranchCode: %s, ID: %d\n", branchCode, id)
	log.Println("[MessageTemplate] 현재 DB 연동 전 - 삭제 성공 처리")
	return nil
}

// SetDefaultMessageTemplate 기본 템플릿 설정 (로그만)
func SetDefaultMessageTemplate(branchCode string, id int) error {
	log.Printf("[MessageTemplate] SetDefaultMessageTemplate 호출 - BranchCode: %s, ID: %d\n", branchCode, id)
	log.Println("[MessageTemplate] 1. 모든 템플릿의 IsDefault를 false로 설정")
	log.Printf("[MessageTemplate] 2. 템플릿 ID %d의 IsDefault를 true로 설정\n", id)
	log.Println("[MessageTemplate] 현재 DB 연동 전 - 기본값 설정 성공 처리")
	return nil
}
