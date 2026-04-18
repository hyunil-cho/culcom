package com.culcom.service;

import com.culcom.entity.branch.Branch;
import com.culcom.entity.complex.member.ComplexMember;
import com.culcom.entity.complex.member.ComplexMemberMembership;
import com.culcom.entity.complex.postponement.ComplexPostponementRequest;
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
class PostponementServiceSmsTest {

    @Mock ComplexPostponementRequestRepository postponementRepository;
    @Mock ComplexPostponementReasonRepository reasonRepository;
    @Mock BranchRepository branchRepository;
    @Mock ComplexMemberRepository complexMemberRepository;
    @Mock ComplexMemberMembershipRepository complexMemberMembershipRepository;
    @Mock ApplicationEventPublisher eventPublisher;
    @Mock SmsService smsService;

    @InjectMocks PostponementService postponementService;

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
                .totalCount(30).usedCount(5)
                .postponeTotal(3).postponeUsed(0).build();
    }

    private ComplexPostponementRequest createPostponementRequest() {
        return ComplexPostponementRequest.builder()
                .seq(1L).branch(branch).member(member).memberMembership(membership)
                .memberName("홍길동").phoneNumber("01012345678")
                .startDate(LocalDate.now().plusDays(1))
                .endDate(LocalDate.now().plusDays(15))
                .reason("개인 사정").status(RequestStatus.대기)
                .build();
    }

    @Test
    void 연기_승인시_연기승인_SMS_발송() {
        ComplexPostponementRequest req = createPostponementRequest();
        given(postponementRepository.findById(1L)).willReturn(Optional.of(req));

        postponementService.updateStatus(1L, RequestStatus.승인, null);

        then(smsService).should().sendEventSmsIfConfigured(
                eq(1L), eq(SmsEventType.연기승인), eq("홍길동"), eq("01012345678"), anyMap());
    }

    @Test
    void 연기_반려시_연기반려_SMS_발송() {
        ComplexPostponementRequest req = createPostponementRequest();
        given(postponementRepository.findById(1L)).willReturn(Optional.of(req));

        postponementService.updateStatus(1L, RequestStatus.반려, "사유 부족");

        then(smsService).should().sendEventSmsIfConfigured(
                eq(1L), eq(SmsEventType.연기반려), eq("홍길동"), eq("01012345678"),
                eq(java.util.Map.of("{action.reject_reason}", "사유 부족")));
    }

    @Test
    void 연기_승인시_연기반려_SMS는_발송하지_않음() {
        ComplexPostponementRequest req = createPostponementRequest();
        given(postponementRepository.findById(1L)).willReturn(Optional.of(req));

        postponementService.updateStatus(1L, RequestStatus.승인, null);

        then(smsService).should(never()).sendEventSmsIfConfigured(
                anyLong(), eq(SmsEventType.연기반려), anyString(), anyString(), anyMap());
    }

    @Test
    void 회원정보_없으면_SMS_발송하지_않음() {
        ComplexPostponementRequest req = createPostponementRequest();
        req.setMember(null);
        given(postponementRepository.findById(1L)).willReturn(Optional.of(req));

        postponementService.updateStatus(1L, RequestStatus.승인, null);

        then(smsService).shouldHaveNoInteractions();
    }

    @Test
    void 지점정보_없으면_SMS_발송하지_않음() {
        ComplexPostponementRequest req = createPostponementRequest();
        req.setBranch(null);
        given(postponementRepository.findById(1L)).willReturn(Optional.of(req));

        postponementService.updateStatus(1L, RequestStatus.승인, null);

        then(smsService).shouldHaveNoInteractions();
    }
}
