package com.culcom.entity.complex.member;

import com.culcom.entity.BaseTimeEntity;
import com.culcom.entity.enums.StaffStatus;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "complex_staff_info")
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
@Builder
public class ComplexStaffInfo extends BaseTimeEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long seq;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "member_seq", nullable = false, unique = true)
    private ComplexMember member;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private StaffStatus status = StaffStatus.활동중;

    // ── 환급 정보 (기존 ComplexStaffRefundInfo 흡수) ──

    @Column(name = "deposit_amount", length = 50)
    private String depositAmount;

    @Column(name = "refundable_deposit", length = 50)
    private String refundableDeposit;

    @Column(name = "non_refundable_deposit", length = 50)
    private String nonRefundableDeposit;

    @Column(name = "refund_bank", length = 50)
    private String refundBank;

    @Column(name = "refund_account", length = 50)
    private String refundAccount;

    @Column(name = "refund_amount", length = 50)
    private String refundAmount;

    @Column(name = "payment_method", length = 50)
    private String paymentMethod;
}
