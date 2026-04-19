package com.culcom.service;

import com.culcom.dto.complex.member.ComplexMemberMembershipResponse;
import com.culcom.dto.complex.member.MembershipChangeRequest;
import com.culcom.entity.branch.Branch;
import com.culcom.entity.complex.member.ComplexMember;
import com.culcom.entity.complex.member.ComplexMemberMembership;
import com.culcom.entity.complex.member.MembershipPayment;
import com.culcom.entity.enums.MembershipStatus;
import com.culcom.entity.enums.PaymentKind;
import com.culcom.entity.product.Membership;
import com.culcom.repository.*;
import com.culcom.util.PriceUtils;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * MemberMembershipService.changeMembership() 업그레이드 시나리오 검증.
 *
 * 정책:
 *  - 업그레이드 = newProduct.price &gt; sourceProduct.price (strict)
 *  - 원본 {@code usedCount <= 8} 이내만 허용 (수업 횟수 기준 1달). 8은 경계로 포함.
 *  - 차액(= new.price - old.price) 자동 계산. 요청의 changeFee/price/expiryDate 무시.
 *  - 만료일 = 원본 만료일 + (new.duration - old.duration)
 *  - 원본의 usedCount/postponeTotal/postponeUsed 상속
 *  - target.price = 차액 (target 단독 기준 미수금 0)
 *  - 차액 결제는 ADDITIONAL 1건으로 기록
 *  - 다운그레이드/동일 등급은 IllegalStateException
 */
@SpringBootTest
@ActiveProfiles("test")
@Transactional
class MemberMembershipServiceUpgradeTest {

    @Autowired MemberMembershipService memberMembershipService;
    @Autowired BranchRepository branchRepository;
    @Autowired MembershipRepository membershipRepository;
    @Autowired ComplexMemberRepository memberRepository;
    @Autowired ComplexMemberMembershipRepository memberMembershipRepository;
    @Autowired MembershipPaymentRepository paymentRepository;

    private static class Fixture {
        Branch branch;
        ComplexMember member;
        Membership oldProduct;
        Membership newProduct;
        ComplexMemberMembership sourceMm;
    }

    /**
     * @param suffix         테스트 간 고유화를 위한 접미사
     * @param oldDuration    원본 상품의 기간(일)
     * @param oldCount       원본 상품의 총 횟수
     * @param oldPrice       원본 상품의 가격
     * @param newDuration    신규 상품의 기간(일)
     * @param newCount       신규 상품의 총 횟수
     * @param newPrice       신규 상품의 가격
     * @param sourceUsed     원본 멤버십의 현재 사용 횟수
     * @param sourcePostponeUsed  원본 멤버십의 연기 사용 수
     */
    private Fixture setup(String suffix,
                          int oldDuration, int oldCount, int oldPrice,
                          int newDuration, int newCount, int newPrice,
                          int sourceUsed, int sourcePostponeUsed) {
        long nonce = System.nanoTime();
        Fixture f = new Fixture();

        f.branch = branchRepository.save(Branch.builder()
                .branchName("테스트지점")
                .alias("upg-" + suffix + "-" + nonce)
                .build());

        f.oldProduct = membershipRepository.save(Membership.builder()
                .name("구-" + suffix + "-" + nonce)
                .duration(oldDuration).count(oldCount).price(oldPrice)
                .transferable(true)
                .build());
        f.newProduct = membershipRepository.save(Membership.builder()
                .name("신-" + suffix + "-" + nonce)
                .duration(newDuration).count(newCount).price(newPrice)
                .transferable(true)
                .build());

        f.member = memberRepository.save(ComplexMember.builder()
                .name("업그회원-" + suffix)
                .phoneNumber("010" + String.format("%08d", nonce % 100_000_000))
                .branch(f.branch)
                .build());

        f.sourceMm = memberMembershipRepository.save(ComplexMemberMembership.builder()
                .member(f.member).membership(f.oldProduct)
                .startDate(LocalDate.now().minusDays(15))
                .expiryDate(LocalDate.now().plusDays(oldDuration - 15))
                .totalCount(oldCount).usedCount(sourceUsed)
                .postponeTotal(3).postponeUsed(sourcePostponeUsed)
                .price(String.valueOf(oldPrice))
                .status(MembershipStatus.활성)
                .build());

        return f;
    }

    private MembershipChangeRequest req(Long newMembershipSeq) {
        MembershipChangeRequest r = new MembershipChangeRequest();
        ReflectionTestUtils.setField(r, "newMembershipSeq", newMembershipSeq);
        // changeFee/price/expiryDate는 업그레이드 경로에서 무시되므로 비워둔다.
        // Bean Validation의 @NotNull은 컨트롤러 경계에서만 작동하므로 서비스 레벨 테스트에서는 영향 없음.
        return r;
    }

    // ── 성공 경로 ─────────────────────────────────────────────────

