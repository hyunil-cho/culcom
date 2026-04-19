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
import java.time.temporal.ChronoUnit;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.BDDMockito.given;

/**
 * 연기 요청이 승인되면 멤버십의 만료일이 연기 기간(startDate ~ endDate)만큼
 * 늘어나야 한다는 비즈니스 규칙을 검증한다.
 */
@ExtendWith(MockitoExtension.class)
class PostponementServiceExpiryExtensionTest {

    @Mock ComplexPostponementRequestRepository postponementRepository;
    @Mock ComplexPostponementReasonRepository reasonRepository;
    @Mock BranchRepository branchRepository;
    @Mock ComplexMemberMembershipRepository complexMemberMembershipRepository;
    @Mock ApplicationEventPublisher eventPublisher;
    @Mock SmsService smsService;

    @InjectMocks PostponementService postponementService;

    private Branch branch;
    private ComplexMember member;

    @BeforeEach
    void setUp() {
        branch = Branch.builder().seq(1L).branchName("테스트지점").alias("test-extend").build();
        member = ComplexMember.builder()
                .seq(10L).name("홍길동").phoneNumber("01012345678").branch(branch).build();
    }

    private ComplexMemberMembership newMembership(LocalDate expiryDate) {
        return ComplexMemberMembership.builder()
                .seq(20L).member(member).status(MembershipStatus.활성)
                .startDate(LocalDate.now()).expiryDate(expiryDate)
                .totalCount(30).usedCount(5)
                .postponeTotal(3).postponeUsed(0).build();
    }

    private ComplexPostponementRequest newRequest(ComplexMemberMembership mm,
                                                  LocalDate startDate, LocalDate endDate) {
        return ComplexPostponementRequest.builder()
                .seq(1L).branch(branch).member(member).memberMembership(mm)
                .memberName("홍길동").phoneNumber("01012345678")
                .startDate(startDate).endDate(endDate)
                .reason("개인 사정").status(RequestStatus.대기)
                .build();
    }

    @Test
    void 연기가_승인되면_만료일이_연기기간만큼_연장된다() {
        // given — 6월 30일 만료, 5월 1일~15일 (양끝 포함 15일) 연기
        LocalDate originalExpiry = LocalDate.of(2026, 6, 30);
        ComplexMemberMembership mm = newMembership(originalExpiry);

        LocalDate startDate = LocalDate.of(2026, 5, 1);
        LocalDate endDate   = LocalDate.of(2026, 5, 15);
        long postponeDays = ChronoUnit.DAYS.between(startDate, endDate) + 1; // inclusive

        ComplexPostponementRequest req = newRequest(mm, startDate, endDate);
        given(postponementRepository.findById(1L)).willReturn(Optional.of(req));

        // when
        postponementService.updateStatus(1L, RequestStatus.승인, null);

        // then
        assertThat(mm.getExpiryDate())
                .as("연기 승인 시 만료일이 연기기간(%d일, 양끝 포함)만큼 연장되어야 한다", postponeDays)
                .isEqualTo(originalExpiry.plusDays(postponeDays));
    }

    @Test
    void 연기가_승인되면_postponeUsed가_1_증가한다() {
        // given
        ComplexMemberMembership mm = newMembership(LocalDate.of(2026, 6, 30));
        int originalUsed = mm.getPostponeUsed();
        ComplexPostponementRequest req = newRequest(mm,
                LocalDate.of(2026, 5, 1), LocalDate.of(2026, 5, 15));
        given(postponementRepository.findById(1L)).willReturn(Optional.of(req));

        // when
        postponementService.updateStatus(1L, RequestStatus.승인, null);

        // then
        assertThat(mm.getPostponeUsed()).isEqualTo(originalUsed + 1);
    }

    @Test
    void 반려된_연기는_만료일을_변경하지_않는다() {
        // given
        LocalDate originalExpiry = LocalDate.of(2026, 6, 30);
        ComplexMemberMembership mm = newMembership(originalExpiry);
        ComplexPostponementRequest req = newRequest(mm,
                LocalDate.of(2026, 5, 1), LocalDate.of(2026, 5, 15));
        given(postponementRepository.findById(1L)).willReturn(Optional.of(req));

        // when
        postponementService.updateStatus(1L, RequestStatus.반려, "사유 부족");

        // then
        assertThat(mm.getExpiryDate())
                .as("반려 시 만료일은 그대로여야 한다")
                .isEqualTo(originalExpiry);
    }

}
