package com.culcom.service;

import com.culcom.entity.branch.Branch;
import com.culcom.entity.complex.member.ComplexMember;
import com.culcom.entity.complex.member.ComplexMemberMembership;
import com.culcom.entity.complex.postponement.ComplexPostponementRequest;
import com.culcom.entity.complex.refund.ComplexRefundRequest;
import com.culcom.entity.enums.MembershipStatus;
import com.culcom.entity.enums.RequestStatus;
import com.culcom.entity.enums.TransferStatus;
import com.culcom.entity.product.Membership;
import com.culcom.entity.transfer.TransferRequest;
import com.culcom.repository.BranchRepository;
import com.culcom.repository.ComplexMemberMembershipRepository;
import com.culcom.repository.ComplexMemberRepository;
import com.culcom.repository.ComplexPostponementRequestRepository;
import com.culcom.repository.ComplexRefundRequestRepository;
import com.culcom.repository.MembershipRepository;
import com.culcom.repository.TransferRequestRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * 불변식: 멤버십이 비활성(환불/변경/만료 등)이 되면, 그에 연결된
 * 양도/연기 요청은 **조회에서 배제**되고 **처리(승인/완료/공개링크) 시 거부**된다.
 *
 * 요청 쪽에 별도 상태나 플래그를 두지 않고, 오직 {@code mm.isActive()}만 참조하는
 * 단일 진실원천(SSoT) 설계를 검증한다.
 */
@SpringBootTest
@ActiveProfiles("test")
@Transactional
class InactiveMembershipBlocksRelatedRequestsTest {

    @Autowired RefundService refundService;
    @Autowired PostponementService postponementService;
    @Autowired TransferService transferService;
    @Autowired PostponementReturnScanService postponementReturnScanService;
    @Autowired MemberMembershipService memberMembershipService;

    @Autowired BranchRepository branchRepository;
    @Autowired MembershipRepository membershipRepository;
    @Autowired ComplexMemberRepository memberRepository;
    @Autowired ComplexMemberMembershipRepository memberMembershipRepository;
    @Autowired ComplexRefundRequestRepository refundRequestRepository;
    @Autowired TransferRequestRepository transferRequestRepository;
    @Autowired ComplexPostponementRequestRepository postponementRequestRepository;

    // ─────────────────── 환불 승인 이후 연기 ───────────────────

    @Test
    void 환불된_멤버십에_대한_연기_승인_시도는_거부된다() {
        Fixture f = Fixture.forPostponement(this, "refund-then-postpone-approve");

        refundService.updateStatus(f.refund.getSeq(), RequestStatus.승인, null);

        assertThatThrownBy(() ->
                postponementService.updateStatus(f.postponement.getSeq(), RequestStatus.승인, null))
                .as("환불된 멤버십의 연기 요청은 승인될 수 없어야 한다")
                .isInstanceOf(IllegalStateException.class);
    }

    @Test
    void 환불된_멤버십의_연기_승인_시도해도_만료일은_연장되지_않는다() {
        Fixture f = Fixture.forPostponement(this, "refund-expiry-unchanged");
        LocalDate originalExpiry = f.mm.getExpiryDate();

        refundService.updateStatus(f.refund.getSeq(), RequestStatus.승인, null);

        try {
            postponementService.updateStatus(f.postponement.getSeq(), RequestStatus.승인, null);
        } catch (IllegalStateException ignored) {
            // 정책상 예외 — 부수효과만 검증
        }

        ComplexMemberMembership reloaded = memberMembershipRepository.findById(f.mm.getSeq()).orElseThrow();
        assertThat(reloaded.getExpiryDate())
                .as("환불된 멤버십의 만료일은 어떤 경로로도 연장되어선 안 된다")
                .isEqualTo(originalExpiry);
        assertThat(reloaded.getStatus()).isEqualTo(MembershipStatus.환불);
    }

