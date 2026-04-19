package com.culcom.dto.complex.member;

import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * 회원의 활성 멤버십을 다른 상품으로 교체(업그레이드)할 때의 요청.
 * 원본은 {@code MembershipStatus.변경}으로 종결되고, 새 멤버십이 {@code 활성}으로 생성된다.
 * <p>
 * 새 멤버십의 시작일/만료일/가격 및 차액은 서버가 원본과 신규 상품의 메타데이터로 자동 계산한다.
 * (관리자가 재량으로 덮어쓸 수 없음)
 */
@Getter
@NoArgsConstructor
public class MembershipChangeRequest {
    /** 새로 적용할 멤버십 상품 seq */
    @NotNull
    private Long newMembershipSeq;

    private String paymentMethod;
    private LocalDateTime paymentDate;
    private CardPaymentDetailDto cardDetail;

    /** 변경 사유/메모 (활동 로그에 기록) */
    private String changeNote;
}
