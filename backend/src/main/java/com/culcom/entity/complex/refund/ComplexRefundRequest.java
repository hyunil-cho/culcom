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

    @Column(name = "reject_reason", length = 300)
    private String rejectReason;

}
