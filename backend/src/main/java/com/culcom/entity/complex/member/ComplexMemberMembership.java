package com.culcom.entity.complex.member;

import com.culcom.entity.BaseTimeEntity;
import com.culcom.entity.enums.MembershipStatus;
import com.culcom.entity.product.Membership;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
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

    /** 양도로 받은 멤버십 여부 — true이면 재양도 불가 */
    @Column(nullable = false)
    @Builder.Default
    private Boolean transferred = false;

    /**
     * 멤버십 변경으로 새로 생성된 경우 원본 멤버십의 seq.
     * null이면 변경 이력 없는 일반 멤버십.
     */
    @Column(name = "changed_from_seq")
    private Long changedFromSeq;

    /**
     * 멤버십 변경 시 관리자가 입력한 추가 비용.
     * 음수 허용(비싼 것을 싼 것으로 변경 시 차액 환급).
     * null이면 변경으로 생성된 멤버십이 아님.
     */
    @Column(name = "change_fee")
    private Long changeFee;

    @OneToMany(mappedBy = "memberMembership", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    @Builder.Default
    private List<MembershipPayment> payments = new ArrayList<>();

    /**
     * 멤버십이 사용 가능한 활성 상태인지 — 단일 진입점.
     * 다음 조건을 모두 만족해야 활성으로 간주한다:
     *   1) status == 활성 (환불/정지 아님)
     *   2) 만료일이 오늘 이후 (expiryDate >= today)
     *   3) 사용 횟수가 한도 미달 (usedCount < totalCount)
     * 만료/소진 시 자동으로 false를 반환한다.
     */
    public boolean isActive() {
        if (status != MembershipStatus.활성) return false;
        if (expiryDate != null && expiryDate.isBefore(LocalDate.now())) return false;
        if (totalCount != null && usedCount != null && usedCount >= totalCount) return false;
        return true;
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

    /**
     * 승인된 연기를 적용한다 — 만료일을 연기 기간(양끝 포함)만큼 연장하고 사용 횟수를 1 증가.
     * 연기는 멤버십 status를 변경하지 않으며, "오늘 연기 중인지"는
     * complex_postponement_requests 테이블에서 기간으로 판정한다.
     */
    public void applyPostponement(LocalDate startDate, LocalDate endDate) {
        long postponeDays = ChronoUnit.DAYS.between(startDate, endDate) + 1;
        this.expiryDate = this.expiryDate.plusDays(postponeDays);
        this.postponeUsed = this.postponeUsed + 1;
    }
}
