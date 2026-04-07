package com.culcom.entity.complex.member;

import com.culcom.entity.BaseTimeEntity;
import com.culcom.entity.enums.MembershipStatus;
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

    /**
     * 멤버십 본질 상태 (활성/환불).
     * 연기는 별도 테이블({@code complex_postponement_requests})에서 기간 기반으로 관리한다.
     */
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private MembershipStatus status = MembershipStatus.활성;

    /** 시스템 내부용 멤버십 (스태프 자동 부여 등) — UI에 노출하지 않음 */
    @Column(nullable = false)
    @Builder.Default
    private Boolean internal = false;

    @OneToMany(mappedBy = "memberMembership", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    @Builder.Default
    private List<MembershipPayment> payments = new ArrayList<>();

    /**
     * 멤버십이 본질적으로 활성 상태인지 (환불되지 않았는지) — 단일 진입점.
     * status enum과의 직접 비교 대신 이 메서드를 사용한다.
     */
    public boolean isActive() {
        return status == MembershipStatus.활성;
    }

    /** 환불 처리되었는지. */
    public boolean isRefunded() {
        return status == MembershipStatus.환불;
    }

    /**
     * 멤버십이 사용 가능한 상태인지 (= 활성).
     * 만료/연기 여부는 서비스 레이어에서 날짜/연기 테이블과 함께 합성하여 판정한다.
     */
    public boolean isUsable() {
        return isActive();
    }
}
