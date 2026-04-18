package com.culcom.service;

import com.culcom.dto.complex.member.ComplexStaffRequest;
import com.culcom.entity.branch.Branch;
import com.culcom.entity.complex.clazz.ClassTimeSlot;
import com.culcom.entity.complex.clazz.ComplexClass;
import com.culcom.entity.complex.member.ComplexMember;
import com.culcom.entity.complex.member.ComplexMemberMembership;
import com.culcom.entity.enums.MembershipStatus;
import com.culcom.entity.enums.StaffStatus;
import com.culcom.repository.BranchRepository;
import com.culcom.repository.ClassTimeSlotRepository;
import com.culcom.repository.ComplexClassRepository;
import com.culcom.repository.ComplexMemberMembershipRepository;
import com.culcom.repository.ComplexMemberRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * 스태프 "활동종료" 전환 시나리오:
 * 박리더가 A/B 두 팀의 리더로 배정된 상태에서 상태가 활동종료 로 변경되면,
 *  - 두 팀 모두의 staff 필드는 null 로 해제되어야 한다.
 *  - 해당 스태프의 internal(복지) 멤버십은 정지 상태가 되어야 한다.
 * 활동중단(휴직) 은 ComplexStaffServiceLeaveTest 가 담당하므로 여기서는 활동종료만 다룬다.
 */
@SpringBootTest
@ActiveProfiles("test")
@Transactional
class ComplexStaffServiceRetireTest {

    @Autowired ComplexStaffService complexStaffService;
    @Autowired BranchRepository branchRepository;
    @Autowired ClassTimeSlotRepository classTimeSlotRepository;
    @Autowired ComplexClassRepository classRepository;
    @Autowired ComplexMemberRepository memberRepository;
    @Autowired ComplexMemberMembershipRepository memberMembershipRepository;

    private record Fixture(Branch branch, ClassTimeSlot slot, ComplexMember staff) {}

    private Fixture bootstrapStaff(String name, String aliasSuffix) {
        Branch branch = branchRepository.save(Branch.builder()
                .branchName("테스트지점")
                .alias("test-retire-" + aliasSuffix + "-" + System.nanoTime())
                .build());
        ClassTimeSlot slot = classTimeSlotRepository.save(ClassTimeSlot.builder()
                .branch(branch).name("월수금 오전")
                .daysOfWeek("MON,WED,FRI")
                .startTime(LocalTime.of(9, 0)).endTime(LocalTime.of(10, 0))
                .build());

        ComplexStaffRequest createReq = new ComplexStaffRequest();
        createReq.setName(name);
        createReq.setPhoneNumber("010" + (System.nanoTime() % 100000000L));
        createReq.setStatus(StaffStatus.활동중);
        Long staffSeq = complexStaffService.create(createReq, branch.getSeq()).getSeq();
        ComplexMember staff = memberRepository.findById(staffSeq).orElseThrow();
        return new Fixture(branch, slot, staff);
    }

    private ComplexClass newClassWithLeader(Fixture f, String teamName, int sortOrder) {
        return classRepository.save(ComplexClass.builder()
                .branch(f.branch())
                .timeSlot(f.slot())
                .name(teamName)
                .staff(f.staff())
                .capacity(10)
                .sortOrder(sortOrder)
                .build());
    }

    @Test
    @DisplayName("활동종료로 상태가 바뀌면 리더로 등록된 모든 팀의 staff 자리가 null 이 된다")
    void 활동종료_시_모든_팀의_리더_해제() {
        Fixture f = bootstrapStaff("박리더", "multi");
        ComplexClass teamA = newClassWithLeader(f, "팀 A", 0);
        ComplexClass teamB = newClassWithLeader(f, "팀 B", 1);
        ComplexClass teamC = newClassWithLeader(f, "팀 C", 2);

        // sanity: 세 팀 모두 박리더가 리더로 배정되어 있음
        assertThat(classRepository.findById(teamA.getSeq()).orElseThrow().getStaff()).isNotNull();
        assertThat(classRepository.findById(teamB.getSeq()).orElseThrow().getStaff()).isNotNull();
        assertThat(classRepository.findById(teamC.getSeq()).orElseThrow().getStaff()).isNotNull();

        // when — 박리더가 활동종료 상태로 전환
        ComplexStaffRequest retireReq = new ComplexStaffRequest();
        retireReq.setName(f.staff().getName());
        retireReq.setPhoneNumber(f.staff().getPhoneNumber());
        retireReq.setStatus(StaffStatus.활동종료);
        complexStaffService.update(f.staff().getSeq(), retireReq);

        // then — 박리더가 리더로 있던 모든 팀의 staff 가 null
        assertThat(classRepository.findById(teamA.getSeq()).orElseThrow().getStaff())
                .as("활동종료 시 팀 A 의 리더는 해제되어야 한다").isNull();
        assertThat(classRepository.findById(teamB.getSeq()).orElseThrow().getStaff())
                .as("활동종료 시 팀 B 의 리더는 해제되어야 한다").isNull();
        assertThat(classRepository.findById(teamC.getSeq()).orElseThrow().getStaff())
                .as("활동종료 시 팀 C 의 리더는 해제되어야 한다").isNull();

        // DB 쿼리로도 재확인: 해당 스태프가 리더인 수업이 더 이상 존재하지 않는다
        List<ComplexClass> stillAssigned = classRepository.findByStaffSeq(f.staff().getSeq());
        assertThat(stillAssigned).as("활동종료된 스태프가 리더로 남은 수업이 있어선 안 된다").isEmpty();
    }

