package com.culcom.dto.publiclink;

import com.culcom.entity.PublicLink;
import com.culcom.entity.enums.PublicLinkKind;
import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;

@Getter
@Builder
public class PublicLinkResolveResponse {
    private PublicLinkKind kind;
    private Long memberSeq;
    private String memberName;
    private String memberPhone;

    /** 환불 종류 시 채워짐 */
    private Long memberMembershipSeq;
    /** 환불 종류 시 채워짐 */
    private Integer refundAmount;

    /** 양도 종류 시 채워짐 — 기존 양도자 페이지가 사용하던 token */
    private String transferToken;

    private LocalDateTime expiresAt;

    public static PublicLinkResolveResponse from(PublicLink link) {
        return PublicLinkResolveResponse.builder()
                .kind(link.getKind())
                .memberSeq(link.getMember().getSeq())
                .memberName(link.getMember().getName())
                .memberPhone(link.getMember().getPhoneNumber())
                .memberMembershipSeq(link.getMemberMembership() != null
                        ? link.getMemberMembership().getSeq() : null)
                .refundAmount(link.getRefundAmount())
                .transferToken(link.getTransferRequest() != null
                        ? link.getTransferRequest().getToken() : null)
                .expiresAt(link.getExpiresAt())
                .build();
    }
}
