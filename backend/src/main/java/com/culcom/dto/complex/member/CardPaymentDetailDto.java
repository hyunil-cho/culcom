package com.culcom.dto.complex.member;

import com.culcom.entity.complex.member.CardPaymentDetail;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

@Getter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CardPaymentDetailDto {
    private String cardCompany;
    private String cardNumber;
    private LocalDate cardApprovalDate;
    private String cardApprovalNumber;

    public void validate() {
        if (cardCompany == null || cardCompany.isBlank())
            throw new IllegalArgumentException("카드사를 입력하세요.");
        if (cardNumber == null || cardNumber.length() != 8 || !cardNumber.matches("\\d{8}"))
            throw new IllegalArgumentException("카드번호 앞 8자리를 입력하세요.");
        if (cardApprovalDate == null)
            throw new IllegalArgumentException("카드 승인 날짜를 입력하세요.");
        if (cardApprovalNumber == null || cardApprovalNumber.isBlank())
            throw new IllegalArgumentException("카드 승인번호를 입력하세요.");
    }

    public CardPaymentDetail toEntity() {
        return CardPaymentDetail.builder()
                .cardCompany(cardCompany)
                .cardNumber(cardNumber)
                .cardApprovalDate(cardApprovalDate)
                .cardApprovalNumber(cardApprovalNumber)
                .build();
    }

    public static CardPaymentDetailDto from(CardPaymentDetail entity) {
        if (entity == null) return null;
        return CardPaymentDetailDto.builder()
                .cardCompany(entity.getCardCompany())
                .cardNumber(entity.getCardNumber())
                .cardApprovalDate(entity.getCardApprovalDate())
                .cardApprovalNumber(entity.getCardApprovalNumber())
                .build();
    }
}
