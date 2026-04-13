package com.culcom.service;

import com.culcom.entity.branch.Branch;
import com.culcom.entity.complex.clazz.ClassTimeSlot;
import com.culcom.entity.complex.clazz.ComplexClass;
import com.culcom.entity.complex.member.ComplexMember;
import com.culcom.entity.complex.member.ComplexMemberMembership;
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

import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * 지점 경계 무결성 시나리오:
 * 한 지점의 수업에 다른 지점 소속 회원을 추가/리더 배정할 수 없어야 한다.
 * 현재 ComplexClassService에는 branch 일치 검증이 없는 것으로 추정됨.
 */
@SpringBootTest
@ActiveProfiles("test")
@Transactional
class ComplexClassServiceCrossBranchTest {

    @Autowired ComplexClassService complexClassService;
    @Autowired BranchRepository branchRepository;
    @Autowired ClassTimeSlotRepository classTimeSlotRepository;
    @Autowired ComplexClassRepository classRepository;
    @Autowired MembershipRepository membershipRepository;
    @Autowired ComplexMemberRepository memberRepository;
    @Autowired ComplexMemberMembershipRepository memberMembershipRepository;

    private record Env(Branch branchA, Branch branchB, ComplexClass classInA,
                       ComplexMember memberInB) {}

    private Env makeEnv(String suffix) {
        long t = System.nanoTime();
        Branch a = branchRepository.save(Branch.builder()
                .branchName("강남점").alias("test-cross-A-" + suffix + "-" + t).build());
        Branch b = branchRepository.save(Branch.builder()
                .branchName("홍대점").alias("test-cross-B-" + suffix + "-" + t).build());

        ClassTimeSlot slotA = classTimeSlotRepository.save(ClassTimeSlot.builder()
                .branch(a).name("월수금").daysOfWeek("MON,WED,FRI")
                .startTime(LocalTime.of(9, 0)).endTime(LocalTime.of(10, 0)).build());

        ComplexClass classA = classRepository.save(ComplexClass.builder()
                .branch(a).timeSlot(slotA).name("강남-영어A").capacity(10).sortOrder(0).build());

        Membership product = membershipRepository.save(Membership.builder()
                .name("3개월권").duration(90).count(30).price(300_000).build());

        // 회원은 Branch B 소속
        ComplexMember m = memberRepository.save(ComplexMember.builder()
                .name("홍대회원").phoneNumber("01060000" + Math.abs(suffix.hashCode() % 1000))
                .branch(b).build());
        memberMembershipRepository.save(ComplexMemberMembership.builder()
                .member(m).membership(product)
                .startDate(LocalDate.now()).expiryDate(LocalDate.now().plusDays(80))
                .totalCount(30).usedCount(0)
                .price("300000").status(MembershipStatus.활성).build());

        return new Env(a, b, classA, m);
    }

    @Test
    void 다른_지점_회원을_팀_멤버로_추가할_수_없다() {
        Env env = makeEnv("addMember");
        assertThatThrownBy(() ->
                complexClassService.addMember(env.classInA.getSeq(), env.memberInB.getSeq()))
                .isInstanceOf(IllegalStateException.class);
    }

    @Test
    void 다른_지점_회원을_팀_리더로_배정할_수_없다() {
        Env env = makeEnv("setLeader");
        assertThatThrownBy(() ->
                complexClassService.setLeader(env.classInA.getSeq(), env.memberInB.getSeq()))
                .isInstanceOf(IllegalStateException.class);
    }
}
