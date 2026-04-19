package com.culcom.service;

import com.culcom.dto.transfer.TransferCreateRequest;
import com.culcom.dto.transfer.TransferRequestResponse;
import com.culcom.entity.branch.Branch;
import com.culcom.entity.complex.member.ComplexMember;
import com.culcom.entity.complex.member.ComplexMemberMembership;
import com.culcom.entity.complex.member.MembershipPayment;
import com.culcom.entity.complex.member.track.MemberActivityLog;
import com.culcom.entity.enums.ActivityEventType;
import com.culcom.entity.enums.MembershipStatus;
import com.culcom.entity.enums.PaymentKind;
import com.culcom.entity.product.Membership;
import com.culcom.repository.*;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.transaction.TestTransaction;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * TransferService.create() 핵심 시나리오:
 *  1) 양도 불가 상품(transferable=false)은 거부
 *  2) 이미 양도로 받은 멤버십(transferred=true)은 재양도 불가
 *  3) 미수금이 있으면 거부
 *  4) 관리자가 지정한 transferFee가 있으면 그 값을 사용
 *  5) 양도자의 활동 히스토리에 TRANSFER_REQUEST 이벤트가 남는다
 */
@SpringBootTest
@ActiveProfiles("test")
@Transactional
class TransferServiceCreateScenarioTest {

    @Autowired TransferService transferService;
    @Autowired BranchRepository branchRepository;
    @Autowired MembershipRepository membershipRepository;
    @Autowired ComplexMemberRepository memberRepository;
    @Autowired ComplexMemberMembershipRepository memberMembershipRepository;
    @Autowired MembershipPaymentRepository paymentRepository;
    @Autowired MemberActivityLogRepository memberActivityLogRepository;

    private Fixture setup(String suffix, boolean transferable, boolean transferred, boolean fullyPaid) {
        long nonce = System.nanoTime();
        Branch branch = branchRepository.save(Branch.builder()
                .branchName("테스트지점")
                .alias("tc-" + suffix + "-" + nonce)
                .build());

        Membership product = membershipRepository.save(Membership.builder()
                .name("프리미엄-" + suffix + "-" + nonce)
                .duration(90).count(30).price(300_000)
                .transferable(transferable).build());

        ComplexMember member = memberRepository.save(ComplexMember.builder()
                .name("양도자-" + suffix)
                .phoneNumber("010" + String.format("%08d", System.nanoTime() % 100_000_000))
                .branch(branch).build());

        ComplexMemberMembership mm = memberMembershipRepository.save(ComplexMemberMembership.builder()
                .member(member).membership(product)
                .startDate(LocalDate.now()).expiryDate(LocalDate.now().plusDays(90))
                .totalCount(30).usedCount(0)
                .price("300000")
                .status(MembershipStatus.활성)
                .transferred(transferred)
                .build());

        if (fullyPaid) {
            paymentRepository.save(MembershipPayment.builder()
                    .memberMembership(mm).amount(300_000L).paidDate(LocalDateTime.now())
                    .method("카드").kind(PaymentKind.BALANCE).build());
        }

        return new Fixture(branch, member, mm);
    }

    private TransferCreateRequest req(ComplexMemberMembership mm, Integer fee) {
        TransferCreateRequest r = new TransferCreateRequest();
        r.setMemberMembershipSeq(mm.getSeq());
        r.setTransferFee(fee);
        return r;
    }

    @Test
    @Transactional
    void 양도불가_상품은_양도요청_생성이_거부된다() {
        Fixture f = setup("non-transferable", false, false, true);

        assertThatThrownBy(() -> transferService.create(req(f.mm, null)))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("양도 불가");
    }

    @Test
    @Transactional
    void 이미_양도로_받은_멤버십은_재양도할_수_없다() {
        // transferred=true → 양도로 받은 멤버십
        Fixture f = setup("retransfer", true, true, true);

        assertThatThrownBy(() -> transferService.create(req(f.mm, null)))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("재양도");
    }

    @Test
    @Transactional
    void 미수금이_있는_멤버십은_양도요청_생성이_거부된다() {
        // fullyPaid=false → 납부 기록 없음 → 전액 미수금
        Fixture f = setup("unpaid", true, false, false);

        assertThatThrownBy(() -> transferService.create(req(f.mm, null)))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("미수금");
    }

    @Test
    @Transactional
    void 관리자가_지정한_양도비가_있으면_그_값을_사용한다() {
        // 자동 계산이면 30,000원(잔여 30)이 되었을 상황에서 관리자가 12,345원 지정
        Fixture f = setup("admin-fee", true, false, true);

        TransferRequestResponse res = transferService.create(req(f.mm, 12_345));

        assertThat(res.getTransferFee()).isEqualTo(12_345);
    }

    @Test
    void 양도요청_생성_시_양도자_히스토리에_TRANSFER_REQUEST_이벤트가_남는다() {
        // BEFORE_COMMIT 리스너가 활동 로그를 저장하므로, 테스트 트랜잭션을 commit해야 로그가 기록된다.
        Fixture f = setup("history", true, false, true);
        Long memberSeq = f.member.getSeq();
        Long mmSeq = f.mm.getSeq();

        // 1) 셋업 commit
        TestTransaction.flagForCommit();
        TestTransaction.end();

        // 2) 서비스 호출 (자체 트랜잭션 → commit 시 BEFORE_COMMIT 리스너 발화)
        TransferCreateRequest r = new TransferCreateRequest();
        r.setMemberMembershipSeq(mmSeq);
        transferService.create(r);

        // 3) 검증용 새 트랜잭션 (읽기 전용 — 롤백으로 종료)
        TestTransaction.start();
        TestTransaction.flagForRollback();

        List<MemberActivityLog> logs = memberActivityLogRepository
                .findByMemberSeqOrderByCreatedDateDesc(memberSeq);

        assertThat(logs)
                .as("양도 요청 생성 시 양도자 히스토리에 TRANSFER_REQUEST 이벤트가 최소 1건 기록되어야 한다")
                .anySatisfy(log -> {
                    assertThat(log.getEventType()).isEqualTo(ActivityEventType.TRANSFER_REQUEST);
                    assertThat(log.getMemberMembershipSeq()).isEqualTo(mmSeq);
                    assertThat(log.getNote())
                            .as("노트에 멤버십 이름과 잔여 횟수가 포함되어야 한다")
                            .contains("프리미엄")
                            .contains("잔여 30회");
                });
    }

    private record Fixture(Branch branch, ComplexMember member, ComplexMemberMembership mm) {}
}
