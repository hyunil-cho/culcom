package com.culcom.entity;

import com.culcom.entity.complex.member.ComplexMember;
import com.culcom.entity.complex.member.ComplexMemberMembership;
import com.culcom.entity.enums.PublicLinkKind;
import com.culcom.entity.transfer.TransferRequest;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

/**
 * SMS 자동 링크 파서가 안정적으로 인식할 수 있도록 8자 단축 코드(`code`)로
 * 공개 페이지 진입을 매개하는 엔티티.
 *
 * kind 에 따라 사용하는 nullable 필드가 다르다:
 *   - 멤버십, 연기 — member 만 사용
 *   - 환불        — member + memberMembership + refundAmount
 *   - 양도        — member + transferRequest (TransferRequest.token 으로 기존 양도 흐름 진입)
 */
@Entity
@Table(name = "public_links",
        uniqueConstraints = @UniqueConstraint(name = "uk_public_links_code", columnNames = "code"))
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
@Builder
public class PublicLink extends BaseTimeEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long seq;

    @Column(nullable = false, length = 16)
    private String code;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private PublicLinkKind kind;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "member_seq", nullable = false)
    private ComplexMember member;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "member_membership_seq")
    private ComplexMemberMembership memberMembership;

    @Column(name = "refund_amount")
    private Integer refundAmount;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "transfer_request_seq")
    private TransferRequest transferRequest;

    @Column(name = "expires_at", nullable = false)
    private LocalDateTime expiresAt;

    public boolean isExpired() {
        return expiresAt != null && expiresAt.isBefore(LocalDateTime.now());
    }
}
