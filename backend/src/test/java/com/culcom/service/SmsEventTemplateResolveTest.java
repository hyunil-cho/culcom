package com.culcom.service;

import com.culcom.dto.complex.member.ComplexMemberRequest;
import com.culcom.dto.customer.CustomerCreateRequest;
import com.culcom.entity.branch.Branch;
import com.culcom.entity.complex.member.ComplexMember;
import com.culcom.entity.complex.member.ComplexMemberMembership;
import com.culcom.entity.complex.postponement.ComplexPostponementRequest;
import com.culcom.entity.complex.refund.ComplexRefundRequest;
import com.culcom.entity.enums.MembershipStatus;
import com.culcom.entity.enums.RequestStatus;
import com.culcom.entity.enums.SmsEventType;
import com.culcom.entity.message.MessageTemplate;
import com.culcom.entity.message.Placeholder;
import com.culcom.entity.product.Membership;
import com.culcom.entity.settings.SmsEventConfig;
import com.culcom.repository.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoSpyBean;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * 각 비즈니스 이벤트(회원등록, 고객등록, 연기 승인/반려, 환불 승인/반려) 발생 시
 * 설정된 템플릿의 플레이스홀더가 resolveWithContext를 통해 올바르게 치환되는지 검증.
 */
@SpringBootTest
@ActiveProfiles("test")
@Transactional
class SmsEventTemplateResolveTest {

    @MockitoSpyBean SmsService smsService;
    @MockitoSpyBean SmsMessageResolver messageResolver;

    @Autowired ComplexMemberService complexMemberService;
    @Autowired CustomerService customerService;
    @Autowired PostponementService postponementService;
    @Autowired RefundService refundService;

    @Autowired BranchRepository branchRepository;
    @Autowired MembershipRepository membershipRepository;
    @Autowired ComplexMemberRepository memberRepository;
    @Autowired ComplexMemberMembershipRepository memberMembershipRepository;
    @Autowired ComplexPostponementRequestRepository postponementRepository;
    @Autowired ComplexRefundRequestRepository refundRepository;
    @Autowired MessageTemplateRepository templateRepository;
    @Autowired SmsEventConfigRepository smsEventConfigRepository;
    @Autowired PlaceholderRepository placeholderRepository;
    @Autowired MembershipPaymentRepository paymentRepository;

    private Branch branch;

    @BeforeEach
    void setUp() {
        placeholderRepository.deleteAll();
        placeholderRepository.save(Placeholder.builder().name("{{고객명}}").value("{customer.name}").build());
        placeholderRepository.save(Placeholder.builder().name("{{전화번호}}").value("{customer.phone_number}").build());
        placeholderRepository.save(Placeholder.builder().name("{{지점명}}").value("{branch.name}").build());
        placeholderRepository.save(Placeholder.builder().name("{{지점주소}}").value("{branch.address}").build());

        branch = branchRepository.save(Branch.builder()
                .branchName("강남지점")
                .alias("evt-resolve-" + System.nanoTime())
                .address("서울시 강남구 테헤란로 123")
                .branchManager("김매니저")
                .build());
    }

    private MessageTemplate createTemplate(String content) {
        return templateRepository.save(MessageTemplate.builder()
                .templateName("테스트 템플릿")
                .messageContext(content)
                .branch(branch)
                .build());
    }

    private void configureEvent(SmsEventType eventType, MessageTemplate template) {
        smsEventConfigRepository.save(SmsEventConfig.builder()
                .branch(branch)
                .eventType(eventType)
                .template(template)
                .senderNumber("01011112222")
                .autoSend(true)
                .build());
    }

    private Membership createMembership() {
        return membershipRepository.save(Membership.builder()
                .name("3개월권").duration(90).count(30).price(300_000).transferable(true).build());
    }

    private ComplexMember createMember(String name, String phone) {
        return memberRepository.save(ComplexMember.builder()
                .name(name).phoneNumber(phone).branch(branch).build());
    }

    private ComplexMemberMembership createActiveMembership(ComplexMember member, Membership product) {
        ComplexMemberMembership mm = memberMembershipRepository.save(ComplexMemberMembership.builder()
                .member(member).membership(product)
                .startDate(LocalDate.now().minusDays(5))
                .expiryDate(LocalDate.now().plusDays(80))
                .totalCount(30).usedCount(0)
                .postponeTotal(5).postponeUsed(0)
                .price("300000")
                .status(MembershipStatus.활성)
                .build());
        paymentRepository.save(com.culcom.entity.complex.member.MembershipPayment.builder()
                .memberMembership(mm).amount(300_000L)
                .paidDate(LocalDateTime.now())
                .method("카드")
                .kind(com.culcom.entity.enums.PaymentKind.BALANCE)
                .build());
        return mm;
    }

