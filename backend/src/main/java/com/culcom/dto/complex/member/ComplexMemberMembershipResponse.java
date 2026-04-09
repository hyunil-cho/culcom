package com.culcom.dto.complex.member;

import com.culcom.entity.complex.member.ComplexMemberMembership;
import com.culcom.entity.complex.member.MembershipPayment;
import com.culcom.entity.enums.MembershipStatus;
import lombok.Builder;
import lombok.Getter;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;

@Getter
@Builder
public class ComplexMemberMembershipResponse {
    private Long seq;
    private Long memberSeq;
    private Long membershipSeq;
    private String membershipName;
    private LocalDate startDate;
    private LocalDate expiryDate;
    private Integer totalCount;
    private Integer usedCount;
    private Integer postponeTotal;
    private Integer postponeUsed;
    private String price;
    private String paymentMethod;
    private LocalDateTime paymentDate;
    private MembershipStatus status;
    private Boolean transferable;
    private LocalDateTime createdDate;

    /** 누적 납부 금액 (sum of payments.amount; 음수 환불정정 포함) */
    private Long paidAmount;
    /** 미수금 = price - paidAmount. price 파싱 실패 시 null */
    private Long outstanding;
    /** '미납' | '부분납부' | '완납' | '초과' */
    private String paymentStatus;
    /** 결제 내역 (옵션) */
    private List<MembershipPaymentResponse> payments;

    public static ComplexMemberMembershipResponse from(ComplexMemberMembership entity) {
        return from(entity, false);
    }

    public static ComplexMemberMembershipResponse from(ComplexMemberMembership entity, boolean includePayments) {
        List<MembershipPayment> ps = entity.getPayments() != null ? entity.getPayments() : Collections.emptyList();
        long paid = ps.stream().mapToLong(p -> p.getAmount() == null ? 0L : p.getAmount()).sum();
        Long total = parseAmount(entity.getPrice());
        Long out = total != null ? (total - paid) : null;
        String status;
        if (total == null) status = "미정";
        else if (paid <= 0) status = "미납";
        else if (paid < total) status = "부분납부";
        else if (paid == total.longValue()) status = "완납";
        else status = "초과";

        return ComplexMemberMembershipResponse.builder()
                .seq(entity.getSeq())
                .memberSeq(entity.getMember().getSeq())
                .membershipSeq(entity.getMembership().getSeq())
                .membershipName(entity.getMembership().getName())
                .startDate(entity.getStartDate())
                .expiryDate(entity.getExpiryDate())
                .totalCount(entity.getTotalCount())
                .usedCount(entity.getUsedCount())
                .postponeTotal(entity.getPostponeTotal())
                .postponeUsed(entity.getPostponeUsed())
                .price(entity.getPrice())
                .paymentMethod(entity.getPaymentMethod())
                .paymentDate(entity.getPaymentDate())
                .status(entity.getStatus())
                .transferable(entity.getMembership().getTransferable())
                .createdDate(entity.getCreatedDate())
                .paidAmount(paid)
                .outstanding(out)
                .paymentStatus(status)
                .payments(includePayments
                        ? ps.stream().map(MembershipPaymentResponse::from).toList()
                        : null)
                .build();
    }

    private static Long parseAmount(String s) {
        if (s == null) return null;
        String digits = s.replaceAll("[^0-9-]", "");
        if (digits.isEmpty() || "-".equals(digits)) return null;
        try { return Long.parseLong(digits); } catch (NumberFormatException e) { return null; }
    }
}
