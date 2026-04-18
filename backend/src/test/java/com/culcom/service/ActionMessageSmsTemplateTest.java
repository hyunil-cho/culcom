package com.culcom.service;

import com.culcom.entity.branch.Branch;
import com.culcom.entity.complex.member.ComplexMember;
import com.culcom.entity.complex.member.ComplexMemberMembership;
import com.culcom.entity.complex.postponement.ComplexPostponementRequest;
import com.culcom.entity.complex.refund.ComplexRefundRequest;
import com.culcom.entity.enums.MembershipStatus;
import com.culcom.entity.enums.PlaceholderCategory;
import com.culcom.entity.enums.RequestStatus;
import com.culcom.entity.enums.SmsEventType;
import com.culcom.entity.enums.TransferStatus;
import com.culcom.entity.message.MessageTemplate;
import com.culcom.entity.message.Placeholder;
import com.culcom.entity.product.Membership;
import com.culcom.entity.settings.SmsEventConfig;
import com.culcom.entity.transfer.TransferRequest;
import com.culcom.repository.*;
import org.junit.jupiter.api.BeforeEach;
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
 * 연기/환불/양도 승인·반려 시 설정된 템플릿이 올바르게 렌더링되어 SMS 로 발송되는지 검증.
 *
 * 검증 방식:
 *   1. 실제 서비스 흐름(updateStatus/completeTransfer) 을 호출
 *   2. SmsService 를 @MockitoSpyBean 으로 감싸 sendByBranch 인자(최종 렌더링된 메시지)를 캡처
 *   3. 캡처된 문자열에 관리자 메시지({{사유}}·{{코멘트}}), 고객명, 이벤트 종류 등이 반영됐는지 확인
 *
 * 각 테스트의 템플릿 본문은 관리자 메시지 플레이스홀더({{사유}} 또는 {{코멘트}}) 를 반드시 포함한다.
 */
@SpringBootTest
@ActiveProfiles("test")
@Transactional
class ActionMessageSmsTemplateTest {

    @MockitoSpyBean SmsService smsService;

    @Autowired PostponementService postponementService;
    @Autowired RefundService refundService;
    @Autowired TransferService transferService;

    @Autowired BranchRepository branchRepository;
    @Autowired MembershipRepository membershipRepository;
    @Autowired ComplexMemberRepository memberRepository;
    @Autowired ComplexMemberMembershipRepository memberMembershipRepository;
    @Autowired ComplexPostponementRequestRepository postponementRepository;
    @Autowired ComplexRefundRequestRepository refundRepository;
    @Autowired TransferRequestRepository transferRepository;
    @Autowired MessageTemplateRepository templateRepository;
    @Autowired SmsEventConfigRepository smsEventConfigRepository;
    @Autowired PlaceholderRepository placeholderRepository;
    @Autowired MembershipPaymentRepository paymentRepository;

    private Branch branch;

    @BeforeEach
    void setUp() {
        placeholderRepository.deleteAll();
        seedPlaceholders();

        branch = branchRepository.save(Branch.builder()
                .branchName("강남지점")
                .alias("action-msg-" + System.nanoTime())
                .build());
    }

    private void seedPlaceholders() {
        placeholderRepository.save(Placeholder.builder()
                .name("{{고객명}}").value("{customer.name}").comment("고객 이름")
                .category(PlaceholderCategory.COMMON).build());
        placeholderRepository.save(Placeholder.builder()
                .name("{{지점명}}").value("{branch.name}").comment("지점 이름")
                .category(PlaceholderCategory.COMMON).build());
        placeholderRepository.save(Placeholder.builder()
                .name("{{이벤트}}").value("{action.event_type}").comment("이벤트 종류")
                .category(PlaceholderCategory.ACTION_REASON).build());
        placeholderRepository.save(Placeholder.builder()
                .name("{{사유}}").value("{action.reject_reason}").comment("반려 사유")
                .category(PlaceholderCategory.ACTION_REASON).build());
        placeholderRepository.save(Placeholder.builder()
                .name("{{코멘트}}").value("{action.approve_comment}").comment("승인 코멘트")
                .category(PlaceholderCategory.ACTION_REASON).build());
    }

    // ── 연기 ───────────────────────────────────────────────────────────────

