package com.culcom.service;

import com.culcom.entity.branch.Branch;
import com.culcom.entity.complex.member.ComplexMember;
import com.culcom.entity.complex.member.ComplexMemberMembership;
import com.culcom.entity.enums.MembershipStatus;
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

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.mockito.BDDMockito.then;
import static org.mockito.Mockito.never;

/**
 * 양도 요청이 이미 확인/거절된 경우 상태를 다시 변경할 수 없어야 한다.
 * SMS 발송·이벤트 발행 사이드이펙트도 함께 차단되어야 한다.
 */
@ExtendWith(MockitoExtension.class)
class TransferServiceStatusLockTest {

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
    private Membership membershipProduct;
    private ComplexMemberMembership memberMembership;

    @BeforeEach
    void setUp() {
        branch = Branch.builder().seq(1L).branchName("테스트지점").alias("test-transfer-lock").build();
        fromMember = ComplexMember.builder().seq(10L).name("홍길동").phoneNumber("01012345678").branch(branch).build();
        membershipProduct = Membership.builder().seq(1L).name("3개월권").duration(90).count(30).price(300000).build();
        memberMembership = ComplexMemberMembership.builder()
                .seq(100L).member(fromMember).membership(membershipProduct)
                .status(MembershipStatus.활성)
                .startDate(LocalDate.now()).expiryDate(LocalDate.now().plusMonths(3))
                .totalCount(30).usedCount(5)
                .postponeTotal(3).postponeUsed(0)
                .build();
    }

    private TransferRequest requestWithStatus(TransferStatus initialStatus) {
        return TransferRequest.builder()
                .seq(1L).memberMembership(memberMembership).fromMember(fromMember)
                .branch(branch).status(initialStatus)
                .transferFee(20000).remainingCount(25).token("test-token")
                .build();
    }

    @Test
    void 이미_확인된_양도요청은_다시_확인할_수_없다() {
        given(transferRequestRepository.findById(1L)).willReturn(Optional.of(requestWithStatus(TransferStatus.확인)));

        assertThatThrownBy(() -> transferService.updateStatus(1L, TransferStatus.확인, null))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("이미 처리된");
    }

    @Test
    void 이미_확인된_양도요청은_거절로_변경할_수_없다() {
        given(transferRequestRepository.findById(1L)).willReturn(Optional.of(requestWithStatus(TransferStatus.확인)));

        assertThatThrownBy(() -> transferService.updateStatus(1L, TransferStatus.거절, "변심"))
                .isInstanceOf(IllegalStateException.class);
    }

    @Test
    void 이미_거절된_양도요청은_확인으로_변경할_수_없다() {
        given(transferRequestRepository.findById(1L)).willReturn(Optional.of(requestWithStatus(TransferStatus.거절)));

        assertThatThrownBy(() -> transferService.updateStatus(1L, TransferStatus.확인, null))
                .isInstanceOf(IllegalStateException.class);
    }

    @Test
    void 이미_거절된_양도요청은_다시_거절할_수_없다() {
        given(transferRequestRepository.findById(1L)).willReturn(Optional.of(requestWithStatus(TransferStatus.거절)));

        assertThatThrownBy(() -> transferService.updateStatus(1L, TransferStatus.거절, "재거절"))
                .isInstanceOf(IllegalStateException.class);
    }

    @Test
    void 종결상태에서_변경_시도하면_저장과_SMS_모두_호출되지_않는다() {
        given(transferRequestRepository.findById(1L)).willReturn(Optional.of(requestWithStatus(TransferStatus.확인)));

        assertThatThrownBy(() -> transferService.updateStatus(1L, TransferStatus.거절, "사유"))
                .isInstanceOf(IllegalStateException.class);

        then(transferRequestRepository).should(never()).save(any());
        then(smsService).shouldHaveNoInteractions();
        then(eventPublisher).shouldHaveNoInteractions();
    }

    @Test
    void 접수상태에서는_정상적으로_확인_가능하다() {
        TransferRequest tr = requestWithStatus(TransferStatus.접수);
        given(transferRequestRepository.findById(1L)).willReturn(Optional.of(tr));
        given(transferRequestRepository.save(any())).willReturn(tr);

        // 예외가 던져지지 않아야 한다.
        transferService.updateStatus(1L, TransferStatus.확인, null);
    }
}
