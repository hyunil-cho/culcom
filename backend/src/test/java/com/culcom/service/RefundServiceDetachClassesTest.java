package com.culcom.service;

import com.culcom.entity.branch.Branch;
import com.culcom.entity.complex.clazz.ClassTimeSlot;
import com.culcom.entity.complex.clazz.ComplexClass;
import com.culcom.entity.complex.member.ComplexMember;
import com.culcom.entity.complex.member.ComplexMemberClassMapping;
import com.culcom.entity.complex.member.ComplexMemberMembership;
import com.culcom.entity.complex.refund.ComplexRefundRequest;
import com.culcom.entity.enums.MembershipStatus;
import com.culcom.entity.enums.RequestStatus;
import com.culcom.entity.product.Membership;
import com.culcom.repository.*;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalTime;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * 환불 승인 시나리오 시뮬레이션:
 * 1) 회원에게 활성 멤버십 + 여러 수업 배정이 있을 때
 * 2) 환불 요청을 승인하면
 *    → 멤버십 status가 환불로 전환되고
 *    → 회원의 모든 수업 매핑(complex_member_class_mapping)이 일괄 삭제된다
 * 3) 이미 승인된 환불 요청은 다른 상태로 변경할 수 없다
 */
@SpringBootTest
@ActiveProfiles("test")
@Transactional
class RefundServiceDetachClassesTest {

    @Autowired RefundService refundService;
    @Autowired BranchRepository branchRepository;
    @Autowired ClassTimeSlotRepository classTimeSlotRepository;
    @Autowired ComplexClassRepository classRepository;
    @Autowired MembershipRepository membershipRepository;
    @Autowired ComplexMemberRepository memberRepository;
    @Autowired ComplexMemberMembershipRepository memberMembershipRepository;
    @Autowired ComplexMemberClassMappingRepository classMappingRepository;
    @Autowired ComplexRefundRequestRepository refundRequestRepository;

    @Test
    void 환불_승인시_회원의_모든_수업배정이_해제되고_멤버십이_환불상태로_전환된다() {
        // given — 회원 + 활성 멤버십 + 2개 수업 배정
        Branch branch = branchRepository.save(Branch.builder()
                .branchName("테스트지점")
                .alias("test-refund-detach-" + System.nanoTime())
                .build());

        ClassTimeSlot slot = classTimeSlotRepository.save(ClassTimeSlot.builder()
                .branch(branch).name("월수금").daysOfWeek("MON,WED,FRI")
                .startTime(LocalTime.of(9, 0)).endTime(LocalTime.of(10, 0))
                .build());

        ComplexClass classA = classRepository.save(ComplexClass.builder()
                .branch(branch).timeSlot(slot).name("요가A").capacity(10).sortOrder(0).build());
        ComplexClass classB = classRepository.save(ComplexClass.builder()
                .branch(branch).timeSlot(slot).name("필라테스B").capacity(10).sortOrder(1).build());

        Membership product = membershipRepository.save(Membership.builder()
                .name("10회권").duration(60).count(10).price(150000).build());

        ComplexMember member = memberRepository.save(ComplexMember.builder()
                .name("성춘향").phoneNumber("01011112222").branch(branch).build());

        ComplexMemberMembership mm = memberMembershipRepository.save(ComplexMemberMembership.builder()
                .member(member).membership(product)
                .startDate(LocalDate.now())
                .expiryDate(LocalDate.now().plusDays(60))
                .totalCount(10).usedCount(2)
                .status(MembershipStatus.활성)
                .build());

        classMappingRepository.save(ComplexMemberClassMapping.builder()
                .member(member).complexClass(classA).sortOrder(0).build());
        classMappingRepository.save(ComplexMemberClassMapping.builder()
                .member(member).complexClass(classB).sortOrder(0).build());

        ComplexRefundRequest refund = refundRequestRepository.save(ComplexRefundRequest.builder()
                .branch(branch).member(member).memberMembership(mm)
                .memberName(member.getName()).phoneNumber(member.getPhoneNumber())
                .membershipName(product.getName()).price("150000")
                .reason("개인사정")
                .status(RequestStatus.대기)
                .build());

        // 사전 검증 — 매핑 2건, 멤버십은 활성
        assertThat(classMappingRepository.findByMemberSeq(member.getSeq())).hasSize(2);
        assertThat(mm.getStatus()).isEqualTo(MembershipStatus.활성);

        // when — 환불 요청 승인
        refundService.updateStatus(refund.getSeq(), RequestStatus.승인, null);

        // then — 멤버십 상태 환불 + 수업 매핑 모두 삭제
        ComplexMemberMembership reloadedMm = memberMembershipRepository.findById(mm.getSeq()).orElseThrow();
        assertThat(reloadedMm.getStatus())
                .as("환불 승인 후 멤버십 상태는 환불이어야 한다")
                .isEqualTo(MembershipStatus.환불);

        assertThat(classMappingRepository.findByMemberSeq(member.getSeq()))
                .as("환불 승인 후 회원의 모든 수업 배정이 해제되어야 한다")
                .isEmpty();
    }

    @Test
    void 이미_승인된_환불요청은_다른_상태로_변경할_수_없다() {
        // given — 환불 승인까지 완료
        Branch branch = branchRepository.save(Branch.builder()
                .branchName("테스트지점")
                .alias("test-refund-immutable-" + System.nanoTime())
                .build());
        Membership product = membershipRepository.save(Membership.builder()
                .name("10회권").duration(60).count(10).price(150000).build());
        ComplexMember member = memberRepository.save(ComplexMember.builder()
                .name("이도령").phoneNumber("01033334444").branch(branch).build());
        ComplexMemberMembership mm = memberMembershipRepository.save(ComplexMemberMembership.builder()
                .member(member).membership(product)
                .startDate(LocalDate.now()).expiryDate(LocalDate.now().plusDays(60))
                .totalCount(10).usedCount(0)
                .status(MembershipStatus.활성).build());
        ComplexRefundRequest refund = refundRequestRepository.save(ComplexRefundRequest.builder()
                .branch(branch).member(member).memberMembership(mm)
                .memberName(member.getName()).phoneNumber(member.getPhoneNumber())
                .membershipName(product.getName()).price("150000")
                .reason("개인사정")
                .status(RequestStatus.대기).build());

        refundService.updateStatus(refund.getSeq(), RequestStatus.승인, null);

        // when / then — 승인 → 대기, 승인 → 반려 모두 차단
        assertThatThrownBy(() -> refundService.updateStatus(refund.getSeq(), RequestStatus.대기, null))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("이미 처리된");

        assertThatThrownBy(() -> refundService.updateStatus(refund.getSeq(), RequestStatus.반려, "변심"))
                .isInstanceOf(IllegalStateException.class);
    }
}
