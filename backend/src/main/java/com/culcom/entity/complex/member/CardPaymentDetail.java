package com.culcom.entity.complex.member;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import lombok.*;

import java.time.LocalDate;

/**
 * 카드 결제 시 추가 상세 정보.
 * MembershipPayment에 @Embedded로 사용.
 */
@Embeddable
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
@Builder
public class CardPaymentDetail {

    /** 카드사 (예: 삼성, 현대, KB국민 등) */
    @Column(name = "card_company", length = 50)
    private String cardCompany;

    /** 카드번호 앞 8자리 */
    @Column(name = "card_number", length = 8)
    private String cardNumber;

    /** 승인 날짜 */
    @Column(name = "card_approval_date")
    private LocalDate cardApprovalDate;

    /** 승인번호 */
    @Column(name = "card_approval_number", length = 50)
    private String cardApprovalNumber;
}