    @Test
    void 연기_승인시_템플릿의_코멘트가_관리자_메시지로_치환되어_발송된다() {
        configureEventTemplate(SmsEventType.연기승인,
                "{{고객명}}님 {{이벤트}} 요청이 승인되었습니다. ({{코멘트}})");

        ComplexMember member = createMember("박지성", "01033334444");
        ComplexMemberMembership mm = createActiveMembership(member);
        ComplexPostponementRequest pr = postponementRepository.save(ComplexPostponementRequest.builder()
                .branch(branch).member(member).memberMembership(mm)
                .memberName(member.getName()).phoneNumber(member.getPhoneNumber())
                .startDate(LocalDate.now().plusDays(1)).endDate(LocalDate.now().plusDays(7))
                .reason("출장").build());
        clearInvocations(smsService);

        postponementService.updateStatus(pr.getSeq(), RequestStatus.승인, "정상 승인 완료");

        String rendered = captureSentMessage();
        assertThat(rendered)
                .as("템플릿이 회원명, 이벤트 종류, 승인 코멘트로 모두 치환되어야 한다")
                .contains("박지성님")
                .contains("연기 요청")
                .contains("(정상 승인 완료)");
    }

    @Test
    void 연기_반려시_템플릿의_사유가_관리자_메시지로_치환되어_발송된다() {
        configureEventTemplate(SmsEventType.연기반려,
                "{{고객명}}님 {{이벤트}} 요청이 반려되었습니다. 사유: {{사유}}");

        ComplexMember member = createMember("손흥민", "01077778888");
        ComplexMemberMembership mm = createActiveMembership(member);
        ComplexPostponementRequest pr = postponementRepository.save(ComplexPostponementRequest.builder()
                .branch(branch).member(member).memberMembership(mm)
                .memberName(member.getName()).phoneNumber(member.getPhoneNumber())
                .startDate(LocalDate.now().plusDays(1)).endDate(LocalDate.now().plusDays(7))
                .reason("개인사정").build());
        clearInvocations(smsService);

        postponementService.updateStatus(pr.getSeq(), RequestStatus.반려, "일정이 이미 확정되어 불가");

        String rendered = captureSentMessage();
        assertThat(rendered)
                .contains("손흥민님")
                .contains("연기 요청")
                .contains("사유: 일정이 이미 확정되어 불가");
    }

    // ── 환불 ───────────────────────────────────────────────────────────────

    @Test
    void 환불_승인시_템플릿의_코멘트가_관리자_메시지로_치환되어_발송된다() {
        configureEventTemplate(SmsEventType.환불승인,
                "{{고객명}}님의 {{이벤트}} 요청이 승인되었습니다. {{코멘트}}");

        ComplexMember member = createMember("김민재", "01011119999");
        ComplexMemberMembership mm = createActiveMembership(member);
        ComplexRefundRequest rr = refundRepository.save(ComplexRefundRequest.builder()
                .branch(branch).member(member).memberMembership(mm)
                .memberName(member.getName()).phoneNumber(member.getPhoneNumber())
                .membershipName("3개월권").price("300000")
                .reason("단순변심").build());
        clearInvocations(smsService);

        refundService.updateStatus(rr.getSeq(), RequestStatus.승인, "영업일 기준 3일 내 환불 예정입니다.");

        String rendered = captureSentMessage();
        assertThat(rendered)
                .contains("김민재님")
                .contains("환불 요청")
                .contains("영업일 기준 3일 내 환불 예정입니다.");
    }

    @Test
    void 환불_반려시_템플릿의_사유가_관리자_메시지로_치환되어_발송된다() {
        configureEventTemplate(SmsEventType.환불반려,
                "{{고객명}}님의 {{이벤트}} 요청이 반려되었습니다. (사유: {{사유}})");

        ComplexMember member = createMember("이강인", "01022223333");
        ComplexMemberMembership mm = createActiveMembership(member);
        ComplexRefundRequest rr = refundRepository.save(ComplexRefundRequest.builder()
                .branch(branch).member(member).memberMembership(mm)
                .memberName(member.getName()).phoneNumber(member.getPhoneNumber())
                .membershipName("3개월권").price("300000")
                .reason("단순변심").build());
        clearInvocations(smsService);

        refundService.updateStatus(rr.getSeq(), RequestStatus.반려, "환불 규정상 수강 30% 초과 시 환불 불가");

        String rendered = captureSentMessage();
        assertThat(rendered)
                .contains("이강인님")
                .contains("환불 요청")
                .contains("(사유: 환불 규정상 수강 30% 초과 시 환불 불가)");
    }

    // ── 양도 ───────────────────────────────────────────────────────────────

