package com.culcom.service;

import com.culcom.dto.complex.postponement.PostponementCreateRequest;
import com.culcom.entity.branch.Branch;
import com.culcom.entity.complex.member.ComplexMember;
import com.culcom.entity.complex.member.ComplexMemberMembership;
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

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.assertj.core.api.Assertions.assertThatCode;

/**
 * 데이터 무결성 시나리오:
 * 회원이 멤버십을 구매하여 보유한 상태에서 연기 신청을 할 때,
 * 멤버십이 허용한 최대 연기 횟수(postponeTotal)를 이미 모두 사용했다면(postponeUsed >= postponeTotal)
 * 추가 연기 신청은 거부되어야 한다.
 */
@SpringBootTest
@ActiveProfiles("test")
@Transactional
class PostponementServiceLimitTest {

    @Autowired PostponementService postponementService;
    @Autowired BranchRepository branchRepository;
    @Autowired MembershipRepository membershipRepository;
    @Autowired ComplexMemberRepository memberRepository;
    @Autowired ComplexMemberMembershipRepository memberMembershipRepository;

    @Test
    void 연기횟수_초과_시_신청_거부() {
        // given
        Branch branch = branchRepository.save(Branch.builder()
                .branchName("테스트지점")
                .alias("test-postpone-" + System.nanoTime())
                .build());

        Membership membership = membershipRepository.save(Membership.builder()
                .name("3개월권")
                .duration(90)
                .count(30)
                .price(300000)
                .build());

        ComplexMember member = memberRepository.save(ComplexMember.builder()
                .name("홍길동")
                .phoneNumber("01099998888")
                .branch(branch)
                .build());

        // postponeTotal=2, postponeUsed=2 → 한도 소진 상태
        ComplexMemberMembership mm = memberMembershipRepository.save(ComplexMemberMembership.builder()
                .member(member)
                .membership(membership)
                .startDate(LocalDate.now())
                .expiryDate(LocalDate.now().plusDays(90))
                .totalCount(30)
                .postponeTotal(2)
                .postponeUsed(2)
                .build());

        PostponementCreateRequest req = new PostponementCreateRequest();
        req.setMemberSeq(member.getSeq());
        req.setMemberMembershipSeq(mm.getSeq());
        req.setMemberName(member.getName());
        req.setPhoneNumber(member.getPhoneNumber());
        req.setStartDate(LocalDate.now().plusDays(1));
        req.setEndDate(LocalDate.now().plusDays(7));
        req.setReason("출장");

        // when / then — 한도 초과 → 예외
        assertThatThrownBy(() -> postponementService.create(req, branch.getSeq()))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("연기 가능 횟수를 초과");
    }

    @Test
    void 연기횟수_여유있을때는_신청_허용() {
        // given
        Branch branch = branchRepository.save(Branch.builder()
                .branchName("테스트지점")
                .alias("test-postpone-ok-" + System.nanoTime())
                .build());

        Membership membership = membershipRepository.save(Membership.builder()
                .name("3개월권")
                .duration(90)
                .count(30)
                .price(300000)
                .build());

        ComplexMember member = memberRepository.save(ComplexMember.builder()
                .name("이몽룡")
                .phoneNumber("01077776666")
                .branch(branch)
                .build());

        // postponeTotal=3, postponeUsed=1 → 2회 더 가능
        ComplexMemberMembership mm = memberMembershipRepository.save(ComplexMemberMembership.builder()
                .member(member)
                .membership(membership)
                .startDate(LocalDate.now())
                .expiryDate(LocalDate.now().plusDays(90))
                .totalCount(30)
                .postponeTotal(3)
                .postponeUsed(1)
                .build());

        PostponementCreateRequest req = new PostponementCreateRequest();
        req.setMemberSeq(member.getSeq());
        req.setMemberMembershipSeq(mm.getSeq());
        req.setMemberName(member.getName());
        req.setPhoneNumber(member.getPhoneNumber());
        req.setStartDate(LocalDate.now().plusDays(1));
        req.setEndDate(LocalDate.now().plusDays(7));
        req.setReason("개인사정");

        // when / then — 한도 미초과 → 정상 등록
        assertThatCode(() -> postponementService.create(req, branch.getSeq()))
                .doesNotThrowAnyException();
        assertThat(memberMembershipRepository.findById(mm.getSeq()).orElseThrow().getPostponeUsed())
                .as("create 시점에는 postponeUsed가 증가하지 않는다 (승인 단계에서 증가)")
                .isEqualTo(1);
    }
}
