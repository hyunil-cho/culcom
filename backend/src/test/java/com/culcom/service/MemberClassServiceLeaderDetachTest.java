package com.culcom.service;

import com.culcom.entity.branch.Branch;
import com.culcom.entity.complex.clazz.ClassTimeSlot;
import com.culcom.entity.complex.clazz.ComplexClass;
import com.culcom.entity.complex.member.ComplexMember;
import com.culcom.entity.complex.member.ComplexMemberClassMapping;
import com.culcom.entity.complex.member.ComplexMemberMembership;
import com.culcom.entity.enums.MembershipStatus;
import com.culcom.entity.enums.RequestStatus;
import com.culcom.entity.complex.refund.ComplexRefundRequest;
import com.culcom.entity.product.Membership;
import com.culcom.repository.*;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * 리더 자격 상실 시나리오 — 두 개 이상의 팀에서 리더로 활동 중인 회원이
 * 멤버십 정지/환불/만료 등으로 자격을 잃었을 때, 속한 <b>모든</b> 팀에서
 * 리더 배정이 해제되는지 검증한다.
 */
@SpringBootTest
@ActiveProfiles("test")
@Transactional
class MemberClassServiceLeaderDetachTest {

    @Autowired MemberClassService memberClassService;
    @Autowired RefundService refundService;
    @Autowired BranchRepository branchRepository;
    @Autowired ClassTimeSlotRepository classTimeSlotRepository;
    @Autowired ComplexClassRepository classRepository;
    @Autowired MembershipRepository membershipRepository;
    @Autowired ComplexMemberRepository memberRepository;
    @Autowired ComplexMemberMembershipRepository memberMembershipRepository;
    @Autowired ComplexMemberClassMappingRepository classMappingRepository;
    @Autowired ComplexRefundRequestRepository refundRequestRepository;

    private static class Fixture {
        Branch branch;
        ComplexMember leader;
        ComplexMemberMembership leaderMm;
        ComplexClass classA;
        ComplexClass classB;
        ComplexClass classC;
    }

    private Fixture setupTwoTeamLeader(String suffix) {
        Fixture f = new Fixture();
        f.branch = branchRepository.save(Branch.builder()
                .branchName("테스트지점").alias("test-leader-detach-" + suffix).build());

        ClassTimeSlot slot = classTimeSlotRepository.save(ClassTimeSlot.builder()
                .branch(f.branch).name("월수금-" + suffix).daysOfWeek("MON,WED,FRI")
                .startTime(LocalTime.of(9, 0)).endTime(LocalTime.of(10, 0))
                .build());

        f.leader = memberRepository.save(ComplexMember.builder()
                .name("멀티리더-" + suffix).phoneNumber("01077770000")
                .branch(f.branch).build());

        Membership product = membershipRepository.save(Membership.builder()
                .name("스태프내부권-" + suffix).duration(365).count(9999).price(0).build());

        f.leaderMm = memberMembershipRepository.save(ComplexMemberMembership.builder()
                .member(f.leader).membership(product)
                .startDate(LocalDate.now()).expiryDate(LocalDate.now().plusDays(365))
                .totalCount(9999).usedCount(0).price("0")
                .status(MembershipStatus.활성).internal(true).build());

        f.classA = classRepository.save(ComplexClass.builder()
                .branch(f.branch).timeSlot(slot).name("A팀").capacity(10).sortOrder(0).staff(f.leader).build());
        f.classB = classRepository.save(ComplexClass.builder()
                .branch(f.branch).timeSlot(slot).name("B팀").capacity(10).sortOrder(1).staff(f.leader).build());
        f.classC = classRepository.save(ComplexClass.builder()
                .branch(f.branch).timeSlot(slot).name("C팀").capacity(10).sortOrder(2).staff(f.leader).build());

        return f;
    }

    @Test
    void detachMemberFromAllClasses_호출_시_3개_팀_리더_모두_해제() {
        Fixture f = setupTwoTeamLeader("basic");

        // 사전 검증 — 3개 팀 모두 리더 배정됨
        List<ComplexClass> before = classRepository.findByStaffSeqAndDeletedFalse(f.leader.getSeq());
        assertThat(before).hasSize(3);

        // when
        memberClassService.detachMemberFromAllClasses(f.leader, "정지");

        // then — 속한 모든 팀에서 리더 해제
        List<ComplexClass> after = classRepository.findByStaffSeqAndDeletedFalse(f.leader.getSeq());
        assertThat(after).as("리더 자격 상실 시 3개 팀 모두에서 해제되어야 한다").isEmpty();

        assertThat(classRepository.findById(f.classA.getSeq()).orElseThrow().getStaff()).isNull();
        assertThat(classRepository.findById(f.classB.getSeq()).orElseThrow().getStaff()).isNull();
        assertThat(classRepository.findById(f.classC.getSeq()).orElseThrow().getStaff()).isNull();
    }

