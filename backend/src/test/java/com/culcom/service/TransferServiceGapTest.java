package com.culcom.service;

import com.culcom.dto.transfer.TransferCreateRequest;
import com.culcom.entity.branch.Branch;
import com.culcom.entity.complex.member.ComplexMember;
import com.culcom.entity.complex.member.ComplexMemberMembership;
import com.culcom.entity.complex.member.MembershipPayment;
import com.culcom.entity.enums.MembershipStatus;
import com.culcom.entity.enums.PaymentKind;
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

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * 양도 경로의 검증 공백 시뮬레이션(프로덕션 코드 수정 없음).
 *
 * A. create — 환불/만료/정지 상태인 멤버십에 양도 요청을 만들 수 있는가
 *   → PostponementService/RefundService와 동일한 isActive 가드가 있어야 한다고 기대.
 *
 * B. completeTransfer — 요청 생성 후 완료 전에 원본 멤버십이 환불되면
 *   양도 완료가 차단되어야 한다 (경쟁 조건).
 *
 * C. completeTransfer — 양도자 == 양수자(자기 자신에게 양도) 는 거부되어야 한다.
 *
 * 세 케이스 모두 현재 코드에 가드가 없으므로 실패할 것으로 예상.
 */
@SpringBootTest
@ActiveProfiles("test")
@Transactional
class TransferServiceGapTest {

    @Autowired TransferService transferService;
    @Autowired BranchRepository branchRepository;
    @Autowired MembershipRepository membershipRepository;
    @Autowired ComplexMemberRepository memberRepository;
    @Autowired ComplexMemberMembershipRepository memberMembershipRepository;
    @Autowired MembershipPaymentRepository paymentRepository;
    @Autowired TransferRequestRepository transferRequestRepository;

    private Fixture setup(String suffix) {
        Branch branch = branchRepository.save(Branch.builder()
                .branchName("테스트지점")
                .alias("test-transfer-gap-" + suffix + "-" + System.nanoTime())
                .build());
        Membership product = membershipRepository.save(Membership.builder()
                .name("프리미엄").duration(90).count(30).price(300_000)
                .transferable(true).build());
        ComplexMember member = memberRepository.save(ComplexMember.builder()
                .name("양도자").phoneNumber("01030000" + Math.abs(suffix.hashCode() % 1000))
                .branch(branch).build());
        return new Fixture(branch, product, member);
    }

    private ComplexMemberMembership makeMm(Fixture f, MembershipStatus status, LocalDate expiry) {
        ComplexMemberMembership mm = memberMembershipRepository.save(ComplexMemberMembership.builder()
                .member(f.member).membership(f.product)
                .startDate(LocalDate.now().minusDays(5))
                .expiryDate(expiry)
                .totalCount(30).usedCount(0)
                .price("300000")
                .status(status)
                .transferred(false)
                .build());
        // 완납 처리 (미수금 가드에 걸리지 않도록)
        paymentRepository.save(MembershipPayment.builder()
                .memberMembership(mm).amount(300_000L)
                .paidDate(LocalDateTime.now()).method("카드").kind(PaymentKind.BALANCE).build());
        return mm;
    }

    private TransferCreateRequest req(Long mmSeq) {
        TransferCreateRequest r = new TransferCreateRequest();
        r.setMemberMembershipSeq(mmSeq);
        return r;
    }

    // ── A. create — 비활성 상태 멤버십에서 양도 요청 생성 차단 ─────────────────
    //
    // 각 거부 케이스는 3가지를 동시에 검증:
    //   (1) 예외 타입 + 메시지 내용 ("사용할 수 없는" 같은 계약 문구)
    //   (2) transfer_requests 테이블에 row가 생성되지 않음 (부작용 없음)
    //   (3) 원본 멤버십 자체가 수정되지 않음 (불변성)

    @Test
    void A1_status_환불_멤버십에_양도요청_생성은_거부된다() {
        Fixture f = setup("A1");
        ComplexMemberMembership mm = makeMm(f, MembershipStatus.환불, LocalDate.now().plusDays(80));
        assertRejected(f, mm);
    }

    @Test
    void A2_status_만료_멤버십에_양도요청_생성은_거부된다() {
        Fixture f = setup("A2");
        ComplexMemberMembership mm = makeMm(f, MembershipStatus.만료, LocalDate.now().minusDays(1));
        assertRejected(f, mm);
    }

