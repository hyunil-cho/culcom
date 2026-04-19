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
    void 환불_반려시는_수업배정이_유지되고_멤버십도_활성_상태_그대로다() {
        // given — 회원 + 활성 멤버십 + 수업 배정 1건
        Branch branch = branchRepository.save(Branch.builder()
                .branchName("테스트지점")
                .alias("test-refund-reject-keep-" + System.nanoTime())
                .build());
        ClassTimeSlot slot = classTimeSlotRepository.save(ClassTimeSlot.builder()
                .branch(branch).name("월수금").daysOfWeek("MON,WED,FRI")
                .startTime(LocalTime.of(9, 0)).endTime(LocalTime.of(10, 0))
                .build());
        ComplexClass classA = classRepository.save(ComplexClass.builder()
                .branch(branch).timeSlot(slot).name("요가A").capacity(10).sortOrder(0).build());
        Membership product = membershipRepository.save(Membership.builder()
                .name("10회권").duration(60).count(10).price(150000).build());
        ComplexMember member = memberRepository.save(ComplexMember.builder()
                .name("성춘향").phoneNumber("01055556666").branch(branch).build());
        ComplexMemberMembership mm = memberMembershipRepository.save(ComplexMemberMembership.builder()
                .member(member).membership(product)
                .startDate(LocalDate.now()).expiryDate(LocalDate.now().plusDays(60))
                .totalCount(10).usedCount(2)
                .status(MembershipStatus.활성).build());
        classMappingRepository.save(ComplexMemberClassMapping.builder()
                .member(member).complexClass(classA).sortOrder(0).build());
        ComplexRefundRequest refund = refundRequestRepository.save(ComplexRefundRequest.builder()
                .branch(branch).member(member).memberMembership(mm)
                .memberName(member.getName()).phoneNumber(member.getPhoneNumber())
                .membershipName(product.getName()).price("150000")
                .reason("개인사정").status(RequestStatus.대기).build());

        // when — 반려
        refundService.updateStatus(refund.getSeq(), RequestStatus.반려, "서류 미비");

        // then — 매핑 유지, 멤버십도 활성 그대로
        ComplexMemberMembership reloaded = memberMembershipRepository.findById(mm.getSeq()).orElseThrow();
        assertThat(reloaded.getStatus())
                .as("반려 시 멤버십 상태는 변경되지 않아야 한다")
                .isEqualTo(MembershipStatus.활성);
        assertThat(classMappingRepository.findByMemberSeq(member.getSeq()))
                .as("반려 시 수업 배정이 유지되어야 한다")
                .hasSize(1);
    }

    @Test
    void 이미_비활성_멤버십을_환불승인하면_수업배정_해제는_시도하지_않는다() {
        // given — 만료된 멤버십(=비활성). 멤버는 다른 활성 멤버십으로 수업에 배정되어 있다고 가정.
        Branch branch = branchRepository.save(Branch.builder()
                .branchName("테스트지점")
                .alias("test-refund-inactive-" + System.nanoTime())
                .build());
        ClassTimeSlot slot = classTimeSlotRepository.save(ClassTimeSlot.builder()
                .branch(branch).name("월수금").daysOfWeek("MON,WED,FRI")
                .startTime(LocalTime.of(9, 0)).endTime(LocalTime.of(10, 0))
                .build());
        ComplexClass classA = classRepository.save(ComplexClass.builder()
                .branch(branch).timeSlot(slot).name("요가A").capacity(10).sortOrder(0).build());
        Membership product = membershipRepository.save(Membership.builder()
                .name("10회권").duration(60).count(10).price(150000).build());
        ComplexMember member = memberRepository.save(ComplexMember.builder()
                .name("심청").phoneNumber("01077778888").branch(branch).build());
        ComplexMemberMembership expiredMm = memberMembershipRepository.save(ComplexMemberMembership.builder()
                .member(member).membership(product)
                .startDate(LocalDate.now().minusDays(120))
                .expiryDate(LocalDate.now().minusDays(60))
                .totalCount(10).usedCount(10)
                .status(MembershipStatus.만료).build());
        // 별도 활성 멤버십으로 수업에 등록되어 있다고 가정 — 매핑만 생성
        classMappingRepository.save(ComplexMemberClassMapping.builder()
                .member(member).complexClass(classA).sortOrder(0).build());
        ComplexRefundRequest refund = refundRequestRepository.save(ComplexRefundRequest.builder()
                .branch(branch).member(member).memberMembership(expiredMm)
                .memberName(member.getName()).phoneNumber(member.getPhoneNumber())
                .membershipName(product.getName()).price("150000")
                .reason("환불 누락 정정").status(RequestStatus.대기).build());

        // when — 비활성 멤버십을 환불 승인
        refundService.updateStatus(refund.getSeq(), RequestStatus.승인, null);

        // then — 멤버십은 환불 상태로 전환되지만, 다른 멤버십 기반 수업 배정은 유지되어야 한다
        ComplexMemberMembership reloaded = memberMembershipRepository.findById(expiredMm.getSeq()).orElseThrow();
        assertThat(reloaded.getStatus())
                .as("환불 승인 후 멤버십 상태는 환불")
                .isEqualTo(MembershipStatus.환불);
        assertThat(classMappingRepository.findByMemberSeq(member.getSeq()))
                .as("이미 비활성이던 멤버십의 환불은 회원의 다른 수업 배정에 영향을 주지 않아야 한다")
                .hasSize(1);
    }

    @Test
    void 시스템_내부_멤버십은_환불승인을_거부한다() {
        // given — internal=true 멤버십 (스태프 자동 부여 등)
        Branch branch = branchRepository.save(Branch.builder()
                .branchName("테스트지점")
                .alias("test-refund-internal-" + System.nanoTime())
                .build());
        Membership product = membershipRepository.save(Membership.builder()
                .name("스태프 자동 부여").duration(365).count(999).price(0).build());
        ComplexMember member = memberRepository.save(ComplexMember.builder()
                .name("스태프A").phoneNumber("01099990000").branch(branch).build());
        ComplexMemberMembership internalMm = memberMembershipRepository.save(ComplexMemberMembership.builder()
                .member(member).membership(product)
                .startDate(LocalDate.now()).expiryDate(LocalDate.now().plusYears(1))
                .totalCount(999).usedCount(0)
                .status(MembershipStatus.활성)
                .internal(true)              // ← 내부 멤버십
                .build());
        ComplexRefundRequest refund = refundRequestRepository.save(ComplexRefundRequest.builder()
                .branch(branch).member(member).memberMembership(internalMm)
                .memberName(member.getName()).phoneNumber(member.getPhoneNumber())
                .membershipName(product.getName()).price("0")
                .reason("잘못된 환불 시도").status(RequestStatus.대기).build());

        // when / then — 환불 승인은 차단되어야 한다
        assertThatThrownBy(() -> refundService.updateStatus(refund.getSeq(), RequestStatus.승인, null))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("시스템 내부 멤버십");

        // 멤버십 상태도 변경되지 않아야 한다 (트랜잭션 롤백)
        ComplexMemberMembership reloaded = memberMembershipRepository.findById(internalMm.getSeq()).orElseThrow();
        assertThat(reloaded.getStatus()).isEqualTo(MembershipStatus.활성);
    }

    @Test
    void 시스템_내부_멤버십도_환불_반려는_가능하다() {
        // given — internal 멤버십 + 대기 상태 환불 요청 (잘못 들어온 케이스를 정리하는 용도)
        Branch branch = branchRepository.save(Branch.builder()
                .branchName("테스트지점")
                .alias("test-refund-internal-reject-" + System.nanoTime())
                .build());
        Membership product = membershipRepository.save(Membership.builder()
                .name("스태프 자동 부여 2").duration(365).count(999).price(0).build());
        ComplexMember member = memberRepository.save(ComplexMember.builder()
                .name("스태프B").phoneNumber("01088880000").branch(branch).build());
        ComplexMemberMembership internalMm = memberMembershipRepository.save(ComplexMemberMembership.builder()
                .member(member).membership(product)
                .startDate(LocalDate.now()).expiryDate(LocalDate.now().plusYears(1))
                .totalCount(999).usedCount(0)
                .status(MembershipStatus.활성).internal(true).build());
        ComplexRefundRequest refund = refundRequestRepository.save(ComplexRefundRequest.builder()
                .branch(branch).member(member).memberMembership(internalMm)
                .memberName(member.getName()).phoneNumber(member.getPhoneNumber())
                .membershipName(product.getName()).price("0")
                .reason("잘못된 환불 시도").status(RequestStatus.대기).build());

        // when — 반려 처리 (status 변경 없음 → 가드 미적용)
        refundService.updateStatus(refund.getSeq(), RequestStatus.반려, "내부 멤버십");

        // then — 멤버십은 그대로 활성, 환불 요청만 반려 처리됨
        assertThat(memberMembershipRepository.findById(internalMm.getSeq()).orElseThrow().getStatus())
                .isEqualTo(MembershipStatus.활성);
        assertThat(refundRequestRepository.findById(refund.getSeq()).orElseThrow().getStatus())
                .isEqualTo(RequestStatus.반려);
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
