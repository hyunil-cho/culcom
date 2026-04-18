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

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.BDDMockito.given;

/**
 * 연기 공개 링크의 중복/겹침 검증.
 *
 * 규칙:
 *   1) 동일 멤버십에 대기 상태 연기 존재 → 차단
 *   2) 승인된 연기 기간과 겹치면 → 차단
 *   3) 다른 대기 연기와 기간이 겹치면 → 차단
 *   4) 기간이 안 겹치고 중복 없으면 → 정상 제출
 */
@ExtendWith(MockitoExtension.class)
class PublicPostponementServiceOverlapTest {

    @Mock ComplexMemberRepository memberRepository;
    @Mock ComplexMemberMembershipRepository memberMembershipRepository;
    @Mock ComplexPostponementRequestRepository postponementRepository;
    @Mock ComplexPostponementReasonRepository reasonRepository;
    @Mock MembershipPaymentRepository paymentRepository;
    @Mock BranchRepository branchRepository;
    @Mock ComplexClassRepository classRepository;
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

    /** 완납 / 활성 / 미수금 없음 기본 stub. 호출 여부와 무관하게 세팅. */
    private void baseStubs() {
        given(branchRepository.findById(1L)).willReturn(Optional.of(branch));
        given(memberRepository.findById(10L)).willReturn(Optional.of(member));
        given(memberMembershipRepository.findById(20L)).willReturn(Optional.of(membership));
        given(paymentRepository.sumAmountByMemberMembershipSeq(20L)).willReturn(300_000L);
    }

    @Test
    void 대기_상태_연기_요청이_존재하면_제출_차단() {
        baseStubs();
        given(postponementRepository.existsPendingByMemberMembershipSeq(20L)).willReturn(true);

        assertThatThrownBy(() -> publicPostponementService.submit(createRequest()))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("이미 처리 대기 중인 연기 요청이 있습니다");
    }

    @Test
    void 승인된_연기_기간과_겹치면_제출_차단() {
        baseStubs();
        given(postponementRepository.existsPendingByMemberMembershipSeq(20L)).willReturn(false);
        given(postponementRepository.existsApprovedOverlap(anyLong(), any(), any())).willReturn(true);

        assertThatThrownBy(() -> publicPostponementService.submit(createRequest()))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("이미 승인된 연기 기간과 겹칩니다");
    }

    @Test
    void 다른_대기_연기_기간과_겹치면_제출_차단() {
        baseStubs();
        given(postponementRepository.existsPendingByMemberMembershipSeq(20L)).willReturn(false);
        given(postponementRepository.existsApprovedOverlap(anyLong(), any(), any())).willReturn(false);
        given(postponementRepository.existsPendingOverlap(anyLong(), any(), any())).willReturn(true);

        assertThatThrownBy(() -> publicPostponementService.submit(createRequest()))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("이미 신청 중인 연기 기간과 겹칩니다");
    }

    @Test
    void 중복_없고_기간도_안겹치면_정상_제출() {
        baseStubs();
        given(postponementRepository.existsPendingByMemberMembershipSeq(20L)).willReturn(false);
        given(postponementRepository.existsApprovedOverlap(anyLong(), any(), any())).willReturn(false);
        given(postponementRepository.existsPendingOverlap(anyLong(), any(), any())).willReturn(false);

        assertThatCode(() -> publicPostponementService.submit(createRequest()))
                .doesNotThrowAnyException();
    }
}