    @Test
    @DisplayName("활동종료 시 다른 스태프가 리더인 팀에는 영향이 없다")
    void 활동종료_다른_리더의_팀은_유지() {
        Fixture f1 = bootstrapStaff("박리더", "keeper-a");
        Fixture f2 = bootstrapStaff("김리더", "keeper-b");

        // 박리더가 리더인 A 팀, 김리더가 리더인 B 팀을 같은 지점에 생성 (독립 지점이어도 무방)
        ComplexClass teamA = newClassWithLeader(f1, "팀 A", 0);
        ComplexClass teamB = newClassWithLeader(f2, "팀 B", 1);

        // when — 박리더만 활동종료
        ComplexStaffRequest retireReq = new ComplexStaffRequest();
        retireReq.setName(f1.staff().getName());
        retireReq.setPhoneNumber(f1.staff().getPhoneNumber());
        retireReq.setStatus(StaffStatus.활동종료);
        complexStaffService.update(f1.staff().getSeq(), retireReq);

        // then — A 팀은 리더 해제, B 팀은 김리더 유지
        assertThat(classRepository.findById(teamA.getSeq()).orElseThrow().getStaff()).isNull();
        assertThat(classRepository.findById(teamB.getSeq()).orElseThrow().getStaff())
                .as("다른 스태프의 팀은 영향 없음").isNotNull();
        assertThat(classRepository.findById(teamB.getSeq()).orElseThrow().getStaff().getSeq())
                .isEqualTo(f2.staff().getSeq());
    }

    @Test
    @DisplayName("활동종료 시 internal(복지) 멤버십은 정지 상태가 된다")
    void 활동종료_internal_멤버십_정지() {
        Fixture f = bootstrapStaff("박리더", "internal");
        newClassWithLeader(f, "팀 A", 0);

        // sanity: 생성 직후 internal 멤버십은 활성
        List<ComplexMemberMembership> before =
                memberMembershipRepository.findByMemberSeqAndInternalTrue(f.staff().getSeq());
        assertThat(before).isNotEmpty();
        assertThat(before).allMatch(m -> m.getStatus() == MembershipStatus.활성);

        // when
        ComplexStaffRequest retireReq = new ComplexStaffRequest();
        retireReq.setName(f.staff().getName());
        retireReq.setPhoneNumber(f.staff().getPhoneNumber());
        retireReq.setStatus(StaffStatus.활동종료);
        complexStaffService.update(f.staff().getSeq(), retireReq);

        // then
        List<ComplexMemberMembership> after =
                memberMembershipRepository.findByMemberSeqAndInternalTrue(f.staff().getSeq());
        assertThat(after).isNotEmpty();
        assertThat(after)
                .as("활동종료 시 internal 멤버십은 모두 정지 상태여야 한다")
                .allMatch(m -> m.getStatus() == MembershipStatus.정지);
    }

    @Test
    @DisplayName("활동중 → 활동중 (상태 유지) 는 리더 해제를 유발하지 않는다")
    void 상태_유지는_리더_유지() {
        Fixture f = bootstrapStaff("박리더", "noop");
        ComplexClass teamA = newClassWithLeader(f, "팀 A", 0);

        ComplexStaffRequest req = new ComplexStaffRequest();
        req.setName(f.staff().getName());
        req.setPhoneNumber(f.staff().getPhoneNumber());
        req.setStatus(StaffStatus.활동중);
        complexStaffService.update(f.staff().getSeq(), req);

        assertThat(classRepository.findById(teamA.getSeq()).orElseThrow().getStaff())
                .as("상태가 바뀌지 않았으므로 리더는 유지되어야 한다").isNotNull();
    }
}
