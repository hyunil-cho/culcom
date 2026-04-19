package com.culcom.service;

import com.culcom.dto.complex.member.MembershipPaymentRequest;
import com.culcom.dto.transfer.TransferCreateRequest;
import com.culcom.entity.branch.Branch;
import com.culcom.entity.complex.member.ComplexMember;
import com.culcom.entity.complex.member.ComplexMemberMembership;
import com.culcom.entity.complex.member.MembershipPayment;
import com.culcom.entity.enums.MembershipStatus;
import com.culcom.entity.enums.PaymentKind;
import com.culcom.entity.product.Membership;
import com.culcom.repository.*;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import java.lang.reflect.Field;
import java.time.LocalDate;
import java.time.LocalDateTime;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * 과납 방어 정책 검증:
 * ComplexMemberService.addPayment는 남은 미수금(remaining = price - alreadyPaid)을
 * 1원이라도 초과하는 납부를 거부해야 한다. PaymentKind.ADDITIONAL도 예외가 아니다.
 *
 * 경계:
 *   - 미수금과 정확히 동일     → 허용
 *   - 미수금보다 1원 큼        → 거부
 *   - 미수금보다 크게 초과     → 거부
 *   - 이미 완납된 상태에 추가  → 거부 (remaining = 0)
 *   - REFUND(음수)             → 위 제약과 무관 (합계를 줄이므로 허용)
 */
@SpringBootTest
@ActiveProfiles("test")
@Transactional
class ComplexMemberServiceOverpaymentTest {

    @Autowired MemberMembershipService memberMembershipService;
    @Autowired TransferService transferService;
    @Autowired BranchRepository branchRepository;
    @Autowired MembershipRepository membershipRepository;
    @Autowired ComplexMemberRepository memberRepository;
    @Autowired ComplexMemberMembershipRepository memberMembershipRepository;
    @Autowired MembershipPaymentRepository paymentRepository;

    private Fixture setup(String suffix, long price, long alreadyPaid) {
        Branch branch = branchRepository.save(Branch.builder()
                .branchName("테스트지점")
                .alias("test-overpay-" + suffix + "-" + System.nanoTime())
                .build());

        Membership product = membershipRepository.save(Membership.builder()
                .name("3개월권")
                .duration(90).count(30).price((int) price)
                .transferable(true)
                .build());

        ComplexMember member = memberRepository.save(ComplexMember.builder()
                .name("홍길동")
                .phoneNumber("0101" + String.format("%07d", Math.abs(suffix.hashCode() % 10_000_000)))
                .branch(branch).build());

        ComplexMemberMembership mm = memberMembershipRepository.save(ComplexMemberMembership.builder()
                .member(member).membership(product)
                .startDate(LocalDate.now()).expiryDate(LocalDate.now().plusDays(90))
                .totalCount(30).usedCount(0)
                .price(String.valueOf(price))
                .status(MembershipStatus.활성)
                .build());

        if (alreadyPaid > 0) {
            paymentRepository.save(MembershipPayment.builder()
                    .memberMembership(mm)
                    .amount(alreadyPaid)
                    .paidDate(LocalDateTime.now())
                    .method("카드")
                    .kind(PaymentKind.DEPOSIT)
                    .build());
        }

        return new Fixture(member, mm);
    }

    /** DTO에 setter가 없어 reflection으로 필드 주입. */
    private MembershipPaymentRequest buildReq(Long amount, PaymentKind kind) {
        try {
            MembershipPaymentRequest r = new MembershipPaymentRequest();
            Field fa = MembershipPaymentRequest.class.getDeclaredField("amount");
            fa.setAccessible(true);
            fa.set(r, amount);
            Field fk = MembershipPaymentRequest.class.getDeclaredField("kind");
            fk.setAccessible(true);
            fk.set(r, kind);
            return r;
        } catch (ReflectiveOperationException e) {
            throw new RuntimeException(e);
        }
    }

    @Test
    void 미수금과_동일한_금액_납부는_허용() {
        Fixture f = setup("exact", 300_000, 100_000); // 미수금 = 200,000
        MembershipPaymentRequest req = buildReq(200_000L, PaymentKind.BALANCE);

        assertThatCode(() ->
                memberMembershipService.addPayment(f.member.getSeq(), f.mm.getSeq(), req))
                .doesNotThrowAnyException();

        assertThat(paymentRepository.sumAmountByMemberMembershipSeq(f.mm.getSeq()))
                .isEqualTo(300_000L);
    }

    @Test
    void 남은_미수금보다_1원_많으면_거부() {
        Fixture f = setup("one-won", 300_000, 100_000); // 미수금 = 200,000
        MembershipPaymentRequest req = buildReq(200_001L, PaymentKind.BALANCE);

        assertThatThrownBy(() ->
                memberMembershipService.addPayment(f.member.getSeq(), f.mm.getSeq(), req))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("미수금");

        assertThat(paymentRepository.sumAmountByMemberMembershipSeq(f.mm.getSeq()))
                .as("거부되었으므로 기존 100,000 그대로")
                .isEqualTo(100_000L);
    }

    @Test
    void 남은_미수금보다_크게_초과하면_거부() {
        Fixture f = setup("large", 300_000, 100_000); // 미수금 = 200,000
        MembershipPaymentRequest req = buildReq(500_000L, PaymentKind.BALANCE);

        assertThatThrownBy(() ->
                memberMembershipService.addPayment(f.member.getSeq(), f.mm.getSeq(), req))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("미수금");
    }