    @Test
    void 양도_거절시_템플릿의_사유가_관리자_메시지로_치환되어_발송된다() {
        configureEventTemplate(SmsEventType.양도거절,
                "{{고객명}}님 {{이벤트}} 요청이 거절되었습니다. 사유: {{사유}}");

        ComplexMember fromMember = createMember("황희찬", "01044445555");
        ComplexMemberMembership mm = createActiveMembership(fromMember);
        TransferRequest tr = transferRepository.save(TransferRequest.builder()
                .memberMembership(mm).fromMember(fromMember).branch(branch)
                .transferFee(30_000).remainingCount(25)
                .token(UUID.randomUUID().toString().replace("-", ""))
                .build());
        clearInvocations(smsService);

        transferService.updateStatus(tr.getSeq(), TransferStatus.거절, "양수자 정보 미확인");

        String rendered = captureSentMessage();
        assertThat(rendered)
                .contains("황희찬님")
                .contains("양도 요청")
                .contains("사유: 양수자 정보 미확인");
    }

    @Test
    void 양도_완료시_템플릿의_코멘트가_관리자_메시지로_치환되어_양측에_발송된다() {
        configureEventTemplate(SmsEventType.양도완료,
                "{{고객명}}님 {{이벤트}}가 완료되었습니다. ({{코멘트}})");

        ComplexMember fromMember = createMember("김영권", "01055556666");
        ComplexMember newMember = createMember("조현우", "01077778899");
        ComplexMemberMembership mm = createActiveMembership(fromMember);
        TransferRequest tr = transferRepository.save(TransferRequest.builder()
                .memberMembership(mm).fromMember(fromMember).branch(branch)
                .transferFee(30_000).remainingCount(25)
                .token(UUID.randomUUID().toString().replace("-", ""))
                .adminMessage("관리자 현장 확인 완료")
                .build());
        clearInvocations(smsService);

        transferService.completeTransfer(tr.getSeq(), newMember.getSeq());

        ArgumentCaptor<String> messageCap = ArgumentCaptor.forClass(String.class);
        ArgumentCaptor<String> receiverCap = ArgumentCaptor.forClass(String.class);
        verify(smsService, atLeastOnce()).sendByBranch(
                anyLong(), anyString(), receiverCap.capture(), messageCap.capture(), any());

        assertThat(receiverCap.getAllValues())
                .as("양도자와 양수자 양측에 발송")
                .containsExactlyInAnyOrder("01055556666", "01077778899");

        assertThat(messageCap.getAllValues())
                .allSatisfy(msg -> {
                    assertThat(msg).contains("양도가 완료되었습니다.");
                    assertThat(msg).contains("(관리자 현장 확인 완료)");
                });
        assertThat(messageCap.getAllValues())
                .anySatisfy(msg -> assertThat(msg).contains("김영권님"));
        assertThat(messageCap.getAllValues())
                .anySatisfy(msg -> assertThat(msg).contains("조현우님"));
    }

    // ── helpers ────────────────────────────────────────────────────────────

    private void configureEventTemplate(SmsEventType eventType, String content) {
        MessageTemplate template = templateRepository.save(MessageTemplate.builder()
                .templateName(eventType.name() + " 템플릿")
                .messageContext(content)
                .branch(branch)
                .eventType(eventType)
                .build());
        smsEventConfigRepository.save(SmsEventConfig.builder()
                .branch(branch)
                .eventType(eventType)
                .template(template)
                .senderNumber("01000000000")
                .autoSend(true)
                .build());
    }

    private ComplexMember createMember(String name, String phone) {
        return memberRepository.save(ComplexMember.builder()
                .name(name).phoneNumber(phone).branch(branch).build());
    }

    private ComplexMemberMembership createActiveMembership(ComplexMember member) {
        Membership product = membershipRepository.save(Membership.builder()
                .name("3개월권").duration(90).count(30).price(300_000).transferable(true).build());
        ComplexMemberMembership mm = memberMembershipRepository.save(ComplexMemberMembership.builder()
                .member(member).membership(product)
                .startDate(LocalDate.now().minusDays(5))
                .expiryDate(LocalDate.now().plusDays(80))
                .totalCount(30).usedCount(0)
                .postponeTotal(5).postponeUsed(0)
                .price("300000")
                .status(MembershipStatus.활성).build());
        paymentRepository.save(com.culcom.entity.complex.member.MembershipPayment.builder()
                .memberMembership(mm).amount(300_000L)
                .paidDate(java.time.LocalDateTime.now())
                .method("카드")
                .kind(com.culcom.entity.enums.PaymentKind.BALANCE).build());
        return mm;
    }

    /** SmsService.sendByBranch 의 message 인자(최종 렌더링된 문자열)를 캡처 — 1건 기대. */
    private String captureSentMessage() {
        ArgumentCaptor<String> messageCap = ArgumentCaptor.forClass(String.class);
        verify(smsService).sendByBranch(
                anyLong(), anyString(), anyString(), messageCap.capture(), any());
        return messageCap.getValue();
    }
}
