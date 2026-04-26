package com.culcom.service;

import com.culcom.dto.complex.member.ComplexMemberRequest;
import com.culcom.entity.branch.Branch;
import com.culcom.entity.complex.member.ComplexMember;
import com.culcom.entity.complex.member.ComplexMemberMembership;
import com.culcom.entity.complex.postponement.ComplexPostponementRequest;
import com.culcom.entity.complex.refund.ComplexRefundRequest;
import com.culcom.entity.enums.MembershipStatus;
import com.culcom.entity.enums.RequestStatus;
import com.culcom.entity.enums.SmsEventType;
import com.culcom.entity.enums.TransferStatus;
import com.culcom.entity.product.Membership;
import com.culcom.entity.transfer.TransferRequest;
import com.culcom.repository.*;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoSpyBean;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.atLeastOnce;
import static org.mockito.Mockito.clearInvocations;
import static org.mockito.Mockito.verify;

/**
 * 사용자 알림(SMS) 이벤트가 각 비즈니스 이벤트에서 실제로 트리거되는지 검증.
 *
 * 발견 사항 (프로덕션 코드를 읽어서 확인):
 *   - 구현됨 : 회원 등록 (ComplexMemberService.create → SmsEventType.회원등록)
 *   - 구현됨 : 고객 등록 (CustomerService.create → SmsEventType.고객등록)
 *   - 미구현 : 연기 승인/반려
 *   - 미구현 : 환불 승인/반려
 *   - 미구현 : 양도 승인(확인)/거절
 *
 * SmsEventType enum에도 {예약확정, 고객등록, 회원등록} 3개뿐이라,
 * 연기/환불/양도 관련 이벤트 타입 자체가 정의되어 있지 않다.
 *
 * 이 테스트는 "있어야 할" 이벤트가 실제로 발행되는지 검증한다. 따라서:
 *   - 회원 등록 케이스는 현재 코드로도 통과해야 한다
 *   - 나머지 케이스는 현재 코드에서는 실패한다 (= 구현 필요)
 *
 * 기대 이벤트 타입은 가상의 명칭으로 문자열 비교 없이 호출 여부만 검증한다.
 * (아직 정의되지 않은 enum 값을 사용할 수 없으므로 호출 카운트로 간접 검증.)
 */
@SpringBootTest
@ActiveProfiles("test")
@Transactional
class SmsEventDispatchTest {

    @MockitoSpyBean SmsService smsService;

    @Autowired ComplexMemberService complexMemberService;
    @Autowired PostponementService postponementService;
    @Autowired RefundService refundService;
    @Autowired TransferService transferService;

    @Autowired BranchRepository branchRepository;
    @Autowired MembershipRepository membershipRepository;
    @Autowired ComplexMemberRepository memberRepository;
    @Autowired ComplexMemberMembershipRepository memberMembershipRepository;
    @Autowired ComplexPostponementRequestRepository postponementRepository;
    @Autowired ComplexRefundRequestRepository refundRepository;
    @Autowired TransferRequestRepository transferRequestRepository;
    @Autowired MembershipPaymentRepository paymentRepository;

    // ── 공통 fixture ────────────────────────────────────────────────────

    private Branch branch(String suffix) {
        return branchRepository.save(Branch.builder()
                .branchName("테스트지점")
                .alias("test-sms-event-" + suffix + "-" + System.nanoTime())
                .build());
    }

    private Membership product() {
        return membershipRepository.save(Membership.builder()
                .name("3개월권").duration(90).count(30).price(300_000).transferable(true).build());
    }

    private ComplexMember member(Branch b, String name, String phone) {
        return memberRepository.save(ComplexMember.builder()
                .name(name).phoneNumber(phone).branch(b).build());
    }

    private ComplexMemberMembership activeMm(ComplexMember m, Membership p) {
        ComplexMemberMembership mm = memberMembershipRepository.save(ComplexMemberMembership.builder()
                .member(m).membership(p)
                .startDate(LocalDate.now().minusDays(5))
                .expiryDate(LocalDate.now().plusDays(80))
                .totalCount(30).usedCount(0)
                .postponeTotal(5).postponeUsed(0)
                .price("300000")
                .status(MembershipStatus.활성)
                .build());
        // 완납 처리
        paymentRepository.save(com.culcom.entity.complex.member.MembershipPayment.builder()
                .memberMembership(mm).amount(300_000L)
                .paidDate(java.time.LocalDateTime.now())
                .method("카드")
                .kind(com.culcom.entity.enums.PaymentKind.BALANCE)
                .build());
        return mm;
    }