    @Test
    void U1_업그레이드_성공_시_원본은_변경_target은_활성_차액이_자동계산된다() {
        // 원본: 60일/10회/150,000원, usedCount=3, postponeUsed=0
        // 신규: 90일/20회/280,000원 → 차액 130,000원, 기간 연장 30일
        Fixture f = setup("u1", 60, 10, 150_000, 90, 20, 280_000, 3, 0);
        LocalDate expectedExpiry = f.sourceMm.getExpiryDate().plusDays(30);

        ComplexMemberMembershipResponse res =
                memberMembershipService.changeMembership(f.member.getSeq(), f.sourceMm.getSeq(), req(f.newProduct.getSeq()));

        // 원본: 변경 상태로 종결
        ComplexMemberMembership reloaded = memberMembershipRepository.findById(f.sourceMm.getSeq()).orElseThrow();
        assertThat(reloaded.getStatus()).isEqualTo(MembershipStatus.변경);

        // target: 활성 + changedFromSeq + 상품 교체
        ComplexMemberMembership target = memberMembershipRepository.findById(res.getSeq()).orElseThrow();
        assertThat(target.getStatus()).isEqualTo(MembershipStatus.활성);
        assertThat(target.getChangedFromSeq()).isEqualTo(f.sourceMm.getSeq());
        assertThat(target.getMembership().getSeq()).isEqualTo(f.newProduct.getSeq());

        // 차액 130,000원 자동 계산 + target.price = 차액
        assertThat(target.getChangeFee()).isEqualTo(130_000L);
        assertThat(target.getPrice()).isEqualTo("130000");

        // 만료일 연장: 원본 만료일 + (90-60)
        assertThat(target.getExpiryDate()).isEqualTo(expectedExpiry);

        // totalCount는 신규 상품 기준
        assertThat(target.getTotalCount()).isEqualTo(20);
    }

    @Test
    void U2_사용횟수와_연기_한도_및_연기_사용수가_모두_상속된다() {
        // postponeUsed=2, usedCount=5로 세팅 → 모두 상속되어야 한다
        Fixture f = setup("u2", 60, 10, 150_000, 90, 20, 280_000, 5, 2);

        ComplexMemberMembershipResponse res =
                memberMembershipService.changeMembership(f.member.getSeq(), f.sourceMm.getSeq(), req(f.newProduct.getSeq()));

        ComplexMemberMembership target = memberMembershipRepository.findById(res.getSeq()).orElseThrow();
        assertThat(target.getUsedCount()).as("usedCount 상속").isEqualTo(5);
        assertThat(target.getPostponeTotal()).as("postponeTotal 상속").isEqualTo(3);
        assertThat(target.getPostponeUsed()).as("postponeUsed 상속").isEqualTo(2);
    }

    @Test
    void U3_차액_결제가_ADDITIONAL_kind로_한_건_기록된다() {
        Fixture f = setup("u3", 60, 10, 150_000, 90, 20, 280_000, 0, 0);

        ComplexMemberMembershipResponse res =
                memberMembershipService.changeMembership(f.member.getSeq(), f.sourceMm.getSeq(), req(f.newProduct.getSeq()));

        List<MembershipPayment> payments =
                paymentRepository.findByMemberMembershipSeqOrderByPaidDateAscSeqAsc(res.getSeq());
        assertThat(payments).hasSize(1);
        MembershipPayment p = payments.get(0);
        assertThat(p.getAmount()).isEqualTo(130_000L);
        assertThat(p.getKind()).isEqualTo(PaymentKind.ADDITIONAL);
        assertThat(p.getNote()).contains("업그레이드");
    }

    @Test
    void U4_경계_usedCount가_정확히_8이면_업그레이드_허용() {
        // 정책: usedCount == 8 허용 (사용자가 명시적으로 확정)
        Fixture f = setup("u4", 60, 30, 150_000, 90, 40, 280_000, 8, 0);

        ComplexMemberMembershipResponse res =
                memberMembershipService.changeMembership(f.member.getSeq(), f.sourceMm.getSeq(), req(f.newProduct.getSeq()));

        assertThat(res).isNotNull();
        ComplexMemberMembership target = memberMembershipRepository.findById(res.getSeq()).orElseThrow();
        assertThat(target.getStatus()).isEqualTo(MembershipStatus.활성);
        assertThat(target.getUsedCount()).isEqualTo(8);
    }

    // ── 거부 경로 ─────────────────────────────────────────────────

    @Test
    void U5_usedCount가_9이상이면_업그레이드_거부() {
        Fixture f = setup("u5", 60, 30, 150_000, 90, 40, 280_000, 9, 0);

        assertThatThrownBy(() ->
                memberMembershipService.changeMembership(f.member.getSeq(), f.sourceMm.getSeq(), req(f.newProduct.getSeq())))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("8회를 초과");

        // 부작용 없음: 원본 상태가 바뀌지 않아야 한다
        ComplexMemberMembership reloaded = memberMembershipRepository.findById(f.sourceMm.getSeq()).orElseThrow();
        assertThat(reloaded.getStatus()).isEqualTo(MembershipStatus.활성);
    }

