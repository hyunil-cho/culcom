package com.culcom.service;

import com.culcom.dto.complex.member.ComplexStaffRequest;
import com.culcom.entity.branch.Branch;
import com.culcom.entity.complex.clazz.ClassTimeSlot;
import com.culcom.entity.complex.clazz.ComplexClass;
import com.culcom.entity.complex.member.ComplexMember;
import com.culcom.entity.complex.member.ComplexMemberClassMapping;
import com.culcom.entity.complex.member.ComplexMemberMembership;
import com.culcom.entity.enums.MembershipStatus;
import com.culcom.entity.enums.StaffStatus;
import com.culcom.repository.BranchRepository;
import com.culcom.repository.ClassTimeSlotRepository;
import com.culcom.repository.ComplexClassRepository;
import com.culcom.repository.ComplexMemberClassMappingRepository;
import com.culcom.repository.ComplexMemberMembershipRepository;
import com.culcom.repository.ComplexMemberRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * 데이터 무결성 시나리오:
 * 재직 중인 스태프가 (1) 팀 A의 리더로 배정되어 있고
 * (2) 복지 차원에서 팀 B의 멤버로 등록된 상태에서 휴직으로 전환될 때,
 *  - 팀 A의 리더 자리는 비워지고(staff == null)
 *  - 팀 B의 멤버 매핑은 제거되며
 *  - 스태프의 internal 멤버십은 '정지' 상태가 되어야 한다.
 */
@SpringBootTest
@ActiveProfiles("local")
@Transactional
class ComplexStaffServiceLeaveTest {

    @Autowired ComplexStaffService complexStaffService;
    @Autowired BranchRepository branchRepository;
    @Autowired ClassTimeSlotRepository classTimeSlotRepository;
    @Autowired ComplexClassRepository classRepository;
    @Autowired ComplexMemberRepository memberRepository;
    @Autowired ComplexMemberMembershipRepository memberMembershipRepository;
    @Autowired ComplexMemberClassMappingRepository classMappingRepository;

    @Test
    void 휴직_전환_시_리더자리_공백_팀멤버십_제거_internal_멤버십_정지() {
        // given — 지점 + 시간슬롯
        Branch branch = branchRepository.save(Branch.builder()
                .branchName("테스트지점")
                .alias("test-leave-" + System.nanoTime())
                .build());

        ClassTimeSlot slot = classTimeSlotRepository.save(ClassTimeSlot.builder()
                .branch(branch)
                .name("월수금 오전")
                .daysOfWeek("MON,WED,FRI")
                .startTime(LocalTime.of(9, 0))
                .endTime(LocalTime.of(10, 0))
                .build());

        // given — 스태프 생성 (재직, internal 멤버십 자동 부여)
        ComplexStaffRequest createReq = new ComplexStaffRequest();
        createReq.setName("김강사");
        createReq.setPhoneNumber("01012345678");
        createReq.setStatus(StaffStatus.재직);
        Long staffSeq = complexStaffService.create(createReq, branch.getSeq()).getSeq();
        ComplexMember staff = memberRepository.findById(staffSeq).orElseThrow();

        // given — 팀 A: 스태프가 리더(강사)로 배정
        ComplexClass teamA = classRepository.save(ComplexClass.builder()
                .branch(branch)
                .timeSlot(slot)
                .name("팀 A")
                .staff(staff)
                .capacity(10)
                .sortOrder(0)
                .build());

        // given — 팀 B: 스태프가 (복지) 멤버로만 등록 (다른 리더 또는 무리더)
        ComplexClass teamB = classRepository.save(ComplexClass.builder()
                .branch(branch)
                .timeSlot(slot)
                .name("팀 B")
                .capacity(10)
                .sortOrder(1)
                .build());

        classMappingRepository.save(ComplexMemberClassMapping.builder()
                .member(staff)
                .complexClass(teamB)
                .sortOrder(0)
                .build());

        // sanity check
        assertThat(classRepository.findById(teamA.getSeq()).orElseThrow().getStaff()).isNotNull();
        assertThat(classMappingRepository.findByMemberSeq(staffSeq)).hasSize(1);
        List<ComplexMemberMembership> internalsBefore =
                memberMembershipRepository.findByMemberSeqAndInternalTrue(staffSeq);
        assertThat(internalsBefore).isNotEmpty();
        assertThat(internalsBefore).allMatch(m -> m.getStatus() == MembershipStatus.활성);

        // when — 휴직으로 전환
        ComplexStaffRequest leaveReq = new ComplexStaffRequest();
        leaveReq.setName(staff.getName());
        leaveReq.setPhoneNumber(staff.getPhoneNumber());
        leaveReq.setStatus(StaffStatus.휴직);
        complexStaffService.update(staffSeq, leaveReq);

        // then — 팀 A의 리더 자리는 비워졌다
        ComplexClass reloadedA = classRepository.findById(teamA.getSeq()).orElseThrow();
        assertThat(reloadedA.getStaff())
                .as("휴직 시 강사로 배정된 팀의 리더 자리는 공백이어야 한다")
                .isNull();

        // then — 강사가 등록중이던 팀(B)의 멤버 매핑은 모두 제거되었다
        assertThat(classMappingRepository.findByMemberSeq(staffSeq))
                .as("휴직 시 internal 멤버십으로 듣던 팀 매핑은 제거되어야 한다")
                .isEmpty();

        // then — internal 멤버십은 '정지' 상태
        List<ComplexMemberMembership> internalsAfter =
                memberMembershipRepository.findByMemberSeqAndInternalTrue(staffSeq);
        assertThat(internalsAfter).isNotEmpty();
        assertThat(internalsAfter)
                .as("휴직 시 internal 멤버십은 모두 정지 상태여야 한다")
                .allMatch(m -> m.getStatus() == MembershipStatus.정지);
    }
}