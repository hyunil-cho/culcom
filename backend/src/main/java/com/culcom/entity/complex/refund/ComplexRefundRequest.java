package com.culcom.entity.complex.refund;

import com.culcom.entity.BaseTimeEntity;
import com.culcom.entity.branch.Branch;
import com.culcom.entity.complex.member.ComplexMember;
import com.culcom.entity.complex.member.ComplexMemberMembership;
import com.culcom.entity.enums.RequestStatus;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "complex_refund_requests")
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
@Builder
public class ComplexRefundRequest extends BaseTimeEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long seq;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "branch_seq", nullable = false)
    private Branch branch;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "member_seq", nullable = false)
    private ComplexMember member;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "member_membership_seq", nullable = false)
    private ComplexMemberMembership memberMembership;

    @Column(name = "member_name", nullable = false, length = 100)
    private String memberName;

    @Column(name = "phone_number", nullable = false, length = 20)
    private String phoneNumber;

    @Column(name = "membership_name", nullable = false, length = 100)
    private String membershipName;

    @Column(length = 50)
    private String price;

    @Column(nullable = false, columnDefinition = "text")
    private String reason;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private RequestStatus status = RequestStatus.대기;

    @Column(name = "admin_message", length = 300)
    private String adminMessage;

    /**
     * 환불 요청이 종결 상태(승인/반려)인지.
     * 종결 상태는 비가역이라 더 이상 상태 변경이 불가능하다.
     */
    public boolean isTerminated() {
        return status == RequestStatus.승인 || status == RequestStatus.반려;
    }

    /**
     * 상태 변경 가능 여부를 검증한다.
     * 이미 종결된 요청에 대해서는 {@link IllegalStateException} 을 던진다.
     */
    public void assertChangeable() {
        if (isTerminated()) {
            throw new IllegalStateException("이미 처리된 환불 요청은 상태를 변경할 수 없습니다.");
        }
    }
}
