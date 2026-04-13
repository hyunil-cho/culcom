package com.culcom.entity.complex.settings;

import com.culcom.entity.BaseTimeEntity;
import jakarta.persistence.*;
import lombok.*;

/**
 * 운영자가 관리하는 결제 수단 카탈로그.
 * code는 결제 행(MembershipPayment.method, ComplexMemberMembership.paymentMethod)이
 * 참조하는 immutable 식별자.
 */
@Entity
@Table(name = "payment_method_config",
       uniqueConstraints = @UniqueConstraint(columnNames = "code"))
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
@Builder
public class PaymentMethodConfig extends BaseTimeEntity implements Configurable {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long seq;

    /** 시스템 식별 코드. 생성 후 변경 불가. */
    @Column(nullable = false, length = 50, updatable = false)
    private String code;

    @Column(name = "is_active", nullable = false)
    @Builder.Default
    private Boolean isActive = true;
}
