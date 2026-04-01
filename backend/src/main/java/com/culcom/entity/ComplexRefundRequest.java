package com.culcom.entity;

import com.culcom.entity.enums.RequestStatus;
import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "complex_refund_requests")
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
@Builder
public class ComplexRefundRequest {

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

    @Column(name = "bank_name", nullable = false, length = 50)
    private String bankName;

    @Column(name = "account_number", nullable = false, length = 50)
    private String accountNumber;

    @Column(name = "account_holder", nullable = false, length = 50)
    private String accountHolder;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private RequestStatus status = RequestStatus.대기;

    @Column(name = "reject_reason", length = 300)
    private String rejectReason;

    @Column(name = "createdDate", nullable = false, updatable = false)
    private LocalDateTime createdDate;

    @Column(name = "lastUpdateDate")
    private LocalDateTime lastUpdateDate;

    @PrePersist
    protected void onCreate() {
        createdDate = LocalDateTime.now();
    }
}
