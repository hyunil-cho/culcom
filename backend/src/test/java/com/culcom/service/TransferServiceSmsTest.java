package com.culcom.service;

import com.culcom.entity.branch.Branch;
import com.culcom.entity.complex.member.ComplexMember;
import com.culcom.entity.complex.member.ComplexMemberMembership;
import com.culcom.entity.enums.MembershipStatus;
import com.culcom.entity.enums.SmsEventType;
import com.culcom.entity.enums.TransferStatus;
import com.culcom.entity.product.Membership;
import com.culcom.entity.transfer.TransferRequest;
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
class TransferServiceSmsTest {

    @Mock TransferRequestRepository transferRequestRepository;
    @Mock ComplexMemberMembershipRepository memberMembershipRepository;
    @Mock ComplexMemberRepository complexMemberRepository;
    @Mock ConsentItemRepository consentItemRepository;
    @Mock CustomerRepository customerRepository;
    @Mock CustomerConsentHistoryRepository consentHistoryRepository;
    @Mock MembershipPaymentRepository paymentRepository;
    @Mock MemberClassService memberClassService;
    @Mock SmsService smsService;
    @Mock ApplicationEventPublisher eventPublisher;

    @InjectMocks TransferService transferService;

    private Branch branch;
    private ComplexMember fromMember;
    private ComplexMember toMember;
    private Membership membershipProduct;
    private ComplexMemberMembership memberMembership;

    @BeforeEach
    void setUp() {
        branch = Branch.builder().seq(1L).branchName("테스트지점").alias("test").build();
        fromMember = ComplexMember.builder().seq(10L).name("홍길동").phoneNumber("01012345678").branch(branch).build();
        toMember = ComplexMember.builder().seq(20L).name("김철수").phoneNumber("01098765432").branch(branch).build();
        membershipProduct = Membership.builder().seq(1L).name("3개월권").duration(90).count(30).price(300000).build();
        memberMembership = ComplexMemberMembership.builder()
                .seq(100L).member(fromMember).membership(membershipProduct)
                .status(MembershipStatus.활성)
                .startDate(LocalDate.now()).expiryDate(LocalDate.now().plusMonths(3))
                .totalCount(30).usedCount(5)
                .postponeTotal(3).postponeUsed(0)
                .build();
    }

    private TransferRequest createTransferRequest() {
        return TransferRequest.builder()
                .seq(1L).memberMembership(memberMembership).fromMember(fromMember)
                .branch(branch).status(TransferStatus.생성)
                .transferFee(20000).remainingCount(25).token("test-token")
                .build();
    }

    @Test
    void 양도_거절시_양도거절_SMS_발송() {
        TransferRequest tr = createTransferRequest();
        given(transferRequestRepository.findById(1L)).willReturn(Optional.of(tr));
        given(transferRequestRepository.save(any())).willReturn(tr);

        transferService.updateStatus(1L, TransferStatus.거절, null);

        then(smsService).should().sendEventSmsIfConfigured(
                eq(1L), eq(SmsEventType.양도거절), eq("홍길동"), eq("01012345678"), any());
    }

    @Test
    void 양도_확인시_SMS_발송하지_않음() {
        TransferRequest tr = createTransferRequest();
        given(transferRequestRepository.findById(1L)).willReturn(Optional.of(tr));
        given(transferRequestRepository.save(any())).willReturn(tr);

        transferService.updateStatus(1L, TransferStatus.확인, null);

        then(smsService).shouldHaveNoInteractions();
    }

    @Test
    void 양도_거절시_양도완료_SMS는_발송하지_않음() {
        TransferRequest tr = createTransferRequest();
        given(transferRequestRepository.findById(1L)).willReturn(Optional.of(tr));
        given(transferRequestRepository.save(any())).willReturn(tr);

        transferService.updateStatus(1L, TransferStatus.거절, null);

        then(smsService).should(never()).sendEventSmsIfConfigured(
                anyLong(), eq(SmsEventType.양도완료), anyString(), anyString(), any());
    }

    @Test
    void 양도_완료시_양도자와_양수자_모두에게_양도완료_SMS_발송() {
        TransferRequest tr = createTransferRequest();
        given(transferRequestRepository.findById(1L)).willReturn(Optional.of(tr));
        given(complexMemberRepository.findById(20L)).willReturn(Optional.of(toMember));
        given(transferRequestRepository.save(any())).willReturn(tr);

        transferService.completeTransfer(1L, 20L);

        then(smsService).should().sendEventSmsIfConfigured(
                eq(1L), eq(SmsEventType.양도완료), eq("홍길동"), eq("01012345678"), any());
        then(smsService).should().sendEventSmsIfConfigured(
                eq(1L), eq(SmsEventType.양도완료), eq("김철수"), eq("01098765432"), any());
    }

    @Test
    void 양도_완료시_양도거절_SMS는_발송하지_않음() {
        TransferRequest tr = createTransferRequest();
        given(transferRequestRepository.findById(1L)).willReturn(Optional.of(tr));
        given(complexMemberRepository.findById(20L)).willReturn(Optional.of(toMember));
        given(transferRequestRepository.save(any())).willReturn(tr);

        transferService.completeTransfer(1L, 20L);

        then(smsService).should(never()).sendEventSmsIfConfigured(
                anyLong(), eq(SmsEventType.양도거절), anyString(), anyString(), any());
    }
}
