package com.culcom.service;

import com.culcom.dto.transfer.TransferCreateRequest;
import com.culcom.dto.transfer.TransferRequestResponse;
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

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * 양도 생성 시 {@code transferFee} 처리 시나리오:
 * 1) 관리자가 직접 지정한 값이 있으면 그대로 사용
 * 2) null이면 잔여 횟수 기반 자동 계산 공식 적용
 * 3) 음수는 거부
 */
@SpringBootTest
@ActiveProfiles("test")
@Transactional
class TransferServiceCreateFeeTest {

    @Autowired TransferService transferService;
    @Autowired BranchRepository branchRepository;
    @Autowired MembershipRepository membershipRepository;
    @Autowired ComplexMemberRepository memberRepository;
    @Autowired ComplexMemberMembershipRepository memberMembershipRepository;
    @Autowired MembershipPaymentRepository paymentRepository;

    private Fixture setup(String aliasSuffix, int total, int used, long price) {
        Branch branch = branchRepository.save(Branch.builder()
                .branchName("테스트지점")
                .alias("test-transfer-fee-" + aliasSuffix + "-" + System.nanoTime())
                .build());

        Membership product = membershipRepository.save(Membership.builder()
                .name("프리미엄")
                .duration(90).count(total).price((int) price)
                .transferable(true).build());

        ComplexMember member = memberRepository.save(ComplexMember.builder()
                .name("양도자-" + aliasSuffix).phoneNumber("010" + String.format("%08d", System.nanoTime() % 100_000_000))
                .branch(branch).build());

        ComplexMemberMembership mm = memberMembershipRepository.save(ComplexMemberMembership.builder()
                .member(member).membership(product)
                .startDate(LocalDate.now()).expiryDate(LocalDate.now().plusDays(90))
                .totalCount(total).usedCount(used)
                .price(String.valueOf(price))
                .status(MembershipStatus.활성).transferred(false).build());

        // 완납 처리 (미수금 차단 경로 회피)
        paymentRepository.save(MembershipPayment.builder()
                .memberMembership(mm).amount(price).paidDate(LocalDateTime.now())
                .method("카드").kind(PaymentKind.DEPOSIT).build());

        return new Fixture(branch, mm);
    }

    private TransferCreateRequest req(ComplexMemberMembership mm, Integer fee) {
        TransferCreateRequest r = new TransferCreateRequest();
        r.setMemberMembershipSeq(mm.getSeq());
        r.setTransferFee(fee);
        return r;
    }

    @Test
    void 관리자가_지정한_양도비는_그대로_저장된다() {
        Fixture f = setup("manual", 30, 0, 300_000);

        TransferRequestResponse res = transferService.create(req(f.mm, 77_777), f.branch.getSeq());

        assertThat(res.getTransferFee()).isEqualTo(77_777);
    }

    @Test
    void transferFee가_null이면_잔여_횟수_기반으로_자동_계산된다() {
        // 잔여 30 - 0 = 30 → 48 이하이므로 30,000
        Fixture f = setup("auto-mid", 30, 0, 300_000);

        TransferRequestResponse res = transferService.create(req(f.mm, null), f.branch.getSeq());

        assertThat(res.getTransferFee()).isEqualTo(30_000);
    }

    @Test
    void 잔여_16이하_자동_20000원() {
        // total 20, used 4 → 잔여 16 → 20,000
        Fixture f = setup("auto-low", 20, 4, 200_000);

        TransferRequestResponse res = transferService.create(req(f.mm, null), f.branch.getSeq());

        assertThat(res.getTransferFee()).isEqualTo(20_000);
    }

    @Test
    void 잔여_49이상_자동_50000원() {
        Fixture f = setup("auto-high", 60, 0, 600_000);

        TransferRequestResponse res = transferService.create(req(f.mm, null), f.branch.getSeq());

        assertThat(res.getTransferFee()).isEqualTo(50_000);
    }

    @Test
    void 관리자가_0으로_지정하면_무료양도() {
        Fixture f = setup("free", 30, 0, 300_000);

        TransferRequestResponse res = transferService.create(req(f.mm, 0), f.branch.getSeq());

        assertThat(res.getTransferFee()).isEqualTo(0);
    }

    @Test
    void 음수_양도비는_거부된다() {
        Fixture f = setup("neg", 30, 0, 300_000);

        assertThatThrownBy(() -> transferService.create(req(f.mm, -1), f.branch.getSeq()))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("0 이상");
    }

    private record Fixture(Branch branch, ComplexMemberMembership mm) {}
}