    @Test
    void 환불된_멤버십의_승인된_연기는_복귀일_스캔에서_배제된다() {
        // given — 승인된 연기가 이미 걸려있는 상황에서 환불
        Fixture f = Fixture.forPostponement(this, "refund-excludes-return-scan");
        LocalDate returnDate = LocalDate.now().plusDays(5);
        ComplexPostponementRequest approved = postponementRequestRepository.save(
                ComplexPostponementRequest.builder()
                        .branch(f.branch).member(f.member).memberMembership(f.mm)
                        .memberName(f.member.getName()).phoneNumber(f.member.getPhoneNumber())
                        .startDate(LocalDate.now().minusDays(2))
                        .endDate(returnDate)   // 복귀일 = scanDate + 1
                        .reason("병가")
                        .status(RequestStatus.승인)
                        .build());

        // 환불 전: 스캔 결과에 포함되어야 한다
        List<ComplexPostponementRequest> beforeRefund =
                postponementRequestRepository.findApprovedByReturnDate(returnDate);
        assertThat(beforeRefund).extracting("seq").contains(approved.getSeq());

        // when — 환불 승인
        refundService.updateStatus(f.refund.getSeq(), RequestStatus.승인, null);

        // then — 스캔 결과에서 배제되어야 한다
        List<ComplexPostponementRequest> afterRefund =
                postponementRequestRepository.findApprovedByReturnDate(returnDate);
        assertThat(afterRefund).extracting("seq")
                .as("환불된 멤버십의 승인 연기는 복귀 SMS 대상에서 제외되어야 한다")
                .doesNotContain(approved.getSeq());
    }

    // ─────────────────── 환불 승인 이후 양도 ───────────────────

    @Test
    void 환불된_멤버십에_대한_양도_공개링크는_사용이_거부된다() {
        Fixture f = Fixture.forTransfer(this, "refund-blocks-public-link");

        refundService.updateStatus(f.refund.getSeq(), RequestStatus.승인, null);

        assertThatThrownBy(() -> transferService.getByToken(f.transfer.getToken()))
                .as("환불된 멤버십의 양도 공개 링크는 접근이 차단되어야 한다")
                .isInstanceOf(IllegalStateException.class);
    }

    @Test
    void 환불된_멤버십에_대한_양도_목록_조회에서_해당_요청은_배제된다() {
        Fixture f = Fixture.forTransfer(this, "refund-excludes-transfer-list");

        // 환불 전: 활성만 필터(activeOnly=true) 목록에 포함
        Page<?> before = transferService.list(
                f.branch.getSeq(), null, null, true, null, false, PageRequest.of(0, 50));
        assertThat(before.getTotalElements())
                .as("환불 전에는 양도 목록(activeOnly)에 포함되어야 한다")
                .isGreaterThanOrEqualTo(1);

        // when — 환불 승인
        refundService.updateStatus(f.refund.getSeq(), RequestStatus.승인, null);

        // then — 활성 멤버십 기준 목록에서 배제되어야 한다
        Page<?> after = transferService.list(
                f.branch.getSeq(), null, null, true, null, false, PageRequest.of(0, 50));
        assertThat(after.getTotalElements())
                .as("환불 후에는 활성 멤버십 기준 양도 목록에서 배제되어야 한다")
                .isZero();
    }

    @Test
    void 환불된_멤버십에_대한_completeTransfer_시도는_거부된다() {
        // 회귀 방지 — 이 가드는 이미 구현되어 있음
        Fixture f = Fixture.forTransfer(this, "refund-blocks-complete");
        // 관리자 확인까지 마친 양도 요청을 가정 — 그 후에 원본 멤버십이 환불되는 시나리오
        f.transfer.setStatus(TransferStatus.확인);
        transferRequestRepository.save(f.transfer);

        ComplexMember newMember = memberRepository.save(ComplexMember.builder()
                .name("양수자").phoneNumber("0109" + (System.nanoTime() % 10_000_000L)).branch(f.branch).build());

        refundService.updateStatus(f.refund.getSeq(), RequestStatus.승인, null);

        assertThatThrownBy(() -> transferService.completeTransfer(f.transfer.getSeq(), newMember.getSeq()))
                .isInstanceOf(IllegalStateException.class);
    }

    // ─────────────────── 멤버십 변경 이후 ───────────────────