    // ── 1) 회원 등록 ─ 이미 구현됨 ─────────────────────────────────────

    @Test
    void 회원등록_시_회원등록_SMS_이벤트가_발송된다() {
        Branch b = branch("member-create");
        clearInvocations(smsService);

        ComplexMemberRequest req = new ComplexMemberRequest();
        String 홍길동 = UUID.randomUUID().toString();
        req.setName(홍길동);
        req.setPhoneNumber("01011112222");
        complexMemberService.create(req, b.getSeq());

        verify(smsService, atLeastOnce()).sendEventSmsIfConfigured(
                eq(b.getSeq()), eq(SmsEventType.회원등록), eq(홍길동), eq("01011112222"));
    }

    // ── 2) 연기 승인/반려 ─ 현재 미구현 (예상 실패) ────────────────────

    @Test
    void 연기_승인_시_SMS_이벤트가_발송되어야_한다() {
        Branch b = branch("postpone-approve");
        Membership p = product();
        ComplexMember m = member(b, "연기승인자", "01020000001");
        ComplexMemberMembership mm = activeMm(m, p);

        ComplexPostponementRequest pr = postponementRepository.save(ComplexPostponementRequest.builder()
                .branch(b).member(m).memberMembership(mm)
                .memberName(m.getName()).phoneNumber(m.getPhoneNumber())
                .startDate(LocalDate.now().plusDays(1)).endDate(LocalDate.now().plusDays(7))
                .reason("출장")
                .build());
        clearInvocations(smsService);

        postponementService.updateStatus(pr.getSeq(), RequestStatus.승인, null);

        // 승인 시 회원에게 알림이 가야 한다 — 어떤 이벤트 타입이든 최소 1회 발송이 기대된다
        verify(smsService, atLeastOnce()).sendEventSmsIfConfigured(
                eq(b.getSeq()), any(SmsEventType.class),
                eq(m.getName()), eq(m.getPhoneNumber()), any());
    }

    @Test
    void 연기_반려_시_SMS_이벤트가_발송되어야_한다() {
        Branch b = branch("postpone-reject");
        Membership p = product();
        ComplexMember m = member(b, "연기반려자", "01020000002");
        ComplexMemberMembership mm = activeMm(m, p);

        ComplexPostponementRequest pr = postponementRepository.save(ComplexPostponementRequest.builder()
                .branch(b).member(m).memberMembership(mm)
                .memberName(m.getName()).phoneNumber(m.getPhoneNumber())
                .startDate(LocalDate.now().plusDays(1)).endDate(LocalDate.now().plusDays(7))
                .reason("개인사정")
                .build());
        clearInvocations(smsService);

        postponementService.updateStatus(pr.getSeq(), RequestStatus.반려, "일정 상 불가");

        verify(smsService, atLeastOnce()).sendEventSmsIfConfigured(
                eq(b.getSeq()), any(SmsEventType.class),
                eq(m.getName()), eq(m.getPhoneNumber()), any());
    }

    // ── 3) 환불 승인/반려 ─ 현재 미구현 (예상 실패) ────────────────────

    @Test
    void 환불_승인_시_SMS_이벤트가_발송되어야_한다() {
        Branch b = branch("refund-approve");
        Membership p = product();
        ComplexMember m = member(b, "환불승인자", "01020000003");
        ComplexMemberMembership mm = activeMm(m, p);

        ComplexRefundRequest rr = refundRepository.save(ComplexRefundRequest.builder()
                .branch(b).member(m).memberMembership(mm)
                .memberName(m.getName()).phoneNumber(m.getPhoneNumber())
                .membershipName(p.getName()).price("300000")
                .reason("단순변심")
                .build());
        clearInvocations(smsService);

        refundService.updateStatus(rr.getSeq(), RequestStatus.승인, null);

        verify(smsService, atLeastOnce()).sendEventSmsIfConfigured(
                eq(b.getSeq()), any(SmsEventType.class),
                eq(m.getName()), eq(m.getPhoneNumber()), any());
    }