    @Test
    void U6_다운그레이드는_거부된다() {
        // new.price < old.price
        Fixture f = setup("u6", 90, 20, 280_000, 60, 10, 150_000, 0, 0);

        assertThatThrownBy(() ->
                memberMembershipService.changeMembership(f.member.getSeq(), f.sourceMm.getSeq(), req(f.newProduct.getSeq())))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("다운그레이드");
    }

    @Test
    void U7_동일_등급은_거부된다() {
        // new.price == old.price → isHigherGradeThan false
        Fixture f = setup("u7", 60, 10, 150_000, 90, 20, 150_000, 0, 0);

        assertThatThrownBy(() ->
                memberMembershipService.changeMembership(f.member.getSeq(), f.sourceMm.getSeq(), req(f.newProduct.getSeq())))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("동일 등급");
    }

    @Test
    void U8_원본이_활성이_아니면_거부된다() {
        Fixture f = setup("u8", 60, 10, 150_000, 90, 20, 280_000, 0, 0);
        f.sourceMm.setStatus(MembershipStatus.만료);
        memberMembershipRepository.save(f.sourceMm);

        assertThatThrownBy(() ->
                memberMembershipService.changeMembership(f.member.getSeq(), f.sourceMm.getSeq(), req(f.newProduct.getSeq())))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("활성");
    }

    // ── 미수금 정합성 ────────────────────────────────────────────

    @Test
    void U10_업그레이드_후_차액만_납부해도_target은_미수금이_없다() {
        // 정책 해석:
        //  기존 10만원짜리 멤버십을 20만원짜리로 업그레이드하면, 실질적으로
        //  20만원짜리를 10만원에 "차액 결제"로 전환한 것으로 본다.
        //  → target.price = 차액(10만원), 차액 결제(10만원) = paid → 미수금 0.
        //  이 관계가 깨지면 이후 양도/환불/미수금 쿼리가 잘못된 "미납" 판정을 내린다.
        Fixture f = setup("u10", 60, 10, 100_000, 90, 20, 200_000, 0, 0);

        ComplexMemberMembershipResponse res =
                memberMembershipService.changeMembership(f.member.getSeq(), f.sourceMm.getSeq(), req(f.newProduct.getSeq()));

        ComplexMemberMembership target = memberMembershipRepository.findById(res.getSeq()).orElseThrow();

        // target.price는 차액만 저장되어야 한다
        Long targetTotal = PriceUtils.parse(target.getPrice());
        assertThat(targetTotal)
                .as("target.price = 차액(new.price - old.price)")
                .isEqualTo(100_000L);

        // target에 귀속된 결제 합계 = 차액 (ADDITIONAL 1건)
        Long paidOnTarget = paymentRepository.sumAmountByMemberMembershipSeq(target.getSeq());
        assertThat(paidOnTarget)
                .as("차액 결제(ADDITIONAL)만 target에 귀속된다")
                .isEqualTo(100_000L);

        // 핵심: paid >= total → 미수금 0
        long outstanding = Math.max(0L, targetTotal - paidOnTarget);
        assertThat(outstanding)
                .as("차액 납부로 target은 미수금 없이 거래 완료되어야 한다")
                .isZero();

        // 원본 결제 이력은 원본에 귀속 유지 (target에 섞이지 않음)
        Long paidOnSource = paymentRepository.sumAmountByMemberMembershipSeq(f.sourceMm.getSeq());
        assertThat(paidOnSource)
                .as("원본 결제 이력은 target으로 이전되지 않는다")
                .isZero();
    }

    @Test
    void U9_업그레이드_거부_시_source와_결제_기록에_부작용이_없다() {
        // 거부 케이스(usedCount=9)에서 원본/결제 테이블에 어떤 변화도 없어야 한다.
        Fixture f = setup("u9", 60, 30, 150_000, 90, 40, 280_000, 9, 1);

        long beforePayments = paymentRepository.count();
        MembershipStatus beforeStatus = f.sourceMm.getStatus();
        int beforeUsed = f.sourceMm.getUsedCount();
        int beforePostponeUsed = f.sourceMm.getPostponeUsed();

        assertThatThrownBy(() ->
                memberMembershipService.changeMembership(f.member.getSeq(), f.sourceMm.getSeq(), req(f.newProduct.getSeq())))
                .isInstanceOf(IllegalStateException.class);

        assertThat(paymentRepository.count()).isEqualTo(beforePayments);
        ComplexMemberMembership reloaded = memberMembershipRepository.findById(f.sourceMm.getSeq()).orElseThrow();
        assertThat(reloaded.getStatus()).isEqualTo(beforeStatus);
        assertThat(reloaded.getUsedCount()).isEqualTo(beforeUsed);
        assertThat(reloaded.getPostponeUsed()).isEqualTo(beforePostponeUsed);
    }
}
