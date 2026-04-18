package com.culcom.service;

import com.culcom.dto.transfer.TransferCreateRequest;
import com.culcom.entity.branch.Branch;
import com.culcom.entity.complex.member.ComplexMember;
import com.culcom.entity.complex.member.ComplexMemberMembership;
import com.culcom.entity.enums.ActivityEventType;
import com.culcom.entity.enums.MembershipStatus;
import com.culcom.entity.enums.TransferStatus;
import com.culcom.entity.product.Membership;
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
import java.time.LocalDateTime;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;

/**
 * 양도 공개 링크의 만료 처리 및 히스토리 이벤트 발행 검증.
 *
 * 공개 API:
 *   1) getByToken       — status != 생성 이면 "이미 만료된 링크" 예외
 *   2) confirmAndGenerateInvite — status != 생성 이면 예외
 *   3) getByInviteToken — status != 생성 이면 예외
 *
 * 히스토리:
 *   4) create()                   → TRANSFER_REQUEST 이벤트 발행
 *   5) updateStatus(거절)         → TRANSFER_REJECT 이벤트 발행
 *   6) updateStatus(확인)         → TRANSFER_REJECT 이벤트 미발행
 */
@ExtendWith(MockitoExtension.class)
class TransferServiceLinkExpireTest {

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
    private Membership product;
    private ComplexMemberMembership mm;

    @BeforeEach
    void setUp() {
        branch = Branch.builder().seq(1L).branchName("테스트지점").alias("test").build();
        fromMember = ComplexMember.builder().seq(10L).name("양도자").phoneNumber("01011111111").branch(branch).build();
        product = Membership.builder().seq(100L).name("프리미엄").duration(90).count(30).price(300_000).transferable(true).build();
        mm = ComplexMemberMembership.builder()
                .seq(20L).member(fromMember).membership(product)
                .startDate(LocalDate.now()).expiryDate(LocalDate.now().plusMonths(3))
                .totalCount(30).usedCount(5).price("300000")
                .status(MembershipStatus.활성).transferred(false).build();
    }

    private TransferRequest trWithStatus(TransferStatus status) {
        return TransferRequest.builder()
                .seq(1L).memberMembership(mm).fromMember(fromMember).branch(branch)
                .transferFee(20_000).remainingCount(25)
                .token("tok").inviteToken("invTok")
                .status(status).build();
    }

    private TransferRequest trWithCreatedDate(TransferStatus status, LocalDateTime createdDate) {
        TransferRequest tr = trWithStatus(status);
        tr.setCreatedDate(createdDate);
        return tr;
    }

    // ── 공개 API 만료 처리 ──

    @Test
    void getByToken_생성_상태가_아니면_만료된_링크_예외() {
        given(transferRequestRepository.findByToken("tok"))
                .willReturn(Optional.of(trWithStatus(TransferStatus.접수)));

        assertThatThrownBy(() -> transferService.getByToken("tok"))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("이미 만료된 링크입니다.");
    }

    @Test
    void confirmAndGenerateInvite_생성_상태가_아니면_만료된_링크_예외() {
        given(transferRequestRepository.findByToken("tok"))
                .willReturn(Optional.of(trWithStatus(TransferStatus.확인)));

        assertThatThrownBy(() -> transferService.confirmAndGenerateInvite("tok"))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("이미 만료된 링크입니다.");
    }

    @Test
    void getByInviteToken_생성_상태가_아니면_만료된_링크_예외() {
        given(transferRequestRepository.findByInviteToken("invTok"))
                .willReturn(Optional.of(trWithStatus(TransferStatus.거절)));

        assertThatThrownBy(() -> transferService.getByInviteToken("invTok"))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("이미 만료된 링크입니다.");
    }

    // ── 7일 경과 만료 처리 ──

    @Test
    void getByToken_생성된지_7일_초과면_유효하지_않은_링크_예외() {
        TransferRequest tr = trWithCreatedDate(TransferStatus.생성, LocalDateTime.now().minusDays(8));
        given(transferRequestRepository.findByToken("tok")).willReturn(Optional.of(tr));

        assertThatThrownBy(() -> transferService.getByToken("tok"))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("유효하지 않은 링크입니다.");
    }

    @Test
    void getByToken_생성된지_7일_이내면_정상_조회() {
        TransferRequest tr = trWithCreatedDate(TransferStatus.생성, LocalDateTime.now().minusDays(3));
        given(transferRequestRepository.findByToken("tok")).willReturn(Optional.of(tr));

        assertThat(transferService.getByToken("tok")).isNotNull();
    }

