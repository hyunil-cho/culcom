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
     * 멤버십을 환불 상태로 전환한다.
     * 시스템 내부 멤버십(internal=true)은 사용자에게 노출되지 않는 자동 부여
     * 멤버십이므로 환불 대상이 아니다.
     */
    public void refund() {
        if (Boolean.TRUE.equals(internal)) {
            throw new IllegalStateException("시스템 내부 멤버십은 환불할 수 없습니다.");
        }
        this.status = MembershipStatus.환불;
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

    /**
     * 양도용 사본을 생성한다 — 양수자에게 동일한 상품/기간/잔여 횟수를 부여하되 다음 차이를 둔다:
     *   - 소유자: {@code newMember}
     *   - price: 양수자가 실제로 지불한 {@code transferFee} 를 저장한다.
     *            정가를 복사하면 양수자의 미수금이 정가만큼 발생하는 것으로 오인되므로 지양.
     *   - 결제수단/결제일: 복사하지 않음 — 양수자 측 양도비 결제 정보는 완료 시 별도 기록된다
     *   - 결제 이력(payments): 복사하지 않음 (원본에 귀속)
     *   - changedFromSeq: 원본 멤버십 seq — 양수자 멤버십의 유래를 추적
     *   - changeFee: transferFee — 양수자가 이 멤버십을 취득하며 지불한 금액
     *   - status: 활성 (원본의 상태와 무관)
     *   - transferred: true (재양도 차단 + 멤버십 변경 차단 마커)
     *   - internal: 기본값 false (양도는 시스템 내부 부여가 아님)
     */
    public ComplexMemberMembership copyForTransferTo(ComplexMember newMember, int transferFee) {
        return ComplexMemberMembership.builder()
                .member(newMember)
                .membership(this.membership)
                .startDate(this.startDate)
                .expiryDate(this.expiryDate)
                .totalCount(this.totalCount)
                .usedCount(this.usedCount)
                .postponeTotal(this.postponeTotal)
                .postponeUsed(this.postponeUsed)
                .price(String.valueOf(transferFee))
                .changedFromSeq(this.seq)
                .changeFee((long) transferFee)
                .status(MembershipStatus.활성)
                .transferred(true)
                .build();
    }

    /**
     *
     * 해당 멤버십이 변경할 수 있는 멤버십인지 검증
     * 사용이 불가능한 상태이거나, 리더용/양도받은 멤버십일 경우, 예외를 발생
     *
     */
    public void isChangeable(){
        if (!this.isActive()) {
            throw new IllegalStateException("활성 상태의 멤버십만 변경할 수 있습니다.");
        }

        if(this.getMembership().isInternal()){
            throw new IllegalArgumentException("리더 전용 멤버십은 변경할 수 없습니다.");
        }

        if (Boolean.TRUE.equals(this.transferred)) {
            throw new IllegalStateException("양도 받은 멤버십은 변경할 수 없습니다.");
        }
    }
}
