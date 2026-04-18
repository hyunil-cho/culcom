package com.culcom.service;

import com.culcom.dto.publicapi.ClassInfo;
import com.culcom.dto.publicapi.MemberInfo;
import com.culcom.dto.publicapi.MemberSearchResponse;
import com.culcom.dto.publicapi.MembershipInfo;
import com.culcom.dto.publicapi.RefundSubmitRequest;
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
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;

/**
 * 환불 공개 링크의 중복 차단 + 만료 링크 처리 검증.
 *
 * 시나리오:
 *   1) 동일 멤버십에 대기 상태 환불 존재 → 제출 차단
 *   2) 동일 멤버십에 반려 상태 환불 존재 → 제출 차단 (관리자 문의 유도)
 *   3) 기존 환불 없음 → 정상 제출
 *   4) searchMember: 대기/반려 환불이 있는 멤버십은 응답에서 제거
 *   5) searchMember: 활성 멤버십이 모두 차단된 경우 "이미 만료된 링크" 예외
 *   6) searchMember: 차단되지 않은 멤버십이 하나라도 있으면 정상 응답
 */
@ExtendWith(MockitoExtension.class)
class PublicRefundServiceLinkExpireTest {

    @Mock ComplexMemberRepository memberRepository;
    @Mock ComplexMemberMembershipRepository memberMembershipRepository;
    @Mock ComplexRefundRequestRepository refundRequestRepository;
    @Mock ComplexRefundReasonRepository refundReasonRepository;
    @Mock MembershipPaymentRepository paymentRepository;
    @Mock ApplicationEventPublisher eventPublisher;
    @Mock PublicMemberSearchService memberSearchService;

    @InjectMocks PublicRefundService publicRefundService;

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
                .price("300,000").totalCount(30).usedCount(5).build();
    }

    private RefundSubmitRequest createRequest() {
        RefundSubmitRequest req = new RefundSubmitRequest();
        req.setMemberSeq(10L);
        req.setMemberMembershipSeq(20L);
        req.setMemberName("홍길동");
        req.setPhoneNumber("01012345678");
        req.setMembershipName("3개월권");
        req.setPrice("300,000");
        req.setReason("개인 사정");
        return req;
    }

    // ── submit(): 중복 요청 차단 ──

    @Test
    void 동일_멤버십에_대기_또는_반려_환불이_있으면_제출_차단() {
        given(memberRepository.findById(10L)).willReturn(Optional.of(member));
        given(memberMembershipRepository.findById(20L)).willReturn(Optional.of(membership));
        given(refundRequestRepository.existsBlockingByMemberMembershipSeq(20L)).willReturn(true);

        assertThatThrownBy(() -> publicRefundService.submit(createRequest()))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("이미 만료된 링크입니다.");
    }

    @Test
    void 기존_환불이_없으면_정상_제출() {
        given(memberRepository.findById(10L)).willReturn(Optional.of(member));
        given(memberMembershipRepository.findById(20L)).willReturn(Optional.of(membership));
        given(refundRequestRepository.existsBlockingByMemberMembershipSeq(20L)).willReturn(false);
        given(paymentRepository.sumAmountByMemberMembershipSeq(20L)).willReturn(300_000L);

        assertThatCode(() -> publicRefundService.submit(createRequest()))
                .doesNotThrowAnyException();
    }

    // ── searchMember(): 만료 링크 처리 ──

    @Test
    void searchMember_모든_멤버십이_차단되면_만료된_링크_예외() {
        MemberInfo raw = new MemberInfo(10L, "홍길동", "01012345678", 1L, "테스트지점", null,
                List.of(new MembershipInfo(20L, "3개월권", "2026-01-01", "2026-04-01", 30, 5, 3, 0)),
                List.<ClassInfo>of());
        given(memberSearchService.search(any(), any(), any(), anyBooleanFlag()))
                .willReturn(new MemberSearchResponse(List.of(raw)));
        given(refundRequestRepository.findBlockedMemberMembershipSeqs(List.of(20L)))
                .willReturn(List.of(20L));

        assertThatThrownBy(() -> publicRefundService.searchMember("홍길동", "01012345678"))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("이미 만료된 링크입니다.");
    }

    @Test
    void searchMember_일부만_차단되면_나머지_멤버십만_반환() {
        MemberInfo raw = new MemberInfo(10L, "홍길동", "01012345678", 1L, "테스트지점", null,
                List.of(
                        new MembershipInfo(20L, "3개월권", "2026-01-01", "2026-04-01", 30, 5, 3, 0),
                        new MembershipInfo(21L, "6개월권", "2026-01-01", "2026-07-01", 60, 10, 3, 0)
                ),
                List.<ClassInfo>of());
        given(memberSearchService.search(any(), any(), any(), anyBooleanFlag()))
                .willReturn(new MemberSearchResponse(List.of(raw)));
        given(refundRequestRepository.findBlockedMemberMembershipSeqs(List.of(20L, 21L)))
                .willReturn(List.of(20L));

        MemberSearchResponse res = publicRefundService.searchMember("홍길동", "01012345678");

        assertThat(res.getMembers()).hasSize(1);
        assertThat(res.getMembers().get(0).getMemberships())
                .extracting(MembershipInfo::getSeq)
                .containsExactly(21L);
    }

    @Test
    void searchMember_차단_환불이_없으면_원본_응답_유지() {
        MemberInfo raw = new MemberInfo(10L, "홍길동", "01012345678", 1L, "테스트지점", null,
                List.of(new MembershipInfo(20L, "3개월권", "2026-01-01", "2026-04-01", 30, 5, 3, 0)),
                List.<ClassInfo>of());
        given(memberSearchService.search(any(), any(), any(), anyBooleanFlag()))
                .willReturn(new MemberSearchResponse(List.of(raw)));
        given(refundRequestRepository.findBlockedMemberMembershipSeqs(List.of(20L)))
                .willReturn(List.of());

        MemberSearchResponse res = publicRefundService.searchMember("홍길동", "01012345678");

        assertThat(res.getMembers()).hasSize(1);
        assertThat(res.getMembers().get(0).getMemberships()).hasSize(1);
    }

    /** boolean primitive matcher (ArgumentMatchers.anyBoolean() 만으로는 varargs 해석 충돌이 생길 수 있어 별도 추출). */
    private static boolean anyBooleanFlag() {
        return org.mockito.ArgumentMatchers.anyBoolean();
    }
}