    @Test
    void 이미_완납된_상태에서_추가납부_시도는_거부() {
        Fixture f = setup("fully-paid", 300_000, 300_000); // 미수금 = 0
        MembershipPaymentRequest req = buildReq(1L, PaymentKind.ADDITIONAL); // 1원만 추가

        assertThatThrownBy(() ->
                memberMembershipService.addPayment(f.member.getSeq(), f.mm.getSeq(), req))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("미수금");
    }

    @Test
    void PaymentKind_ADDITIONAL도_초과분은_거부() {
        Fixture f = setup("additional", 300_000, 200_000); // 미수금 = 100,000
        MembershipPaymentRequest req = buildReq(100_001L, PaymentKind.ADDITIONAL); // 1원 초과

        assertThatThrownBy(() ->
                memberMembershipService.addPayment(f.member.getSeq(), f.mm.getSeq(), req))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("미수금");
    }

    /**
     * 완납 상태에서 REFUND 정정이 들어오면 멤버십은 다시 미납 상태로 돌아가야 한다.
     * - paymentStatus("완납" → "부분납부")
     * - 이후 새 납부가 환불 금액만큼 다시 허용된다
     * - 양도 시에는 미수금 거부로 전환된다
     */
    /**
     * 완납 상태에서 REFUND 정정이 들어오면 멤버십은 다시 미납(부분납부) 상태로 돌아가야 한다.
     * - 납부 상태(paidAmount vs price 기준)가 '완납' → '부분납부'로 전환된다
     * - 이후 환불분만큼의 새 납부는 과납 가드에 의해 다시 허용된다
     * - 1원이라도 추가되면 다시 과납 거부
     */
    @Test
    void 완납_상태에서_REFUND_정정_후에는_미납상태로_복귀한다() {
        Fixture f = setup("refund-partial", 300_000, 300_000); // 완납
        assertThat(derivedStatus(f.mm)).isEqualTo("완납");

        // 50,000원 환불 정정 → paid 250,000 / total 300,000
        memberMembershipService.addPayment(f.member.getSeq(), f.mm.getSeq(),
                buildReq(-50_000L, PaymentKind.REFUND));

        // (1) 파생 납부 상태가 완납 → 부분납부로 전환
        assertThat(paid(f.mm)).isEqualTo(250_000L);
        assertThat(outstanding(f.mm))
                .as("환불 정정분(50,000원)만큼 미수금이 복구되어야 한다")
                .isEqualTo(50_000L);
        assertThat(derivedStatus(f.mm))
                .as("완납에서 REFUND 정정 후에는 미납(부분납부) 상태여야 한다")
                .isEqualTo("부분납부");

        // (2) 과납 가드가 '미수금 50,000' 으로 인식 → 50,000 재납부는 허용
        assertThatCode(() -> memberMembershipService.addPayment(
                f.member.getSeq(), f.mm.getSeq(), buildReq(50_000L, PaymentKind.BALANCE)))
                .as("환불분만큼의 재납부는 허용되어야 한다").doesNotThrowAnyException();

        assertThat(derivedStatus(f.mm))
                .as("재납부 후에는 다시 완납").isEqualTo("완납");

        // (3) 이어서 1원이라도 추가하면 과납으로 거부되어야 한다
        assertThatThrownBy(() -> memberMembershipService.addPayment(
                f.member.getSeq(), f.mm.getSeq(), buildReq(1L, PaymentKind.ADDITIONAL)))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("미수금");
    }

    /**
     * 완납 상태에서 전액을 환불 정정하면 paid == 0 이 되어 완전 '미납' 상태가 되어야 한다.
     * 이 상태에서는 양도 요청도 미수금 거부로 전환된다.
     */
    @Test
    void 완납_상태에서_REFUND_전액정정_후에는_완전_미납상태가_된다() {
        Fixture f = setup("refund-full", 300_000, 300_000); // 완납
        assertThat(derivedStatus(f.mm)).isEqualTo("완납");

        // 300,000 전액 환불 정정 → paid 0
        memberMembershipService.addPayment(f.member.getSeq(), f.mm.getSeq(),
                buildReq(-300_000L, PaymentKind.REFUND));

        assertThat(paid(f.mm)).isEqualTo(0L);
        assertThat(outstanding(f.mm)).isEqualTo(300_000L);
        assertThat(derivedStatus(f.mm))
                .as("paid==0 이면 '미납'으로 판정한다")
                .isEqualTo("미납");

        // 양도는 미수금 전액이므로 거부되어야 한다
        TransferCreateRequest tr = new TransferCreateRequest();
        tr.setMemberMembershipSeq(f.mm.getSeq());

        assertThatThrownBy(() -> transferService.create(tr))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("미수금");
    }

    // ── 파생 상태 헬퍼 ─────────────────────────────────────────────
    // ComplexMemberMembershipResponse.from() 과 동일한 규칙을 DB 합계 쿼리 기반으로 재현.
    // 엔티티의 @OneToMany lazy 컬렉션은 1차 캐시 갱신 이슈가 있으므로 DB 합계를 쓴다.

    private long paid(ComplexMemberMembership mm) {
        return paymentRepository.sumAmountByMemberMembershipSeq(mm.getSeq());
    }

    private long outstanding(ComplexMemberMembership mm) {
        return parsePrice(mm.getPrice()) - paid(mm);
    }

    private String derivedStatus(ComplexMemberMembership mm) {
        long total = parsePrice(mm.getPrice());
        long p = paid(mm);
        if (p <= 0) return "미납";
        if (p < total) return "부분납부";
        if (p == total) return "완납";
        return "초과";
    }

    private static long parsePrice(String s) {
        return Long.parseLong(s.replaceAll("[^0-9-]", ""));
    }

    private record Fixture(ComplexMember member, ComplexMemberMembership mm) {}
}