    @Test
    void A3_status_정지_멤버십에_양도요청_생성은_거부된다() {
        Fixture f = setup("A3");
        ComplexMemberMembership mm = makeMm(f, MembershipStatus.정지, LocalDate.now().plusDays(80));
        assertRejected(f, mm);
    }

    /**
     * 파생 비활성: status는 활성이지만 expiryDate가 이미 과거.
     * isActive()는 status + expiryDate + usedCount/totalCount 세 축을 동시에 본다.
     * 스케줄러가 만료 전환하기 전 구간에 양도 요청이 들어오는 경우를 시뮬레이션.
     */
    @Test
    void A4_만료일이_과거인_활성_멤버십은_양도요청_생성이_거부된다() {
        Fixture f = setup("A4");
        // 명시적으로 status는 활성, 그러나 expiryDate가 어제
        ComplexMemberMembership mm = memberMembershipRepository.save(ComplexMemberMembership.builder()
                .member(f.member).membership(f.product)
                .startDate(LocalDate.now().minusDays(100))
                .expiryDate(LocalDate.now().minusDays(1))
                .totalCount(30).usedCount(10)
                .price("300000")
                .status(MembershipStatus.활성)  // ← 여기가 활성이어도
                .transferred(false)
                .build());
        paymentRepository.save(MembershipPayment.builder()
                .memberMembership(mm).amount(300_000L)
                .paidDate(LocalDateTime.now()).method("카드").kind(PaymentKind.BALANCE).build());

        // 사전 조건: status는 활성, isActive()는 false
        assertThat(mm.getStatus()).isEqualTo(MembershipStatus.활성);
        assertThat(mm.isActive()).isFalse();

        assertRejected(f, mm);
    }

    /**
     * 파생 비활성: status는 활성이지만 usedCount가 totalCount와 같음(횟수 소진).
     */
    @Test
    void A5_횟수_소진된_활성_멤버십은_양도요청_생성이_거부된다() {
        Fixture f = setup("A5");
        ComplexMemberMembership mm = memberMembershipRepository.save(ComplexMemberMembership.builder()
                .member(f.member).membership(f.product)
                .startDate(LocalDate.now().minusDays(5))
                .expiryDate(LocalDate.now().plusDays(80))
                .totalCount(30).usedCount(30)  // ← 정확히 소진
                .price("300000")
                .status(MembershipStatus.활성)
                .transferred(false)
                .build());
        paymentRepository.save(MembershipPayment.builder()
                .memberMembership(mm).amount(300_000L)
                .paidDate(LocalDateTime.now()).method("카드").kind(PaymentKind.BALANCE).build());

        assertThat(mm.getStatus()).isEqualTo(MembershipStatus.활성);
        assertThat(mm.isActive()).isFalse();

        assertRejected(f, mm);
    }

    /**
     * 양성 비교: 모든 축(status=활성, expiryDate 미래, 횟수 여유, 완납, transferable, not transferred)이
     * 맞으면 정상 생성되고 transfer_requests에 row가 1개 존재해야 한다.
     * 이 케이스가 깨지면 가드가 너무 넓게 걸린 것이므로 즉시 회귀를 알린다.
     */
    @Test
    void A6_진짜_활성_멤버십은_양도요청이_정상_생성된다() {
        Fixture f = setup("A6");
        ComplexMemberMembership mm = makeMm(f, MembershipStatus.활성, LocalDate.now().plusDays(80));
        long before = transferRequestRepository.count();

        assertThatCode(() -> transferService.create(req(mm.getSeq())))
                .doesNotThrowAnyException();

        assertThat(transferRequestRepository.count())
                .as("양성 케이스에서는 transfer_requests에 row가 정확히 1개 더 생성되어야 한다")
                .isEqualTo(before + 1);
    }

