package com.culcom.service;

import com.culcom.dto.complex.refund.RefundCreateRequest;
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
 * 이미 환불/만료/정지 상태인 멤버십에 대해서는 새 환불 신청이 허용되어서는 안 된다.
 *
 * - 환불: 비가역적으로 종결된 상태. 중복 환불 요청은 의미가 없고 금전적 부작용 위험.
 * - 만료: 기간 종료/횟수 소진. 더 이상 반환할 미사용분이 없음.
 * - 정지: 일시 사용 불가. 정지 해제 전에는 환불 신청도 받지 않는다.
 *
 * 이 테스트는 {@link RefundService#create}가 {@link ComplexMemberMembership#isActive()}
 * 기준으로 멤버십 상태를 검증하는지 확인한다.
 */
@SpringBootTest
@ActiveProfiles("test")
@Transactional
class RefundServiceStatusTest {

    @Autowired RefundService refundService;
    @Autowired BranchRepository branchRepository;
    @Autowired MembershipRepository membershipRepository;
    @Autowired ComplexMemberRepository memberRepository;
    @Autowired ComplexMemberMembershipRepository memberMembershipRepository;

    private RefundCreateRequest buildReq(ComplexMember member, ComplexMemberMembership mm) {
        RefundCreateRequest req = new RefundCreateRequest();
        req.setMemberSeq(member.getSeq());
        req.setMemberMembershipSeq(mm.getSeq());
        req.setMemberName(member.getName());
        req.setPhoneNumber(member.getPhoneNumber());
        req.setMembershipName("3개월권");
        req.setPrice("300000");
        req.setReason("단순 변심");
        req.setBankName("국민");
        req.setAccountNumber("123-456-7890");
        req.setAccountHolder(member.getName());
        return req;
    }

    @Test
    void 이미_환불된_멤버십에_재환불_신청은_거부() {
        // given
        Branch branch = branchRepository.save(Branch.builder()
                .branchName("테스트지점")
                .alias("test-refund-refunded-" + System.nanoTime())
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

        // 이미 환불 처리된 멤버십 (기간/횟수 자체는 남아있음 — 상태만 환불)
        ComplexMemberMembership mm = memberMembershipRepository.save(ComplexMemberMembership.builder()
                .member(member)
                .membership(membership)
                .startDate(LocalDate.now().minusDays(10))
                .expiryDate(LocalDate.now().plusDays(80))
                .totalCount(30)
                .status(MembershipStatus.환불)
                .build());

        // when / then — 이미 환불된 멤버십이므로 재환불 신청은 거부되어야 한다.
        assertThatThrownBy(() -> refundService.create(buildReq(member, mm), branch.getSeq()))
                .isInstanceOf(IllegalStateException.class);
    }

    @Test
    void 만료된_멤버십에_환불_신청은_거부() {
        // given
        Branch branch = branchRepository.save(Branch.builder()
                .branchName("테스트지점")
                .alias("test-refund-expired-" + System.nanoTime())
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
                .status(MembershipStatus.만료)
                .build());

        assertThatThrownBy(() -> refundService.create(buildReq(member, mm), branch.getSeq()))
                .isInstanceOf(IllegalStateException.class);
    }

    @Test
    void 정지된_멤버십에_환불_신청은_거부() {
        // given
        Branch branch = branchRepository.save(Branch.builder()
                .branchName("테스트지점")
                .alias("test-refund-suspended-" + System.nanoTime())
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
                .status(MembershipStatus.정지)
                .build());

        assertThatThrownBy(() -> refundService.create(buildReq(member, mm), branch.getSeq()))
                .isInstanceOf(IllegalStateException.class);
    }
}
