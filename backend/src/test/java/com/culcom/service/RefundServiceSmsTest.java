package com.culcom.service;

import com.culcom.entity.branch.Branch;
import com.culcom.entity.complex.member.ComplexMember;
import com.culcom.entity.complex.member.ComplexMemberMembership;
import com.culcom.entity.complex.refund.ComplexRefundRequest;
import com.culcom.entity.enums.MembershipStatus;
import com.culcom.entity.enums.RequestStatus;
import com.culcom.entity.enums.SmsEventType;
import com.culcom.repository.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.context.ApplicationEventPublisher;

import java.time.LocalDate;
import java.util.Optional;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.BDDMockito.*;

@ExtendWith(MockitoExtension.class)
class RefundServiceSmsTest {

    @Mock ComplexRefundRequestRepository refundRepository;
    @Mock ComplexRefundReasonRepository reasonRepository;
    @Mock BranchRepository branchRepository;
    @Mock ComplexMemberRepository complexMemberRepository;
    @Mock ComplexMemberMembershipRepository complexMemberMembershipRepository;
    @Mock MemberClassService memberClassService;
    @Mock ApplicationEventPublisher eventPublisher;
    @Mock SmsService smsService;

    @InjectMocks RefundService refundService;

    private Branch branch;
    private ComplexMember member;
    private ComplexMemberMembership membership;

    @BeforeEach
    void setUp() {
        branch = Branch.builder().seq(1L).branchName("테스트지점").alias("test").build();
        member = ComplexMember.builder().seq(10L).name("홍길동").phoneNumber("01012345678").branch(branch).build();
        membership = ComplexMemberMembership.builder()
                .seq(20L).member(member).status(MembershipStatus.활성)
                .startDate(LocalDate.now()).expiryDate(LocalDate.now().plusMonths(3))
                .totalCount(30).usedCount(5).build();
    }

    private ComplexRefundRequest createRefundRequest() {
        return ComplexRefundRequest.builder()
                .seq(1L).branch(branch).member(member).memberMembership(membership)
                .memberName("홍길동").phoneNumber("01012345678")
                .membershipName("3개월권").price("300000")
                .reason("개인 사정")
                .status(RequestStatus.대기)
                .build();
    }

    @Test
    void 환불_승인시_환불승인_SMS_발송() {
        ComplexRefundRequest req = createRefundRequest();
        given(refundRepository.findById(1L)).willReturn(Optional.of(req));

        refundService.updateStatus(1L, RequestStatus.승인, null);

        then(smsService).should().sendEventSmsIfConfigured(
                eq(1L), eq(SmsEventType.환불승인), eq("홍길동"), eq("01012345678"));
    }

    @Test
    void 환불_반려시_환불반려_SMS_발송() {
        ComplexRefundRequest req = createRefundRequest();
        given(refundRepository.findById(1L)).willReturn(Optional.of(req));

        refundService.updateStatus(1L, RequestStatus.반려, "서류 미비");

        then(smsService).should().sendEventSmsIfConfigured(
                eq(1L), eq(SmsEventType.환불반려), eq("홍길동"), eq("01012345678"));
    }

    @Test
    void 환불_승인시_환불반려_SMS는_발송하지_않음() {
        ComplexRefundRequest req = createRefundRequest();
        given(refundRepository.findById(1L)).willReturn(Optional.of(req));

        refundService.updateStatus(1L, RequestStatus.승인, null);

        then(smsService).should(never()).sendEventSmsIfConfigured(
                anyLong(), eq(SmsEventType.환불반려), anyString(), anyString());
    }

    @Test
    void 회원정보_없으면_SMS_발송하지_않음() {
        ComplexRefundRequest req = createRefundRequest();
        req.setMember(null);
        given(refundRepository.findById(1L)).willReturn(Optional.of(req));

        refundService.updateStatus(1L, RequestStatus.승인, null);

        then(smsService).shouldHaveNoInteractions();
    }

    @Test
    void 지점정보_없으면_SMS_발송하지_않음() {
        ComplexRefundRequest req = createRefundRequest();
        req.setBranch(null);
        given(refundRepository.findById(1L)).willReturn(Optional.of(req));

        refundService.updateStatus(1L, RequestStatus.승인, null);

        then(smsService).shouldHaveNoInteractions();
    }
}
