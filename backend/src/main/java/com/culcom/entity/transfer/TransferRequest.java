package com.culcom.entity.transfer;

import com.culcom.entity.BaseTimeEntity;
import com.culcom.entity.branch.Branch;
import com.culcom.entity.complex.member.ComplexMember;
import com.culcom.entity.complex.member.ComplexMemberMembership;
import com.culcom.entity.customer.Customer;
import com.culcom.entity.enums.TransferStatus;
import jakarta.persistence.*;
import lombok.*;

import java.time.Duration;
import java.time.LocalDateTime;

@Entity
@Table(name = "transfer_requests")
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
@Builder
public class TransferRequest extends BaseTimeEntity {

    /** 양도 링크(토큰/초대 토큰) 유효 기간: 생성 시점으로부터 7일. */
    private static final Duration LINK_VALID_DURATION = Duration.ofDays(7);

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long seq;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "member_membership_seq", nullable = false)
    private ComplexMemberMembership memberMembership;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "from_member_seq", nullable = false)
    private ComplexMember fromMember;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "branch_seq", nullable = false)
    private Branch branch;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private TransferStatus status = TransferStatus.생성;

    /** 양도비 (원) */
    @Column(name = "transfer_fee", nullable = false)
    private Integer transferFee;

    /** 요청 시점 잔여 횟수 스냅샷 */
    @Column(name = "remaining_count", nullable = false)
    private Integer remainingCount;

    /** 양도자 페이지 접근 토큰 */
    @Column(nullable = false, unique = true, length = 64)
    private String token;

    /** 양수자 초대 토큰 (양도자가 진행 확인 후 생성) */
    @Column(name = "invite_token", unique = true, length = 64)
    private String inviteToken;

    /** 양수자 (Customer로 접수된 후 연결) */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "to_customer_seq")
    private Customer toCustomer;

    /** 관리자 메시지 (승인 코멘트 또는 반려 사유) */
    @Column(name = "admin_message", length = 300)
    private String adminMessage;

    /**
     * 참조 완료 여부 — 이 양도 요청이 실제로 활용(완료·거절 등 종결 처리)되어
     * 관리 리스트에서 숨겨도 되는지 여부. 기본 false.
     */
    @Column(nullable = false)
    @Builder.Default
    private Boolean referenced = false;

    /**
     * 공개 링크(양도자/양수자 페이지)에서 이 요청을 계속 진행할 수 있는지 검증한다.
     * 링크가 만료되었거나 상태가 생성이 아니면 예외를 던진다.
     */
    public void ensureLinkUsable() {
        LocalDateTime created = getCreatedDate();
        if (created != null && created.plus(LINK_VALID_DURATION).isBefore(LocalDateTime.now())) {
            throw new IllegalStateException("유효하지 않은 링크입니다.");
        }
        if (status != TransferStatus.생성) {
            throw new IllegalStateException("이미 만료된 링크입니다.");
        }
    }
}
