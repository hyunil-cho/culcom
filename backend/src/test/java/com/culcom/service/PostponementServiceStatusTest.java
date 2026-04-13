package com.culcom.service;

import com.culcom.dto.complex.postponement.PostponementCreateRequest;
import com.culcom.entity.branch.Branch;
import com.culcom.entity.complex.member.ComplexMember;
import com.culcom.entity.complex.member.ComplexMemberMembership;
import com.culcom.entity.enums.MembershipStatus;
import com.culcom.entity.product.Membership;
import com.culcom.repository.BranchRepository;
import com.culcom.repository.ComplexMemberMembershipRepository;
import com.culcom.repository.ComplexMemberRepository;
import com.culcom.repository.MembershipRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;

import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * 데이터 무결성 시나리오:
 * 이미 환불/만료/정지된 멤버십에는 연기 신청이 허용되어서는 안 된다.
 *
 * - 환불: 비가역적으로 사용 불가 상태. 새 연기 사건을 만들 의미가 없음.
 * - 만료: 기간 종료 또는 횟수 소진. 역시 사용 불가.
 * - 정지: 일시 사용 불가. 정지 해제 전에는 새 연기 신청을 받지 않는다.
 *
 * 이 테스트는 {@link PostponementService#create}가 {@link ComplexMemberMembership#isActive()}
 * 기준으로 멤버십 상태를 검증하는지 확인한다.
 */
@SpringBootTest
@ActiveProfiles("test")
@Transactional
class PostponementServiceStatusTest {

    @Autowired PostponementService postponementService;
    @Autowired BranchRepository branchRepository;
    @Autowired MembershipRepository membershipRepository;
    @Autowired ComplexMemberRepository memberRepository;
    @Autowired ComplexMemberMembershipRepository memberMembershipRepository;

    @Test
    void 환불된_멤버십에는_연기신청_불가() {
        // given
        Branch branch = branchRepository.save(Branch.builder()
                .branchName("테스트지점")
                .alias("test-postpone-refunded-" + System.nanoTime())
                .build());

        Membership membership = membershipRepository.save(Membership.builder()
                .name("3개월권")
                .duration(90)
                .count(30)
                .price(300000)
                .build());

        ComplexMember member = memberRepository.save(ComplexMember.builder()
                .name("홍길동")
                .phoneNumber("01011112222")
                .branch(branch)
                .build());

        // 환불 처리된 멤버십 — 연기 여유 횟수는 충분함(기존 한도 체크만으로는 막히지 않음)
        ComplexMemberMembership mm = memberMembershipRepository.save(ComplexMemberMembership.builder()
                .member(member)
                .membership(membership)
                .startDate(LocalDate.now().minusDays(10))
                .expiryDate(LocalDate.now().plusDays(80))
                .totalCount(30)
                .postponeTotal(3)
                .postponeUsed(0)
                .status(MembershipStatus.환불)
                .build());

        PostponementCreateRequest req = new PostponementCreateRequest();
        req.setMemberSeq(member.getSeq());
        req.setMemberMembershipSeq(mm.getSeq());
        req.setMemberName(member.getName());
        req.setPhoneNumber(member.getPhoneNumber());
        req.setStartDate(LocalDate.now().plusDays(1));
        req.setEndDate(LocalDate.now().plusDays(7));
        req.setReason("출장");

        // when / then — 환불된 멤버십이므로 예외가 발생해야 한다.
        assertThatThrownBy(() -> postponementService.create(req, branch.getSeq()))
                .isInstanceOf(IllegalStateException.class);
    }

    @Test
    void 만료된_멤버십에는_연기신청_불가() {
        // given
        Branch branch = branchRepository.save(Branch.builder()
                .branchName("테스트지점")
                .alias("test-postpone-expired-" + System.nanoTime())
                .build());

        Membership membership = membershipRepository.save(Membership.builder()
                .name("1개월권")
                .duration(30)
                .count(10)
                .price(100000)
                .build());

        ComplexMember member = memberRepository.save(ComplexMember.builder()
                .name("이몽룡")
                .phoneNumber("01033334444")
                .branch(branch)
                .build());

        // 기간 만료된 멤버십 (expiryDate가 과거)
        ComplexMemberMembership mm = memberMembershipRepository.save(ComplexMemberMembership.builder()
                .member(member)
                .membership(membership)
                .startDate(LocalDate.now().minusDays(60))
                .expiryDate(LocalDate.now().minusDays(30))
                .totalCount(10)
                .postponeTotal(3)
                .postponeUsed(0)
                .status(MembershipStatus.만료)
                .build());

        PostponementCreateRequest req = new PostponementCreateRequest();
        req.setMemberSeq(member.getSeq());
        req.setMemberMembershipSeq(mm.getSeq());
        req.setMemberName(member.getName());
        req.setPhoneNumber(member.getPhoneNumber());
        req.setStartDate(LocalDate.now().plusDays(1));
        req.setEndDate(LocalDate.now().plusDays(7));
        req.setReason("개인사정");

        assertThatThrownBy(() -> postponementService.create(req, branch.getSeq()))
                .isInstanceOf(IllegalStateException.class);
    }

    @Test
    void 정지된_멤버십에는_연기신청_불가() {
        // given
        Branch branch = branchRepository.save(Branch.builder()
                .branchName("테스트지점")
                .alias("test-postpone-suspended-" + System.nanoTime())
                .build());

        Membership membership = membershipRepository.save(Membership.builder()
                .name("3개월권")
                .duration(90)
                .count(30)
                .price(300000)
                .build());

        ComplexMember member = memberRepository.save(ComplexMember.builder()
                .name("성춘향")
                .phoneNumber("01055556666")
                .branch(branch)
                .build());

        ComplexMemberMembership mm = memberMembershipRepository.save(ComplexMemberMembership.builder()
                .member(member)
                .membership(membership)
                .startDate(LocalDate.now().minusDays(5))
                .expiryDate(LocalDate.now().plusDays(85))
                .totalCount(30)
                .postponeTotal(3)
                .postponeUsed(0)
                .status(MembershipStatus.정지)
                .build());

        PostponementCreateRequest req = new PostponementCreateRequest();
        req.setMemberSeq(member.getSeq());
        req.setMemberMembershipSeq(mm.getSeq());
        req.setMemberName(member.getName());
        req.setPhoneNumber(member.getPhoneNumber());
        req.setStartDate(LocalDate.now().plusDays(1));
        req.setEndDate(LocalDate.now().plusDays(7));
        req.setReason("개인사정");

        assertThatThrownBy(() -> postponementService.create(req, branch.getSeq()))
                .isInstanceOf(IllegalStateException.class);
    }
}