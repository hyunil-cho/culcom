package com.culcom.entity.transfer;

import com.culcom.entity.BaseTimeEntity;
import com.culcom.entity.branch.Branch;
import com.culcom.entity.complex.member.ComplexMember;
import com.culcom.entity.complex.member.ComplexMemberMembership;
import com.culcom.entity.customer.Customer;
import com.culcom.entity.enums.TransferStatus;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "transfer_requests")
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
@Builder
public class TransferRequest extends BaseTimeEntity {

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
}
