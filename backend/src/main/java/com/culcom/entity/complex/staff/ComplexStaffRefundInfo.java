package com.culcom.entity.complex.staff;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "complex_staff_refund_info")
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
@Builder
public class ComplexStaffRefundInfo {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long seq;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "staff_seq", nullable = false, unique = true)
    private ComplexStaff staff;

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

    @Column(name = "createdDate", nullable = false, updatable = false)
    private LocalDateTime createdDate;

    @Column(name = "lastUpdateDate")
    private LocalDateTime lastUpdateDate;

    @PrePersist
    protected void onCreate() {
        createdDate = LocalDateTime.now();
    }
}
