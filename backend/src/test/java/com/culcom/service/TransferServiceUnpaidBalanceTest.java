package com.culcom.service;

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

import java.time.LocalDate;
import java.time.LocalDateTime;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * 미수금 시나리오 시뮬레이션:
 * 양도하려는 멤버십에 미수금이 남아있을 때 양도 생성이 차단되는지 검증한다.
 *
 * TransferService.create()는 membership_payments의 amount 합과 mm.price를 비교하여
 * paid < total 이면 IllegalStateException을 던져야 한다.
 *
 * 경계 테스트:
 *   1) 납부 기록이 전혀 없음 (전액 미납)               → 거부
 *   2) 일부만 납부 (예: 300,000 중 100,000만 납부)    → 거부
 *   3) 완납 (paid == total)                            → 허용
 *   4) 초과 납부 (paid > total)                        → 허용
 */
@SpringBootTest
@ActiveProfiles("test")
@Transactional
class TransferServiceUnpaidBalanceTest {

    @Autowired TransferService transferService;
    @Autowired BranchRepository branchRepository;
    @Autowired MembershipRepository membershipRepository;
    @Autowired ComplexMemberRepository memberRepository;
    @Autowired ComplexMemberMembershipRepository memberMembershipRepository;
    @Autowired MembershipPaymentRepository paymentRepository;

    private Fixture setup(String aliasSuffix, long price, String memberName, String phone) {
        Branch branch = branchRepository.save(Branch.builder()
                .branchName("테스트지점")
                .alias("test-transfer-unpaid-" + aliasSuffix + "-" + System.nanoTime())
                .build());

        Membership product = membershipRepository.save(Membership.builder()
                .name("프리미엄")
                .duration(90)
                .count(30)
                .price((int) price)
                .transferable(true)
                .build());

        ComplexMember member = memberRepository.save(ComplexMember.builder()
                .name(memberName)
                .phoneNumber(phone)
                .branch(branch)
                .build());

        ComplexMemberMembership mm = memberMembershipRepository.save(ComplexMemberMembership.builder()
                .member(member)
                .membership(product)
                .startDate(LocalDate.now())
                .expiryDate(LocalDate.now().plusDays(90))
                .totalCount(30)
                .usedCount(0)
                .price(String.valueOf(price))
                .status(MembershipStatus.활성)
                .transferred(false)
                .build());

        return new Fixture(branch, member, mm);
    }

    private void pay(ComplexMemberMembership mm, long amount, PaymentKind kind) {
        paymentRepository.save(MembershipPayment.builder()
                .memberMembership(mm)
                .amount(amount)
                .paidDate(LocalDateTime.now())
                .method("카드")
                .kind(kind)
                .build());
    }

    private TransferCreateRequest req(ComplexMemberMembership mm) {
        TransferCreateRequest r = new TransferCreateRequest();
        r.setMemberMembershipSeq(mm.getSeq());
        return r;
    }

    @Test
    void 납부기록이_전혀없으면_양도_생성_거부() {
        Fixture f = setup("none", 300_000, "미납A", "01010000001");
        // payments 미생성 → paid = 0, total = 300,000

        assertThatThrownBy(() -> transferService.create(req(f.mm)))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("미수금");
    }

    @Test
    void 부분납부_상태에서_양도_생성_거부() {
        Fixture f = setup("partial", 300_000, "미납B", "01010000002");
        // 디포짓 100,000 + 잔금 일부만 납부 → 아직 200,000 미수금
        pay(f.mm, 100_000, PaymentKind.DEPOSIT);

        assertThatThrownBy(() -> transferService.create(req(f.mm)))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("미수금");
    }

    @Test
    void 완납_상태에서는_양도_생성_허용() {
        Fixture f = setup("full", 300_000, "완납C", "01010000003");
        // 디포짓 100,000 + 잔금 200,000 = 300,000 (정확히 완납)
        pay(f.mm, 100_000, PaymentKind.DEPOSIT);
        pay(f.mm, 200_000, PaymentKind.BALANCE);

        assertThatCode(() -> transferService.create(req(f.mm)))
                .doesNotThrowAnyException();
    }

    @Test
    void 초과납부_상태에서도_양도_생성_허용() {
        Fixture f = setup("over", 300_000, "초과D", "01010000004");
        // 300,000짜리에 추가납부 포함 320,000 납부
        pay(f.mm, 100_000, PaymentKind.DEPOSIT);
        pay(f.mm, 200_000, PaymentKind.BALANCE);
        pay(f.mm, 20_000, PaymentKind.ADDITIONAL);

        assertThatCode(() -> transferService.create(req(f.mm)))
                .doesNotThrowAnyException();
    }

    private record Fixture(Branch branch, ComplexMember member, ComplexMemberMembership mm) {}
}
