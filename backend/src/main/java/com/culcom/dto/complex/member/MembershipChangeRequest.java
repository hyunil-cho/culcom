package com.culcom.dto.complex.member;

import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * 회원의 활성 멤버십을 다른 멤버십 상품으로 교체할 때의 요청.
 * 원본 멤버십은 {@code MembershipStatus.변경}으로 종결되고, 새 멤버십이 {@code 활성}으로 생성된다.
 * 추가 비용({@link #changeFee})은 관리자가 직접 지정하며 음수 허용(차액 환급).
 */
@Getter
@NoArgsConstructor
public class MembershipChangeRequest {
    /** 새로 적용할 멤버십 상품 seq */
    @NotNull
    private Long newMembershipSeq;

    /** 새 멤버십 시작일 (미지정 시 오늘) */
    private LocalDate startDate;
    /** 새 멤버십 만료일 (미지정 시 상품 duration 기반 자동 계산) */
    private LocalDate expiryDate;

    /** 새 멤버십 가격(문자열, 원). 상품 기본값을 관리자가 수정 가능. */
    private String price;

    /** 관리자 입력 추가 비용 (음수 허용). 0이면 결제 기록을 남기지 않는다. */
    @NotNull
    private Long changeFee;

    private String paymentMethod;
    private LocalDateTime paymentDate;
    private CardPaymentDetailDto cardDetail;

    /** 변경 사유/메모 (활동 로그에 기록) */
    private String changeNote;
}