    @Test
    void 일반_수강_매핑이_있는_리더는_매핑과_리더_역할_모두_제거된다() {
        Fixture f = setupTwoTeamLeader("mixed");

        // 리더가 다른 수업에 일반 수강으로도 참여 중
        classMappingRepository.save(ComplexMemberClassMapping.builder()
                .member(f.leader).complexClass(f.classA).sortOrder(0).build());

        memberClassService.detachMemberFromAllClasses(f.leader, "만료");

        assertThat(classMappingRepository.findByMemberSeq(f.leader.getSeq()))
                .as("일반 수강 매핑도 전부 삭제").isEmpty();
        assertThat(classRepository.findByStaffSeqAndDeletedFalse(f.leader.getSeq()))
                .as("리더 역할도 전부 해제").isEmpty();
    }

    @Test
    void 환불_승인으로_자격_상실된_리더는_모든_팀에서_해제된다() {
        // given — 환불 흐름을 타는 2팀 리더
        Fixture f = setupTwoTeamLeader("refund");
        // 환불은 일반(external) 멤버십에 대해 일어나므로, 리더용 internal 외에 외부 멤버십도 추가한다
        Membership external = membershipRepository.save(Membership.builder()
                .name("일반권-refund").duration(60).count(30).price(300000).build());
        ComplexMemberMembership externalMm = memberMembershipRepository.save(ComplexMemberMembership.builder()
                .member(f.leader).membership(external)
                .startDate(LocalDate.now()).expiryDate(LocalDate.now().plusDays(60))
                .totalCount(30).usedCount(0).price("300000")
                .status(MembershipStatus.활성).build());

        ComplexRefundRequest refund = refundRequestRepository.save(ComplexRefundRequest.builder()
                .branch(f.branch).member(f.leader).memberMembership(externalMm)
                .memberName(f.leader.getName()).phoneNumber(f.leader.getPhoneNumber())
                .membershipName(external.getName()).price("300000")
                .reason("개인사정").status(RequestStatus.대기).build());

        refundService.updateStatus(refund.getSeq(), RequestStatus.승인, null);

        // then — 리더로 배정돼 있던 3개 팀 모두에서 해제되어야 한다
        assertThat(classRepository.findByStaffSeqAndDeletedFalse(f.leader.getSeq()))
                .as("환불 승인 시 리더가 속한 모든 팀에서 해제되어야 한다")
                .isEmpty();
    }

    @Test
    void 한_팀만_리더인_회원도_자격_상실_시_해제된다() {
        // 회귀 — 기존 단일 팀 시나리오도 동일하게 동작해야 한다
        Fixture f = setupTwoTeamLeader("single");
        // B, C는 리더 해제해서 A팀만 리더로 남김
        f.classB.setStaff(null); classRepository.save(f.classB);
        f.classC.setStaff(null); classRepository.save(f.classC);

        memberClassService.detachMemberFromAllClasses(f.leader, "정지");

        assertThat(classRepository.findById(f.classA.getSeq()).orElseThrow().getStaff()).isNull();
    }

    @Test
    void 리더_아닌_회원은_영향받지_않는다() {
        // 리더 역할이 전혀 없는 회원이 detach를 부르면 leaderCount=0으로 매핑만 정리된다
        Fixture f = setupTwoTeamLeader("non-leader");
        ComplexMember regular = memberRepository.save(ComplexMember.builder()
                .name("일반회원").phoneNumber("01088880000").branch(f.branch).build());
        classMappingRepository.save(ComplexMemberClassMapping.builder()
                .member(regular).complexClass(f.classA).sortOrder(0).build());

        // when
        memberClassService.detachMemberFromAllClasses(regular, "만료");

        // then — 일반 수강만 정리, 기존 리더(f.leader)는 건드리지 않음
        assertThat(classMappingRepository.findByMemberSeq(regular.getSeq())).isEmpty();
        assertThat(classRepository.findByStaffSeqAndDeletedFalse(f.leader.getSeq()))
                .as("다른 회원의 자격 상실이 리더 배정에 영향을 주면 안 된다")
                .hasSize(3);
    }
}
