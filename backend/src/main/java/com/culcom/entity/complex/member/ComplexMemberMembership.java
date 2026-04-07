package com.culcom.entity.complex.member;

import com.culcom.entity.BaseTimeEntity;
import com.culcom.entity.product.Membership;
import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "complex_member_memberships")
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
@Builder
public class ComplexMemberMembership extends BaseTimeEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long seq;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "member_seq", nullable = false)
    private ComplexMember member;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "membership_seq", nullable = false)
    private Membership membership;

    @Column(name = "start_date", nullable = false)
    private LocalDate startDate;

    @Column(name = "expiry_date", nullable = false)
    private LocalDate expiryDate;

    @Column(name = "total_count", nullable = false)
    private Integer totalCount;

    @Column(name = "used_count", nullable = false)
    @Builder.Default
    private Integer usedCount = 0;

    @Column(name = "postpone_total", nullable = false)
    @Builder.Default
    private Integer postponeTotal = 3;

    @Column(name = "postpone_used", nullable = false)
    @Builder.Default
    private Integer postponeUsed = 0;

    @Column(length = 50)
    private String price;

    @Column(name = "payment_method", length = 50)
    private String paymentMethod;

    @Column(name = "payment_date")
    private LocalDateTime paymentDate;

    /** 관리자가 지정하는 사용 가능 여부. false면 출석/연기/환불 등 사용처에서 막힘.
     *  비활성 사유는 member_activity_log에서 derive. */
    @Column(name = "is_active", nullable = false)
    @Builder.Default
    private Boolean isActive = true;

    /** 시스템 내부용 멤버십 (스태프 자동 부여 등) — UI에 노출하지 않음 */
    @Column(nullable = false)
    @Builder.Default
    private Boolean internal = false;

    @OneToMany(mappedBy = "memberMembership", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    @Builder.Default
    private List<MembershipPayment> payments = new ArrayList<>();

    /** 출석/연기/환불 등에서 실제로 쓸 수 있는 상태인지 단일 진입점. */
    public boolean isUsable() {
        return Boolean.TRUE.equals(isActive);
    }
}
