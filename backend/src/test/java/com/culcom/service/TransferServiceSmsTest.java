package com.culcom.service;

import com.culcom.entity.branch.Branch;
import com.culcom.entity.complex.member.ComplexMember;
import com.culcom.entity.complex.member.ComplexMemberMembership;
import com.culcom.entity.enums.MembershipStatus;
import com.culcom.entity.enums.SmsEventType;
import com.culcom.entity.enums.TransferStatus;
import com.culcom.entity.product.Membership;
import com.culcom.dto.transfer.TransferRequestResponse;
import com.culcom.entity.enums.ActivityEventType;
import com.culcom.entity.transfer.TransferRequest;
import com.culcom.event.ActivityEvent;
import com.culcom.repository.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.context.ApplicationEventPublisher;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
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

        transferService.updateStatus(1L, TransferStatus.거절, null);

        then(smsService).should().sendEventSmsIfConfigured(
                eq(1L), eq(SmsEventType.양도거절), eq("홍길동"), eq("01012345678"), any());
    }

    @Test
    void 양도_확인시_SMS_발송하지_않음() {
        TransferRequest tr = createTransferRequest();
        given(transferRequestRepository.findById(1L)).willReturn(Optional.of(tr));

        transferService.updateStatus(1L, TransferStatus.확인, null);

        then(smsService).shouldHaveNoInteractions();
    }

    @Test
    void 양도_거절시_양도완료_SMS는_발송하지_않음() {
        TransferRequest tr = createTransferRequest();
        given(transferRequestRepository.findById(1L)).willReturn(Optional.of(tr));

        transferService.updateStatus(1L, TransferStatus.거절, null);

        then(smsService).should(never()).sendEventSmsIfConfigured(
                anyLong(), eq(SmsEventType.양도완료), anyString(), anyString(), any());
    }

    @Test
    void 양도_완료시_양도자와_양수자_모두에게_양도완료_SMS_발송() {
        TransferRequest tr = createTransferRequest();
        given(transferRequestRepository.findById(1L)).willReturn(Optional.of(tr));
        given(complexMemberRepository.findById(20L)).willReturn(Optional.of(toMember));

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

        transferService.completeTransfer(1L, 20L);

        then(smsService).should(never()).sendEventSmsIfConfigured(
                anyLong(), eq(SmsEventType.양도거절), anyString(), anyString(), any());
    }

    // ── 양도거절(updateStatus) — smsWarning 응답 검증 ──

    @Test
    void 거절_SMS_정상_발송시_smsWarning은_null이다() {
        TransferRequest tr = createTransferRequest();
        given(transferRequestRepository.findById(1L)).willReturn(Optional.of(tr));
        given(smsService.sendEventSmsIfConfigured(anyLong(), any(), anyString(), anyString(), any()))
                .willReturn(null);

        TransferRequestResponse response = transferService.updateStatus(1L, TransferStatus.거절, null);

        assertThat(response.getSmsWarning()).isNull();
    }

    @Test
    void 거절_SMS_발송_실패시_경고가_response에_담긴다() {
        TransferRequest tr = createTransferRequest();
        given(transferRequestRepository.findById(1L)).willReturn(Optional.of(tr));
        given(smsService.sendEventSmsIfConfigured(anyLong(), any(), anyString(), anyString(), any()))
                .willReturn("문자 발송 실패: 잔여 건수 부족");

        TransferRequestResponse response = transferService.updateStatus(1L, TransferStatus.거절, null);

        assertThat(response.getSmsWarning()).isEqualTo("문자 발송 실패: 잔여 건수 부족");
    }

    // ── 양도완료(completeTransfer) — 양도자/양수자 SMS 경고 합치기 검증 ──

    @Test
    void 완료_둘다_정상_발송시_smsWarning은_null이다() {
        TransferRequest tr = createTransferRequest();
        given(transferRequestRepository.findById(1L)).willReturn(Optional.of(tr));
        given(complexMemberRepository.findById(20L)).willReturn(Optional.of(toMember));
        given(smsService.sendEventSmsIfConfigured(anyLong(), any(), anyString(), anyString(), any()))
                .willReturn(null);

        TransferRequestResponse response = transferService.completeTransfer(1L, 20L);

        assertThat(response.getSmsWarning()).isNull();
    }

    @Test
    void 완료_양도자만_실패하면_양도자_접두사가_붙는다() {
        TransferRequest tr = createTransferRequest();
        given(transferRequestRepository.findById(1L)).willReturn(Optional.of(tr));
        given(complexMemberRepository.findById(20L)).willReturn(Optional.of(toMember));
        given(smsService.sendEventSmsIfConfigured(anyLong(), any(), eq("홍길동"), eq("01012345678"), any()))
                .willReturn("문자 발송 실패: 번호 오류");
        given(smsService.sendEventSmsIfConfigured(anyLong(), any(), eq("김철수"), eq("01098765432"), any()))
                .willReturn(null);

        TransferRequestResponse response = transferService.completeTransfer(1L, 20L);

        assertThat(response.getSmsWarning()).isEqualTo("양도자 문자 발송 실패: 번호 오류");
    }

    @Test
    void 완료_양수자만_실패하면_양수자_접두사가_붙는다() {
        TransferRequest tr = createTransferRequest();
        given(transferRequestRepository.findById(1L)).willReturn(Optional.of(tr));
        given(complexMemberRepository.findById(20L)).willReturn(Optional.of(toMember));
        given(smsService.sendEventSmsIfConfigured(anyLong(), any(), eq("홍길동"), eq("01012345678"), any()))
                .willReturn(null);
        given(smsService.sendEventSmsIfConfigured(anyLong(), any(), eq("김철수"), eq("01098765432"), any()))
                .willReturn("문자 발송 실패: 번호 오류");

        TransferRequestResponse response = transferService.completeTransfer(1L, 20L);

        assertThat(response.getSmsWarning()).isEqualTo("양수자 문자 발송 실패: 번호 오류");
    }

    @Test
    void 완료_둘다_같은_사유로_실패하면_경고는_한_번만_표기된다() {
        TransferRequest tr = createTransferRequest();
        given(transferRequestRepository.findById(1L)).willReturn(Optional.of(tr));
        given(complexMemberRepository.findById(20L)).willReturn(Optional.of(toMember));
        given(smsService.sendEventSmsIfConfigured(anyLong(), any(), anyString(), anyString(), any()))
                .willReturn("문자 자동발송이 비활성화 상태입니다.");

        TransferRequestResponse response = transferService.completeTransfer(1L, 20L);

        assertThat(response.getSmsWarning()).isEqualTo("문자 자동발송이 비활성화 상태입니다.");
    }

    @Test
    void 양도_완료시_양도자와_양수자_모두에게_히스토리_이벤트가_발행된다() {
        TransferRequest tr = createTransferRequest();
        given(transferRequestRepository.findById(1L)).willReturn(Optional.of(tr));
        given(complexMemberRepository.findById(20L)).willReturn(Optional.of(toMember));

        transferService.completeTransfer(1L, 20L);

        ArgumentCaptor<ActivityEvent> captor = ArgumentCaptor.forClass(ActivityEvent.class);
        then(eventPublisher).should(atLeastOnce()).publishEvent(captor.capture());
        List<ActivityEvent> events = captor.getAllValues();

        assertThat(events)
                .as("양도자에게 TRANSFER_OUT 이벤트가 발행되어야 한다")
                .anySatisfy(e -> {
                    assertThat(e.getEventType()).isEqualTo(ActivityEventType.TRANSFER_OUT);
                    assertThat(e.getMember()).isEqualTo(fromMember);
                });
        assertThat(events)
                .as("양수자에게 TRANSFER_IN 이벤트가 발행되어야 한다")
                .anySatisfy(e -> {
                    assertThat(e.getEventType()).isEqualTo(ActivityEventType.TRANSFER_IN);
                    assertThat(e.getMember()).isEqualTo(toMember);
                });
    }

    @Test
    void 양도_완료시_branch가_null이면_SMS를_발송하지_않는다() {
        TransferRequest tr = createTransferRequest();
        tr.setBranch(null);
        given(transferRequestRepository.findById(1L)).willReturn(Optional.of(tr));
        given(complexMemberRepository.findById(20L)).willReturn(Optional.of(toMember));

        TransferRequestResponse response = transferService.completeTransfer(1L, 20L);

        then(smsService).shouldHaveNoInteractions();
        assertThat(response.getSmsWarning()).isNull();
    }

    @Test
    void 완료_서로_다른_사유로_실패하면_양쪽_모두_표기된다() {
        TransferRequest tr = createTransferRequest();
        given(transferRequestRepository.findById(1L)).willReturn(Optional.of(tr));
        given(complexMemberRepository.findById(20L)).willReturn(Optional.of(toMember));
        given(smsService.sendEventSmsIfConfigured(anyLong(), any(), eq("홍길동"), eq("01012345678"), any()))
                .willReturn("문자 발송 실패: 잔여 건수 부족");
        given(smsService.sendEventSmsIfConfigured(anyLong(), any(), eq("김철수"), eq("01098765432"), any()))
                .willReturn("문자 발송 실패: 번호 오류");

        TransferRequestResponse response = transferService.completeTransfer(1L, 20L);

        assertThat(response.getSmsWarning())
                .isEqualTo("양도자 문자 발송 실패: 잔여 건수 부족 / 양수자 문자 발송 실패: 번호 오류");
    }
}
