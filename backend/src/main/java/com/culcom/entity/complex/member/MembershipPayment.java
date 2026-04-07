package com.culcom.entity.complex.member;

import com.culcom.entity.BaseTimeEntity;
import com.culcom.entity.enums.PaymentKind;
import com.culcom.entity.enums.PaymentMethod;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

/**
 * 회원 멤버십에 대한 납부(또는 환불정정) 기록.
 * 한 멤버십(ComplexMemberMembership)은 N개의 결제 내역을 가질 수 있다.
 * amount는 양수(납부) 또는 음수(환불정정)일 수 있다.
 */
@Entity
@Table(name = "membership_payments")
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
@Builder
public class MembershipPayment extends BaseTimeEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long seq;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "member_membership_seq", nullable = false)
    private ComplexMemberMembership memberMembership;

    /** 납부 금액. 양수=납부, 음수=환불정정. 단순화를 위해 long(원 단위) 사용. */
    @Column(nullable = false)
    private Long amount;

    @Column(name = "paid_date", nullable = false)
    private LocalDateTime paidDate;

    @Enumerated(EnumType.STRING)
    @Column(length = 30)
    private PaymentMethod method;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private PaymentKind kind;

    @Column(length = 500)
    private String note;
}