    /**
     * 가드가 가장 먼저 걸리는지 검증 — isActive 체크가 transferable/transferred/미수금 체크보다
     * 앞에 있어야, 환불된 멤버십인데 '양도 불가 상품'이라는 부정확한 메시지를 띄우지 않는다.
     */
    @Test
    void A7_환불_AND_양도불가_AND_미납인_멤버십은_isActive_메시지를_먼저_던진다() {
        // 브랜치/회원은 공통이지만 양도 불가 상품 + 환불 + 미납 상태를 직접 만든다
        Branch branch = branchRepository.save(Branch.builder()
                .branchName("테스트지점").alias("test-transfer-gap-A7-" + System.nanoTime()).build());
        Membership nonTransferable = membershipRepository.save(Membership.builder()
                .name("양도불가권").duration(90).count(30).price(300_000)
                .transferable(false).build());
        ComplexMember m = memberRepository.save(ComplexMember.builder()
                .name("꼬인상황").phoneNumber("01030009999").branch(branch).build());
        ComplexMemberMembership mm = memberMembershipRepository.save(ComplexMemberMembership.builder()
                .member(m).membership(nonTransferable)
                .startDate(LocalDate.now().minusDays(5))
                .expiryDate(LocalDate.now().plusDays(80))
                .totalCount(30).usedCount(0)
                .price("300000")
                .status(MembershipStatus.환불)   // ← isActive=false
                .transferred(false)
                .build());
        // 납부 미존재 → 미수금도 있음

        assertThatThrownBy(() -> transferService.create(req(mm.getSeq())))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("사용할 수 없는")
                .as("isActive 가드가 가장 먼저 걸려야 한다 (나중 가드의 메시지가 노출되면 안 됨)");
    }

    /** A1~A5에서 공통 사용: 거부 + 부작용 없음 + 멤버십 불변성 검증. */
    private void assertRejected(Fixture f, ComplexMemberMembership mm) {
        long beforeTransferCount = transferRequestRepository.count();
        MembershipStatus beforeStatus = mm.getStatus();
        Integer beforeUsedCount = mm.getUsedCount();

        assertThatThrownBy(() -> transferService.create(req(mm.getSeq())))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("사용할 수 없는");

        // 부작용 없음
        assertThat(transferRequestRepository.count())
                .as("거부된 요청은 transfer_requests에 row를 남기지 않아야 한다")
                .isEqualTo(beforeTransferCount);

        // 멤버십 불변성
        ComplexMemberMembership reloaded = memberMembershipRepository.findById(mm.getSeq()).orElseThrow();
        assertThat(reloaded.getStatus()).isEqualTo(beforeStatus);
        assertThat(reloaded.getUsedCount()).isEqualTo(beforeUsedCount);
    }

    // ── B. completeTransfer — 생성 후 환불된 멤버십은 양도 완료 불가 ──────────

    @Test
    void B1_양도요청_생성후_원본멤버십이_환불되면_완료는_거부되어야_한다() {
        Fixture f = setup("B1");
        ComplexMemberMembership mm = makeMm(f, MembershipStatus.활성, LocalDate.now().plusDays(80));

        // 정상 상태에서 요청 생성 후 관리자 확인까지 완료된 상태를 가정
        TransferRequest tr = transferRequestRepository.save(TransferRequest.builder()
                .memberMembership(mm).fromMember(f.member).branch(f.branch)
                .transferFee(30_000).remainingCount(30)
                .token(UUID.randomUUID().toString().replace("-", ""))
                .status(com.culcom.entity.enums.TransferStatus.확인)
                .build());

        // 그 사이 환불이 승인되어 멤버십 상태가 환불로 바뀐 상황 시뮬레이션
        mm.setStatus(MembershipStatus.환불);
        memberMembershipRepository.save(mm);

        // 양수자 회원 등록
        ComplexMember newMember = memberRepository.save(ComplexMember.builder()
                .name("양수자").phoneNumber("01099999990").branch(f.branch).build());

        // 완료 시도 — 원본이 이미 환불되었으므로 거부되어야 한다
        assertThatThrownBy(() -> transferService.completeTransfer(tr.getSeq(), newMember.getSeq()))
                .isInstanceOf(IllegalStateException.class);
    }

    // ── C. completeTransfer — 자기 자신에게 양도 차단 ─────────────────────────

    @Test
    void C1_자기_자신에게_양도완료는_거부되어야_한다() {
        Fixture f = setup("C1");
        ComplexMemberMembership mm = makeMm(f, MembershipStatus.활성, LocalDate.now().plusDays(80));

        TransferRequest tr = transferRequestRepository.save(TransferRequest.builder()
                .memberMembership(mm).fromMember(f.member).branch(f.branch)
                .transferFee(30_000).remainingCount(30)
                .token(UUID.randomUUID().toString().replace("-", ""))
                .status(com.culcom.entity.enums.TransferStatus.확인)
                .build());

        // 양도자 == 양수자
        assertThatThrownBy(() -> transferService.completeTransfer(tr.getSeq(), f.member.getSeq()))
                .isInstanceOf(IllegalStateException.class);
    }

    private record Fixture(Branch branch, Membership product, ComplexMember member) {}
}
