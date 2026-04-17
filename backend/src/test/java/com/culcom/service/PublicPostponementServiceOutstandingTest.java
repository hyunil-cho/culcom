package com.culcom.service;

import com.culcom.dto.publicapi.PostponementSubmitRequest;
import com.culcom.entity.branch.Branch;
import com.culcom.entity.complex.member.ComplexMember;
import com.culcom.entity.complex.member.ComplexMemberMembership;
import com.culcom.entity.enums.MembershipStatus;
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
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.mockito.BDDMockito.*;

@ExtendWith(MockitoExtension.class)
class PublicPostponementServiceOutstandingTest {

    @Mock ComplexMemberRepository memberRepository;
    @Mock ComplexMemberMembershipRepository memberMembershipRepository;
    @Mock ComplexPostponementRequestRepository postponementRepository;
    @Mock ComplexPostponementReasonRepository reasonRepository;
    @Mock MembershipPaymentRepository paymentRepository;
    @Mock BranchRepository branchRepository;
    @Mock ApplicationEventPublisher eventPublisher;
    @Mock PublicMemberSearchService memberSearchService;

    @InjectMocks PublicPostponementService publicPostponementService;

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
                .price("300,000").totalCount(30).usedCount(5)
                .postponeTotal(3).postponeUsed(0).build();
    }

    private PostponementSubmitRequest createRequest() {
        PostponementSubmitRequest req = new PostponementSubmitRequest();
        req.setBranchSeq(1L);
        req.setMemberSeq(10L);
        req.setMemberMembershipSeq(20L);
        req.setName("홍길동");
        req.setPhone("01012345678");
        req.setStartDate("2026-04-20");
        req.setEndDate("2026-05-04");
        req.setReason("개인 사정");
        return req;
    }

    @Test
    void 미수금이_있으면_연기_신청_실패() {
        given(branchRepository.findById(1L)).willReturn(Optional.of(branch));
        given(memberRepository.findById(10L)).willReturn(Optional.of(member));
        given(memberMembershipRepository.findById(20L)).willReturn(Optional.of(membership));
        given(paymentRepository.sumAmountByMemberMembershipSeq(20L)).willReturn(100_000L);

        assertThatThrownBy(() -> publicPostponementService.submit(createRequest()))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("미수금이 있어 연기 신청을 할 수 없습니다");
    }

    @Test
    void 완납_상태면_연기_신청_성공() {
        given(branchRepository.findById(1L)).willReturn(Optional.of(branch));
        given(memberRepository.findById(10L)).willReturn(Optional.of(member));
        given(memberMembershipRepository.findById(20L)).willReturn(Optional.of(membership));
        given(paymentRepository.sumAmountByMemberMembershipSeq(20L)).willReturn(300_000L);

        assertThatCode(() -> publicPostponementService.submit(createRequest()))
                .doesNotThrowAnyException();
    }

    @Test
    void 초과_납부_상태면_연기_신청_성공() {
        given(branchRepository.findById(1L)).willReturn(Optional.of(branch));
        given(memberRepository.findById(10L)).willReturn(Optional.of(member));
        given(memberMembershipRepository.findById(20L)).willReturn(Optional.of(membership));
        given(paymentRepository.sumAmountByMemberMembershipSeq(20L)).willReturn(350_000L);

        assertThatCode(() -> publicPostponementService.submit(createRequest()))
                .doesNotThrowAnyException();
    }

    @Test
    void 비활성_멤버십이면_연기_신청_실패() {
        membership = ComplexMemberMembership.builder()
                .seq(20L).member(member).status(MembershipStatus.만료)
                .startDate(LocalDate.now().minusMonths(3)).expiryDate(LocalDate.now().minusDays(1))
                .price("300,000").totalCount(30).usedCount(5)
                .postponeTotal(3).postponeUsed(0).build();

        given(branchRepository.findById(1L)).willReturn(Optional.of(branch));
        given(memberRepository.findById(10L)).willReturn(Optional.of(member));
        given(memberMembershipRepository.findById(20L)).willReturn(Optional.of(membership));

        assertThatThrownBy(() -> publicPostponementService.submit(createRequest()))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("사용할 수 없는 멤버십");
    }

    @Test
    void 멤버십_지정_없으면_미수금_체크_건너뜀() {
        PostponementSubmitRequest req = createRequest();
        req.setMemberMembershipSeq(null);

        given(branchRepository.findById(1L)).willReturn(Optional.of(branch));
        given(memberRepository.findById(10L)).willReturn(Optional.of(member));

        assertThatCode(() -> publicPostponementService.submit(req))
                .doesNotThrowAnyException();
    }
}