    @Test
    void confirmAndGenerateInvite_생성된지_7일_초과면_유효하지_않은_링크_예외() {
        TransferRequest tr = trWithCreatedDate(TransferStatus.생성, LocalDateTime.now().minusDays(10));
        given(transferRequestRepository.findByToken("tok")).willReturn(Optional.of(tr));

        assertThatThrownBy(() -> transferService.confirmAndGenerateInvite("tok"))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("유효하지 않은 링크입니다.");
    }

    @Test
    void getByInviteToken_생성된지_7일_초과면_유효하지_않은_링크_예외() {
        TransferRequest tr = trWithCreatedDate(TransferStatus.생성, LocalDateTime.now().minusDays(8));
        given(transferRequestRepository.findByInviteToken("invTok")).willReturn(Optional.of(tr));

        assertThatThrownBy(() -> transferService.getByInviteToken("invTok"))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("유효하지 않은 링크입니다.");
    }

    @Test
    void submitInvite_생성된지_7일_초과면_유효하지_않은_링크_예외() {
        TransferRequest tr = trWithCreatedDate(TransferStatus.생성, LocalDateTime.now().minusDays(8));
        given(transferRequestRepository.findByInviteToken("invTok")).willReturn(Optional.of(tr));

        assertThatThrownBy(() -> transferService.submitInvite("invTok",
                new com.culcom.dto.transfer.TransferInviteSubmitRequest()))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("유효하지 않은 링크입니다.");
    }

    @Test
    void getByToken_정확히_7일_경계는_유효() {
        // 7일 - 1초는 유효
        TransferRequest tr = trWithCreatedDate(TransferStatus.생성,
                LocalDateTime.now().minusDays(7).plusSeconds(1));
        given(transferRequestRepository.findByToken("tok")).willReturn(Optional.of(tr));

        assertThat(transferService.getByToken("tok")).isNotNull();
    }

    // ── 히스토리 이벤트 ──

    @Test
    void create_호출_시_TRANSFER_REQUEST_이벤트_발행() {
        given(memberMembershipRepository.findById(20L)).willReturn(Optional.of(mm));
        given(paymentRepository.sumAmountByMemberMembershipSeq(20L)).willReturn(300_000L);
        given(transferRequestRepository.save(any(TransferRequest.class)))
                .willAnswer(inv -> inv.getArgument(0));

        TransferCreateRequest req = new TransferCreateRequest();
        req.setMemberMembershipSeq(20L);
        transferService.create(req, 1L);

        ArgumentCaptor<ActivityEvent> captor = ArgumentCaptor.forClass(ActivityEvent.class);
        verify(eventPublisher).publishEvent(captor.capture());
        ActivityEvent ev = captor.getValue();
        assertThat(ev.getEventType()).isEqualTo(ActivityEventType.TRANSFER_REQUEST);
        assertThat(ev.getMember()).isSameAs(fromMember);
        assertThat(ev.getMemberMembershipSeq()).isEqualTo(20L);
        assertThat(ev.getNote()).contains("양도 요청 생성");
    }

    @Test
    void updateStatus_거절_시_TRANSFER_REJECT_이벤트_발행() {
        TransferRequest tr = trWithStatus(TransferStatus.생성);
        given(transferRequestRepository.findById(1L)).willReturn(Optional.of(tr));
        given(transferRequestRepository.save(any(TransferRequest.class))).willReturn(tr);

        transferService.updateStatus(1L, TransferStatus.거절, "요청 반려 사유");

        ArgumentCaptor<ActivityEvent> captor = ArgumentCaptor.forClass(ActivityEvent.class);
        verify(eventPublisher).publishEvent(captor.capture());
        ActivityEvent ev = captor.getValue();
        assertThat(ev.getEventType()).isEqualTo(ActivityEventType.TRANSFER_REJECT);
        assertThat(ev.getMember()).isSameAs(fromMember);
        assertThat(ev.getNote()).contains("양도 요청 거절").contains("요청 반려 사유");
    }

    @Test
    void updateStatus_확인_시_TRANSFER_REJECT_이벤트_미발행() {
        TransferRequest tr = trWithStatus(TransferStatus.접수);
        given(transferRequestRepository.findById(1L)).willReturn(Optional.of(tr));
        given(transferRequestRepository.save(any(TransferRequest.class))).willReturn(tr);

        transferService.updateStatus(1L, TransferStatus.확인, "승인");

        verify(eventPublisher, times(0)).publishEvent(any(ActivityEvent.class));
    }
}