    /** resolveWithContext 호출 시 전달된 template 인자를 캡처하여 반환 */
    private String captureResolvedTemplate() {
        ArgumentCaptor<String> templateCaptor = ArgumentCaptor.forClass(String.class);
        verify(messageResolver, atLeastOnce()).resolveWithContext(
                templateCaptor.capture(), any(), any(), any(), any());
        return templateCaptor.getValue();
    }

    // ========== 회원등록 ==========

    @Nested
    class 회원등록 {

        @Test
        void 템플릿의_고객명과_전화번호가_치환된다() {
            MessageTemplate tmpl = createTemplate("{{고객명}}님({{전화번호}}) 회원 등록이 완료되었습니다.");
            configureEvent(SmsEventType.회원등록, tmpl);
            clearInvocations(messageResolver);

            ComplexMemberRequest req = new ComplexMemberRequest();
            req.setName("홍길동");
            req.setPhoneNumber("01012345678");
            complexMemberService.create(req, branch.getSeq());

            verify(messageResolver).resolveWithContext(
                    eq("{{고객명}}님({{전화번호}}) 회원 등록이 완료되었습니다."),
                    argThat(b -> "강남지점".equals(b.getBranchName())),
                    eq("홍길동"),
                    eq("01012345678"),
                    isNull());
        }

        @Test
        void 지점정보가_포함된_템플릿이_치환된다() {
            MessageTemplate tmpl = createTemplate("{{고객명}}님, {{지점명}}({{지점주소}})에 등록되었습니다.");
            configureEvent(SmsEventType.회원등록, tmpl);
            clearInvocations(messageResolver);

            ComplexMemberRequest req = new ComplexMemberRequest();
            req.setName("김영희");
            req.setPhoneNumber("01099998888");
            complexMemberService.create(req, branch.getSeq());

            String template = captureResolvedTemplate();
            assertThat(template).isEqualTo("{{고객명}}님, {{지점명}}({{지점주소}})에 등록되었습니다.");
        }
    }

    // ========== 고객등록 ==========

    @Nested
    class 고객등록 {

        @Test
        void 템플릿의_고객명이_치환된다() {
            MessageTemplate tmpl = createTemplate("{{고객명}}님 상담 예약이 접수되었습니다.");
            configureEvent(SmsEventType.고객등록, tmpl);
            clearInvocations(messageResolver);

            CustomerCreateRequest req = new CustomerCreateRequest();
            req.setName("이철수");
            req.setPhoneNumber("01055556666");
            customerService.create(req, branch.getSeq());

            verify(messageResolver).resolveWithContext(
                    eq("{{고객명}}님 상담 예약이 접수되었습니다."),
                    argThat(b -> "강남지점".equals(b.getBranchName())),
                    eq("이철수"),
                    eq("01055556666"),
                    isNull());
        }
    }

    // ========== 연기 승인 ==========

    @Nested
    class 연기승인 {

        @Test
        void 승인_시_해당_이벤트_템플릿으로_치환된다() {
            MessageTemplate tmpl = createTemplate("{{고객명}}님 연기 요청이 승인되었습니다. ({{지점명}})");
            configureEvent(SmsEventType.연기승인, tmpl);

            Membership product = createMembership();
            ComplexMember member = createMember("박지성", "01033334444");
            ComplexMemberMembership mm = createActiveMembership(member, product);

            ComplexPostponementRequest pr = postponementRepository.save(ComplexPostponementRequest.builder()
                    .branch(branch).member(member).memberMembership(mm)
                    .memberName(member.getName()).phoneNumber(member.getPhoneNumber())
                    .startDate(LocalDate.now().plusDays(1)).endDate(LocalDate.now().plusDays(7))
                    .reason("출장")
                    .build());
            clearInvocations(messageResolver);

            postponementService.updateStatus(pr.getSeq(), RequestStatus.승인, null);

            verify(messageResolver).resolveWithContext(
                    eq("{{고객명}}님 연기 요청이 승인되었습니다. ({{지점명}})"),
                    argThat(b -> "강남지점".equals(b.getBranchName())),
                    eq("박지성"),
                    eq("01033334444"),
                    isNull());
        }
    }

    // ========== 연기 반려 ==========

    @Nested
    class 연기반려 {