    @Test
    void 멤버십_변경으로_종결된_원본에_대한_연기_승인은_거부된다() {
        Fixture f = Fixture.forPostponement(this, "change-blocks-postpone-approve");

        // 원본 멤버십을 "변경" 상태로 전환 (changeMembership의 핵심 부수효과)
        f.mm.setStatus(MembershipStatus.변경);
        memberMembershipRepository.save(f.mm);

        assertThatThrownBy(() ->
                postponementService.updateStatus(f.postponement.getSeq(), RequestStatus.승인, null))
                .as("변경으로 종결된 원본 멤버십에 대한 연기 승인은 거부되어야 한다")
                .isInstanceOf(IllegalStateException.class);
    }

    @Test
    void 멤버십_변경으로_종결된_원본에_대한_양도_공개링크는_거부된다() {
        Fixture f = Fixture.forTransfer(this, "change-blocks-public-link");

        f.mm.setStatus(MembershipStatus.변경);
        memberMembershipRepository.save(f.mm);

        assertThatThrownBy(() -> transferService.getByToken(f.transfer.getToken()))
                .as("변경으로 종결된 원본 멤버십의 양도 공개 링크는 차단되어야 한다")
                .isInstanceOf(IllegalStateException.class);
    }

    // ─────────────────── 테스트 픽스처 ───────────────────

    /**
     * 회원 + 활성 멤버십 + (양도 요청 or 대기 연기 요청) + 대기 환불 요청을 한 번에 생성하는 헬퍼.
     * 각 테스트에서 alias prefix만 달리 주고 재사용한다.
     */
    private static class Fixture {
        Branch branch;
        ComplexMember member;
        ComplexMemberMembership mm;
        TransferRequest transfer;
        ComplexPostponementRequest postponement;
        ComplexRefundRequest refund;

        static Fixture forTransfer(InactiveMembershipBlocksRelatedRequestsTest t, String aliasPrefix) {
            Fixture f = baseFixture(t, aliasPrefix, /*transferable*/ true);
            f.transfer = t.transferRequestRepository.save(TransferRequest.builder()
                    .memberMembership(f.mm)
                    .fromMember(f.member)
                    .branch(f.branch)
                    .transferFee(20000)
                    .remainingCount(10)
                    .token(UUID.randomUUID().toString().replace("-", ""))
                    .status(TransferStatus.생성)
                    .build());
            return f;
        }

        static Fixture forPostponement(InactiveMembershipBlocksRelatedRequestsTest t, String aliasPrefix) {
            Fixture f = baseFixture(t, aliasPrefix, /*transferable*/ false);
            f.postponement = t.postponementRequestRepository.save(ComplexPostponementRequest.builder()
                    .branch(f.branch).member(f.member).memberMembership(f.mm)
                    .memberName(f.member.getName()).phoneNumber(f.member.getPhoneNumber())
                    .startDate(LocalDate.now().plusDays(10))
                    .endDate(LocalDate.now().plusDays(20))
                    .reason("출장")
                    .status(RequestStatus.대기)
                    .build());
            return f;
        }

        private static Fixture baseFixture(InactiveMembershipBlocksRelatedRequestsTest t,
                                           String aliasPrefix, boolean transferable) {
            Fixture f = new Fixture();
            String uniq = Long.toHexString(System.nanoTime());
            f.branch = t.branchRepository.save(Branch.builder()
                    .branchName("테스트지점")
                    .alias(aliasPrefix + "-" + uniq)
                    .build());
            Membership product = t.membershipRepository.save(Membership.builder()
                    .name("10회권").duration(60).count(10).price(150000)
                    .transferable(transferable).build());
            f.member = t.memberRepository.save(ComplexMember.builder()
                    .name("홍길동").phoneNumber("0101111" + (System.nanoTime() % 10000)).branch(f.branch).build());
            f.mm = t.memberMembershipRepository.save(ComplexMemberMembership.builder()
                    .member(f.member).membership(product)
                    .startDate(LocalDate.now())
                    .expiryDate(LocalDate.now().plusDays(60))
                    .totalCount(10).usedCount(0)
                    .status(MembershipStatus.활성)
                    .build());
            f.refund = t.refundRequestRepository.save(ComplexRefundRequest.builder()
                    .branch(f.branch).member(f.member).memberMembership(f.mm)
                    .memberName(f.member.getName()).phoneNumber(f.member.getPhoneNumber())
                    .membershipName(product.getName()).price("150000")
                    .reason("개인사정")
                    .status(RequestStatus.대기)
                    .build());
            return f;
        }
    }
}
