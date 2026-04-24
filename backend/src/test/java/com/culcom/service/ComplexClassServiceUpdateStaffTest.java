package com.culcom.service;

import com.culcom.dto.complex.classes.ComplexClassRequest;
import com.culcom.entity.branch.Branch;
import com.culcom.entity.complex.clazz.ClassTimeSlot;
import com.culcom.entity.complex.clazz.ComplexClass;
import com.culcom.entity.complex.member.ComplexMember;
import com.culcom.repository.BranchRepository;
import com.culcom.repository.ClassTimeSlotRepository;
import com.culcom.repository.ComplexClassRepository;
import com.culcom.repository.ComplexMemberRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalTime;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * update 호출 시 ComplexClass.staff(리더) 가 보존되는지 검증한다.
 *
 * 리더 변경 책임은 setLeader 엔드포인트에 있고, 일반 update 의 책임 범위가 아니다.
 * 따라서 update 가 staff 필드를 임의로 null 로 덮어쓰면 안 된다.
 * (DTO에도 staffSeq 필드가 없어 update 경로로는 변경 의사가 표현될 수 없음.)
 */
@SpringBootTest
@ActiveProfiles("test")
@Transactional
class ComplexClassServiceUpdateStaffTest {

    @Autowired ComplexClassService complexClassService;
    @Autowired BranchRepository branchRepository;
    @Autowired ClassTimeSlotRepository classTimeSlotRepository;
    @Autowired ComplexClassRepository classRepository;
    @Autowired ComplexMemberRepository memberRepository;

    private Fixture setup(String suffix) {
        String unique = suffix + "-" + System.nanoTime();
        Branch branch = branchRepository.save(Branch.builder()
                .branchName("테스트지점-" + unique)
                .alias("test-update-staff-" + unique)
                .build());
        ClassTimeSlot slot = classTimeSlotRepository.save(ClassTimeSlot.builder()
                .branch(branch).name("월수금-" + unique).daysOfWeek("MON,WED,FRI")
                .startTime(LocalTime.of(9, 0)).endTime(LocalTime.of(10, 0))
                .build());
        return new Fixture(branch, slot);
    }

    private ComplexMember newMember(Branch branch, String name, String phone) {
        return memberRepository.save(ComplexMember.builder()
                .name(name).phoneNumber(phone).branch(branch).build());
    }

    private ComplexClassRequest validReq(Long timeSlotSeq, String name) {
        ComplexClassRequest r = new ComplexClassRequest();
        r.setName(name);
        r.setCapacity(10);
        r.setTimeSlotSeq(timeSlotSeq);
        return r;
    }

    @Test
    void update_시_기존_리더는_null로_덮어쓰이지_않는다() {
        Fixture f = setup("preserve");
        ComplexMember leader = newMember(f.branch, "기존리더", "01099990001");
        ComplexClass cls = classRepository.save(ComplexClass.builder()
                .branch(f.branch).timeSlot(f.slot)
                .name("리더보존-" + System.nanoTime())
                .capacity(10).sortOrder(1).staff(leader).build());

        complexClassService.update(cls.getSeq(), validReq(f.slot.getSeq(), "이름변경"));

        ComplexClass reloaded = classRepository.findById(cls.getSeq()).orElseThrow();
        assertThat(reloaded.getStaff())
                .as("일반 update 는 staff(리더) 를 임의로 변경하면 안 된다")
                .isNotNull();
        assertThat(reloaded.getStaff().getSeq())
                .as("기존에 배정된 리더가 그대로 유지되어야 한다")
                .isEqualTo(leader.getSeq());
    }

    @Test
    void update_여러번_호출해도_기존_리더는_그대로_유지된다() {
        Fixture f = setup("repeat");
        ComplexMember leader = newMember(f.branch, "유지리더", "01099990002");
        ComplexClass cls = classRepository.save(ComplexClass.builder()
                .branch(f.branch).timeSlot(f.slot)
                .name("반복update-" + System.nanoTime())
                .capacity(10).sortOrder(1).staff(leader).build());

        for (int i = 0; i < 3; i++) {
            complexClassService.update(cls.getSeq(), validReq(f.slot.getSeq(), "변경-" + i));
        }

        ComplexClass reloaded = classRepository.findById(cls.getSeq()).orElseThrow();
        assertThat(reloaded.getStaff()).isNotNull();
        assertThat(reloaded.getStaff().getSeq()).isEqualTo(leader.getSeq());
    }

    @Test
    void update_시_원래_리더가_없던_수업은_여전히_리더가_없다() {
        // 원래 staff 가 null 인 케이스: update 후에도 null 이어야 한다.
        // (보존 정책이 임의로 새 staff 를 만들지 않음을 확인)
        Fixture f = setup("nostaff");
        ComplexClass cls = classRepository.save(ComplexClass.builder()
                .branch(f.branch).timeSlot(f.slot)
                .name("리더없음-" + System.nanoTime())
                .capacity(10).sortOrder(1).staff(null).build());

        complexClassService.update(cls.getSeq(), validReq(f.slot.getSeq(), "이름변경"));

        ComplexClass reloaded = classRepository.findById(cls.getSeq()).orElseThrow();
        assertThat(reloaded.getStaff())
                .as("원래 리더가 없으면 update 후에도 null 이어야 한다")
                .isNull();
    }

    private record Fixture(Branch branch, ClassTimeSlot slot) {}
}