        @Test
        void 반려_시_해당_이벤트_템플릿으로_치환된다() {
            MessageTemplate tmpl = createTemplate("{{고객명}}님 연기 요청이 반려되었습니다.");
            configureEvent(SmsEventType.연기반려, tmpl);

            Membership product = createMembership();
            ComplexMember member = createMember("손흥민", "01077778888");
            ComplexMemberMembership mm = createActiveMembership(member, product);

            ComplexPostponementRequest pr = postponementRepository.save(ComplexPostponementRequest.builder()
                    .branch(branch).member(member).memberMembership(mm)
                    .memberName(member.getName()).phoneNumber(member.getPhoneNumber())
                    .startDate(LocalDate.now().plusDays(1)).endDate(LocalDate.now().plusDays(7))
                    .reason("개인사정")
                    .build());
            clearInvocations(messageResolver);

            postponementService.updateStatus(pr.getSeq(), RequestStatus.반려, "일정 상 불가");

            verify(messageResolver).resolveWithContext(
                    eq("{{고객명}}님 연기 요청이 반려되었습니다."),
                    argThat(b -> "강남지점".equals(b.getBranchName())),
                    eq("손흥민"),
                    eq("01077778888"),
                    isNull());
        }
    }

    // ========== 환불 승인 ==========

    @Nested
    class 환불승인 {

        @Test
        void 승인_시_해당_이벤트_템플릿으로_치환된다() {
            MessageTemplate tmpl = createTemplate("{{고객명}}님 환불이 승인되었습니다. {{지점명}}");
            configureEvent(SmsEventType.환불승인, tmpl);

            Membership product = createMembership();
            ComplexMember member = createMember("김민재", "01011119999");
            ComplexMemberMembership mm = createActiveMembership(member, product);

            ComplexRefundRequest rr = refundRepository.save(ComplexRefundRequest.builder()
                    .branch(branch).member(member).memberMembership(mm)
                    .memberName(member.getName()).phoneNumber(member.getPhoneNumber())
                    .membershipName(product.getName()).price("300000")
                    .reason("단순변심")
                    .bankName("국민").accountNumber("123").accountHolder(member.getName())
                    .build());
            clearInvocations(messageResolver);

            refundService.updateStatus(rr.getSeq(), RequestStatus.승인, null);

            verify(messageResolver).resolveWithContext(
                    eq("{{고객명}}님 환불이 승인되었습니다. {{지점명}}"),
                    argThat(b -> "강남지점".equals(b.getBranchName())),
                    eq("김민재"),
                    eq("01011119999"),
                    isNull());
        }
    }

    // ========== 환불 반려 ==========

    @Nested
    class 환불반려 {

        @Test
        void 반려_시_해당_이벤트_템플릿으로_치환된다() {
            MessageTemplate tmpl = createTemplate("{{고객명}}님 환불 요청이 반려되었습니다.");
            configureEvent(SmsEventType.환불반려, tmpl);

            Membership product = createMembership();
            ComplexMember member = createMember("이강인", "01022223333");
            ComplexMemberMembership mm = createActiveMembership(member, product);

            ComplexRefundRequest rr = refundRepository.save(ComplexRefundRequest.builder()
                    .branch(branch).member(member).memberMembership(mm)
                    .memberName(member.getName()).phoneNumber(member.getPhoneNumber())
                    .membershipName(product.getName()).price("300000")
                    .reason("단순변심")
                    .bankName("국민").accountNumber("456").accountHolder(member.getName())
                    .build());
            clearInvocations(messageResolver);

            refundService.updateStatus(rr.getSeq(), RequestStatus.반려, "규정 상 불가");

            verify(messageResolver).resolveWithContext(
                    eq("{{고객명}}님 환불 요청이 반려되었습니다."),
                    argThat(b -> "강남지점".equals(b.getBranchName())),
                    eq("이강인"),
                    eq("01022223333"),
                    isNull());
        }
    }

    // ========== 자동발송 비활성화 시 resolve가 호출되지 않음 ==========

    @Nested
    class 자동발송비활성 {

        @Test
        void autoSend_false면_resolveWithContext가_호출되지_않는다() {
            MessageTemplate tmpl = createTemplate("{{고객명}}님 환영합니다.");
            smsEventConfigRepository.save(SmsEventConfig.builder()
                    .branch(branch)
                    .eventType(SmsEventType.회원등록)
                    .template(tmpl)
                    .senderNumber("01011112222")
                    .autoSend(false)
                    .build());
            clearInvocations(messageResolver);

            ComplexMemberRequest req = new ComplexMemberRequest();
            req.setName("테스트");
            req.setPhoneNumber("01000000000");
            complexMemberService.create(req, branch.getSeq());

            verify(messageResolver, never()).resolveWithContext(any(), any(), any(), any(), any());
        }
    }

    // ========== 설정 없을 때 resolve가 호출되지 않음 ==========

    @Nested
    class 설정없음 {

        @Test
        void 이벤트_설정이_없으면_resolveWithContext가_호출되지_않는다() {
            clearInvocations(messageResolver);

            ComplexMemberRequest req = new ComplexMemberRequest();
            req.setName("미설정");
            req.setPhoneNumber("01000000001");
            complexMemberService.create(req, branch.getSeq());

            verify(messageResolver, never()).resolveWithContext(any(), any(), any(), any(), any());
        }
    }
}