    @Test
    void 환불_반려_시_SMS_이벤트가_발송되어야_한다() {
        Branch b = branch("refund-reject");
        Membership p = product();
        ComplexMember m = member(b, "환불반려자", "01020000004");
        ComplexMemberMembership mm = activeMm(m, p);

        ComplexRefundRequest rr = refundRepository.save(ComplexRefundRequest.builder()
                .branch(b).member(m).memberMembership(mm)
                .memberName(m.getName()).phoneNumber(m.getPhoneNumber())
                .membershipName(p.getName()).price("300000")
                .reason("단순변심")
                .build());
        clearInvocations(smsService);

        refundService.updateStatus(rr.getSeq(), RequestStatus.반려, "규정 상 불가");

        verify(smsService, atLeastOnce()).sendEventSmsIfConfigured(
                eq(b.getSeq()), any(SmsEventType.class),
                eq(m.getName()), eq(m.getPhoneNumber()), any());
    }

    // ── 4) 양도 승인(확인)/거절 ─ 현재 미구현 (예상 실패) ─────────────

    @Test
    void 양도_승인_확인_시_SMS_이벤트가_발송되어야_한다() {
        Branch b = branch("transfer-confirm");
        Membership p = product();
        ComplexMember from = member(b, "양도자", "01020000005");
        ComplexMember to = member(b, "양수자", "01020000006");
        ComplexMemberMembership mm = activeMm(from, p);

        TransferRequest tr = transferRequestRepository.save(TransferRequest.builder()
                .memberMembership(mm).fromMember(from).branch(b)
                .transferFee(30_000).remainingCount(30)
                .token(UUID.randomUUID().toString().replace("-", ""))
                .status(com.culcom.entity.enums.TransferStatus.확인)
                .build());
        clearInvocations(smsService);

        transferService.completeTransfer(tr.getSeq(), to.getSeq());

        // 양도자와 양수자 양쪽 다 알림을 받는 것이 자연스럽지만,
        // 이 테스트는 최소한 '어떤 알림이든' 가는지만 느슨하게 확인한다.
        verify(smsService, atLeastOnce()).sendEventSmsIfConfigured(
                anyLong(), any(SmsEventType.class), anyString(), anyString(), any());
    }

    @Test
    void 양도_거절_시_SMS_이벤트가_발송되어야_한다() {
        Branch b = branch("transfer-reject");
        Membership p = product();
        ComplexMember from = member(b, "양도자", "01020000007");
        ComplexMemberMembership mm = activeMm(from, p);

        TransferRequest tr = transferRequestRepository.save(TransferRequest.builder()
                .memberMembership(mm).fromMember(from).branch(b)
                .transferFee(30_000).remainingCount(30)
                .token(UUID.randomUUID().toString().replace("-", ""))
                .build());
        clearInvocations(smsService);

        transferService.updateStatus(tr.getSeq(), TransferStatus.거절, null);

        verify(smsService, atLeastOnce()).sendEventSmsIfConfigured(
                eq(b.getSeq()), any(SmsEventType.class),
                eq(from.getName()), eq(from.getPhoneNumber()), any());
    }

    // ── 5) 회원 등록 — branchSeq가 null이거나 이상한 값이어도 발송 시도는 해야 ──

    @Test
    void 회원등록_SMS_호출_인자가_정확한지_캡처로_확인() {
        Branch b = branch("member-capture");
        clearInvocations(smsService);

        ComplexMemberRequest req = new ComplexMemberRequest();
        req.setName("김철수");
        req.setPhoneNumber("01099998888");
        complexMemberService.create(req, b.getSeq());

        ArgumentCaptor<Long> branchCap = ArgumentCaptor.forClass(Long.class);
        ArgumentCaptor<SmsEventType> typeCap = ArgumentCaptor.forClass(SmsEventType.class);
        ArgumentCaptor<String> nameCap = ArgumentCaptor.forClass(String.class);
        ArgumentCaptor<String> phoneCap = ArgumentCaptor.forClass(String.class);

        verify(smsService).sendEventSmsIfConfigured(
                branchCap.capture(), typeCap.capture(), nameCap.capture(), phoneCap.capture());

        assertThat(branchCap.getValue()).isEqualTo(b.getSeq());
        assertThat(typeCap.getValue()).isEqualTo(SmsEventType.회원등록);
        assertThat(nameCap.getValue()).isEqualTo("김철수");
        assertThat(phoneCap.getValue()).isEqualTo("01099998888");
    }
}
