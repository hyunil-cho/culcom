package com.culcom.service;

import com.culcom.entity.branch.Branch;
import com.culcom.entity.complex.member.ComplexMember;
import com.culcom.entity.complex.member.ComplexMemberMembership;
import com.culcom.entity.complex.postponement.ComplexPostponementRequest;
import com.culcom.entity.enums.MembershipStatus;
import com.culcom.entity.enums.RequestStatus;
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
import static org.mockito.BDDMockito.given;
import static org.mockito.BDDMockito.then;
import static org.mockito.Mockito.never;

/**
 * 연기 요청이 이미 승인/반려된 경우 상태를 다시 변경할 수 없어야 한다.
 * SMS 발송·멤버십 사이드이펙트도 함께 차단되어야 하므로 함께 검증.
 */
@ExtendWith(MockitoExtension.class)
class PostponementServiceStatusLockTest {

    @Mock ComplexPostponementRequestRepository postponementRepository;
    @Mock ComplexPostponementReasonRepository reasonRepository;
    @Mock BranchRepository branchRepository;
    @Mock ComplexMemberMembershipRepository complexMemberMembershipRepository;
    @Mock ApplicationEventPublisher eventPublisher;
    @Mock SmsService smsService;

    @InjectMocks PostponementService postponementService;

    private Branch branch;
    private ComplexMember member;
    private ComplexMemberMembership membership;

    @BeforeEach
    void setUp() {
        branch = Branch.builder().seq(1L).branchName("테스트지점").alias("test-lock").build();
        member = ComplexMember.builder().seq(10L).name("홍길동").phoneNumber("01012345678").branch(branch).build();
        membership = ComplexMemberMembership.builder()
                .seq(20L).member(member).status(MembershipStatus.활성)
                .startDate(LocalDate.now()).expiryDate(LocalDate.now().plusMonths(3))
                .totalCount(30).usedCount(5)
                .postponeTotal(3).postponeUsed(0).build();
    }

    private ComplexPostponementRequest requestWithStatus(RequestStatus initialStatus) {
        return ComplexPostponementRequest.builder()
                .seq(1L).branch(branch).member(member).memberMembership(membership)
                .memberName("홍길동").phoneNumber("01012345678")
                .startDate(LocalDate.now().plusDays(1))
                .endDate(LocalDate.now().plusDays(15))
                .reason("개인 사정").status(initialStatus)
                .build();
    }

    @Test
    void 이미_승인된_연기요청은_다시_승인할_수_없다() {
        given(postponementRepository.findById(1L)).willReturn(Optional.of(requestWithStatus(RequestStatus.승인)));

        assertThatThrownBy(() -> postponementService.updateStatus(1L, RequestStatus.승인, null))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("이미 처리된");
    }

    @Test
    void 이미_승인된_연기요청은_반려로_변경할_수_없다() {
        given(postponementRepository.findById(1L)).willReturn(Optional.of(requestWithStatus(RequestStatus.승인)));

        assertThatThrownBy(() -> postponementService.updateStatus(1L, RequestStatus.반려, "변심"))
                .isInstanceOf(IllegalStateException.class);
    }

    @Test
    void 이미_승인된_연기요청은_대기로_되돌릴_수_없다() {
        given(postponementRepository.findById(1L)).willReturn(Optional.of(requestWithStatus(RequestStatus.승인)));

        assertThatThrownBy(() -> postponementService.updateStatus(1L, RequestStatus.대기, null))
                .isInstanceOf(IllegalStateException.class);
    }

    @Test
    void 이미_반려된_연기요청은_승인으로_변경할_수_없다() {
        given(postponementRepository.findById(1L)).willReturn(Optional.of(requestWithStatus(RequestStatus.반려)));

        assertThatThrownBy(() -> postponementService.updateStatus(1L, RequestStatus.승인, null))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("이미 처리된");
    }

    @Test
    void 이미_반려된_연기요청은_다시_반려할_수_없다() {
        given(postponementRepository.findById(1L)).willReturn(Optional.of(requestWithStatus(RequestStatus.반려)));

        assertThatThrownBy(() -> postponementService.updateStatus(1L, RequestStatus.반려, "재반려"))
                .isInstanceOf(IllegalStateException.class);
    }

    @Test
    void 종결상태에서_변경_시도하면_저장과_SMS_모두_호출되지_않는다() {
        given(postponementRepository.findById(1L)).willReturn(Optional.of(requestWithStatus(RequestStatus.승인)));

        assertThatThrownBy(() -> postponementService.updateStatus(1L, RequestStatus.반려, "사유"))
                .isInstanceOf(IllegalStateException.class);

        then(postponementRepository).should(never()).save(org.mockito.ArgumentMatchers.any());
        then(smsService).shouldHaveNoInteractions();
        then(eventPublisher).shouldHaveNoInteractions();
    }

    @Test
    void 대기상태에서는_정상적으로_승인_가능하다() {
        given(postponementRepository.findById(1L)).willReturn(Optional.of(requestWithStatus(RequestStatus.대기)));

        // 예외가 던져지지 않아야 한다.
        postponementService.updateStatus(1L, RequestStatus.승인, null);
    }
}
