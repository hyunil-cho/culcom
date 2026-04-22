package com.culcom.service;

import com.culcom.dto.transfer.TransferCreateRequest;
import com.culcom.entity.branch.Branch;
import com.culcom.entity.complex.member.ComplexMember;
import com.culcom.entity.complex.member.ComplexMemberMembership;
import com.culcom.entity.complex.member.MembershipPayment;
import com.culcom.entity.enums.MembershipStatus;
import com.culcom.entity.enums.PaymentKind;
import com.culcom.entity.enums.TransferStatus;
import com.culcom.entity.product.Membership;
import com.culcom.entity.transfer.TransferRequest;
import com.culcom.repository.*;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

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
    @Autowired TransferRequestRepository transferRequestRepository;

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

    // ── completeTransfer 시점 미수금 재검증 ──
    //
    // create() 에서 이미 미수금을 걸러내지만, 요청 생성 이후 완료 전까지 납부 기록이
    // 삭제/수정될 수 있는 운영 시나리오가 존재한다. 같은 가드를 complete 시점에도 붙여
    // "확인 단계까지 올라간 양도 요청이 미수금 상태에서 완료되는" 사고를 방어한다.

    /** 관리자 확인까지 완료된 양도 요청 준비 (status=확인). 납부 상태는 호출부가 제어한다. */
    private TransferRequest confirmedTransfer(Fixture f) {
        return transferRequestRepository.save(TransferRequest.builder()
                .memberMembership(f.mm)
                .fromMember(f.member)
                .branch(f.branch)
                .transferFee(30_000)
                .remainingCount(30)
                .token(UUID.randomUUID().toString().replace("-", ""))
                .status(TransferStatus.확인)
                .build());
    }

    private ComplexMember newRecipient(Fixture f, String suffix) {
        return memberRepository.save(ComplexMember.builder()
                .name("양수자-" + suffix)
                .phoneNumber("0109" + (Math.abs(System.nanoTime()) % 10_000_000L))
                .branch(f.branch)
                .build());
    }

    @Test
    void completeTransfer_미납상태면_거부된다() {
        Fixture f = setup("cu", 300_000, "미납E", "01010000005");
        // 납부 기록 없음 → paid=0, total=300,000
        TransferRequest tr = confirmedTransfer(f);
        ComplexMember to = newRecipient(f, "E");

        assertThatThrownBy(() -> transferService.completeTransfer(tr.getSeq(), to.getSeq()))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("미수금");
    }

    @Test
    void completeTransfer_부분납부상태면_거부된다() {
        Fixture f = setup("cp", 300_000, "부분F", "01010000006");
        pay(f.mm, 100_000, PaymentKind.DEPOSIT); // 200,000 미수
        TransferRequest tr = confirmedTransfer(f);
        ComplexMember to = newRecipient(f, "F");

        assertThatThrownBy(() -> transferService.completeTransfer(tr.getSeq(), to.getSeq()))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("미수금");
    }

    @Test
    void completeTransfer_완납상태면_허용된다() {
        Fixture f = setup("cf", 300_000, "완납G", "01010000007");
        pay(f.mm, 100_000, PaymentKind.DEPOSIT);
        pay(f.mm, 200_000, PaymentKind.BALANCE);
        TransferRequest tr = confirmedTransfer(f);
        ComplexMember to = newRecipient(f, "G");

        assertThatCode(() -> transferService.completeTransfer(tr.getSeq(), to.getSeq()))
                .doesNotThrowAnyException();
    }

    /**
     * 경쟁 시나리오: 요청 생성 시점엔 완납이었지만 그 사이에 납부 기록이 삭제되어
     * 완료 직전 미수금이 발생한 경우 → complete 시점에 가드가 걸려야 한다.
     */
    @Test
    void completeTransfer_create이후_납부기록이_사라지면_거부된다() {
        Fixture f = setup("cr", 300_000, "경쟁H", "01010000008");
        // 요청 생성용 납부 (create 통과)
        MembershipPayment deposit = paymentRepository.save(MembershipPayment.builder()
                .memberMembership(f.mm).amount(100_000L)
                .paidDate(LocalDateTime.now()).method("카드").kind(PaymentKind.DEPOSIT).build());
        MembershipPayment balance = paymentRepository.save(MembershipPayment.builder()
                .memberMembership(f.mm).amount(200_000L)
                .paidDate(LocalDateTime.now()).method("카드").kind(PaymentKind.BALANCE).build());

        // 요청 생성이 정상 통과
        transferService.create(req(f.mm));

        // 관리자 확인까지 마친 상태로 세팅
        TransferRequest tr = confirmedTransfer(f);

        // 그 사이 운영자가 납부 기록을 삭제해버려서 미수금이 다시 생긴 상황
        paymentRepository.delete(balance);
        paymentRepository.flush();

        ComplexMember to = newRecipient(f, "H");
        assertThatThrownBy(() -> transferService.completeTransfer(tr.getSeq(), to.getSeq()))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("미수금");

        // 부수효과 검증: 원본 멤버십은 여전히 활성이어야 한다 (양도 이전이 진행되지 않음)
        ComplexMemberMembership reloaded = memberMembershipRepository.findById(f.mm.getSeq()).orElseThrow();
        org.assertj.core.api.Assertions.assertThat(reloaded.getStatus()).isEqualTo(MembershipStatus.활성);
        // 사용한 deposit 변수는 기록 보존용 — 삭제 대상이 아님을 명시
        org.assertj.core.api.Assertions.assertThat(deposit.getSeq()).isNotNull();
    }

    private record Fixture(Branch branch, ComplexMember member, ComplexMemberMembership mm) {}
}
