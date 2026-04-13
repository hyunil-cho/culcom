package com.culcom.service;

import com.culcom.entity.branch.Branch;
import com.culcom.entity.complex.clazz.ClassTimeSlot;
import com.culcom.entity.complex.clazz.ComplexClass;
import com.culcom.entity.complex.member.ComplexMember;
import com.culcom.entity.enums.MembershipStatus;
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
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * 수업(팀) 정원 초과 방어 시나리오.
 * ComplexClass.capacity 필드는 저장되지만 ComplexClassService.addMember에서
 * 실제 인원 수와 비교하지 않는 것으로 보임 — 이 테스트가 그 추정을 확정한다.
 */
@SpringBootTest
@ActiveProfiles("test")
@Transactional
class ComplexClassServiceCapacityTest {

    @Autowired ComplexClassService complexClassService;
    @Autowired BranchRepository branchRepository;
    @Autowired ClassTimeSlotRepository classTimeSlotRepository;
    @Autowired ComplexClassRepository classRepository;
    @Autowired MembershipRepository membershipRepository;
    @Autowired ComplexMemberRepository memberRepository;
    @Autowired ComplexMemberMembershipRepository memberMembershipRepository;
    @Autowired ComplexMemberClassMappingRepository mappingRepository;

    private Fixture setupWithCapacity(String suffix, int capacity) {
        Branch branch = branchRepository.save(Branch.builder()
                .branchName("테스트지점")
                .alias("test-capacity-" + suffix + "-" + System.nanoTime())
                .build());
        ClassTimeSlot slot = classTimeSlotRepository.save(ClassTimeSlot.builder()
                .branch(branch).name("월수금").daysOfWeek("MON,WED,FRI")
                .startTime(LocalTime.of(9, 0)).endTime(LocalTime.of(10, 0))
                .build());
        ComplexClass clazz = classRepository.save(ComplexClass.builder()
                .branch(branch).timeSlot(slot).name("영어A")
                .capacity(capacity).sortOrder(0).build());
        Membership product = membershipRepository.save(Membership.builder()
                .name("3개월권").duration(90).count(30).price(300_000).build());
        return new Fixture(branch, clazz, product);
    }

    private ComplexMember newActiveMember(Fixture f, String name, String phone) {
        ComplexMember m = memberRepository.save(ComplexMember.builder()
                .name(name).phoneNumber(phone).branch(f.branch).build());
        memberMembershipRepository.save(com.culcom.entity.complex.member.ComplexMemberMembership.builder()
                .member(m).membership(f.product)
                .startDate(LocalDate.now()).expiryDate(LocalDate.now().plusDays(80))
                .totalCount(30).usedCount(0)
                .price("300000").status(MembershipStatus.활성).build());
        return m;
    }

    @Test
    void 정원_이내_가입은_정상_허용된다() {
        Fixture f = setupWithCapacity("within", 3);
        ComplexMember m1 = newActiveMember(f, "회원1", "01050000001");
        ComplexMember m2 = newActiveMember(f, "회원2", "01050000002");

        assertThatCode(() -> {
            complexClassService.addMember(f.clazz.getSeq(), m1.getSeq());
            complexClassService.addMember(f.clazz.getSeq(), m2.getSeq());
        }).doesNotThrowAnyException();

        assertThat(mappingRepository.findByComplexClassSeqWithMember(f.clazz.getSeq())).hasSize(2);
    }

    @Test
    void 정원_가득찬_상태에서_추가_가입은_거부되어야_한다() {
        Fixture f = setupWithCapacity("full", 2);
        ComplexMember m1 = newActiveMember(f, "회원1", "01050000011");
        ComplexMember m2 = newActiveMember(f, "회원2", "01050000012");
        ComplexMember m3 = newActiveMember(f, "회원3", "01050000013");

        complexClassService.addMember(f.clazz.getSeq(), m1.getSeq());
        complexClassService.addMember(f.clazz.getSeq(), m2.getSeq());

        // 3번째는 정원 초과
        assertThatThrownBy(() -> complexClassService.addMember(f.clazz.getSeq(), m3.getSeq()))
                .isInstanceOf(IllegalStateException.class);

        assertThat(mappingRepository.findByComplexClassSeqWithMember(f.clazz.getSeq()))
                .as("정원 초과 시 매핑이 생성되면 안 된다").hasSize(2);
    }

    @Test
    void capacity_1인_수업에는_두번째_회원_가입_거부() {
        Fixture f = setupWithCapacity("one", 1);
        ComplexMember m1 = newActiveMember(f, "회원A", "01050000021");
        ComplexMember m2 = newActiveMember(f, "회원B", "01050000022");

        complexClassService.addMember(f.clazz.getSeq(), m1.getSeq());
        assertThatThrownBy(() -> complexClassService.addMember(f.clazz.getSeq(), m2.getSeq()))
                .isInstanceOf(IllegalStateException.class);
    }

    private record Fixture(Branch branch, ComplexClass clazz, Membership product) {}
}
