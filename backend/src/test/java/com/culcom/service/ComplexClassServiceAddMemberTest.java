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

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * 팀(수업) 가입 시 멤버십 상태 검증 시나리오:
 * - 환불된 회원은 팀에 추가할 수 없다
 * - 만료된 회원은 팀에 추가할 수 없다
 * - 정지된 회원은 팀에 추가할 수 없다
 * - 활성 멤버십이 하나라도 있으면 가능 (환불/만료가 있어도 무관)
 *
 * 멤버십이 하나도 없는 회원은 가입 시점에는 예외이며, 이 경우도 "활성 없음"으로 본다.
 */
@SpringBootTest
@ActiveProfiles("test")
@Transactional
class ComplexClassServiceAddMemberTest {

    @Autowired ComplexClassService complexClassService;
    @Autowired BranchRepository branchRepository;
    @Autowired ClassTimeSlotRepository classTimeSlotRepository;
    @Autowired ComplexClassRepository classRepository;
    @Autowired MembershipRepository membershipRepository;
    @Autowired ComplexMemberRepository memberRepository;
    @Autowired ComplexMemberMembershipRepository memberMembershipRepository;
    @Autowired ComplexMemberClassMappingRepository classMappingRepository;

    private Fixture setup(String suffix) {
        Branch branch = branchRepository.save(Branch.builder()
                .branchName("테스트지점")
                .alias("test-addmember-" + suffix + "-" + System.nanoTime())
                .build());

        ClassTimeSlot slot = classTimeSlotRepository.save(ClassTimeSlot.builder()
                .branch(branch).name("월수금").daysOfWeek("MON,WED,FRI")
                .startTime(LocalTime.of(9, 0)).endTime(LocalTime.of(10, 0))
                .build());

        ComplexClass clazz = classRepository.save(ComplexClass.builder()
                .branch(branch).timeSlot(slot).name("영어A").capacity(10).sortOrder(0).build());

        Membership product = membershipRepository.save(Membership.builder()
                .name("3개월권").duration(90).count(30).price(300_000).build());

        return new Fixture(branch, clazz, product);
    }

    private ComplexMember newMember(Fixture f, String name, String phone) {
        return memberRepository.save(ComplexMember.builder()
                .name(name).phoneNumber(phone).branch(f.branch).build());
    }

    private ComplexMemberMembership newMembership(Fixture f, ComplexMember m, MembershipStatus status, LocalDate expiry) {
        return memberMembershipRepository.save(ComplexMemberMembership.builder()
                .member(m).membership(f.product)
                .startDate(LocalDate.now().minusDays(10))
                .expiryDate(expiry)
                .totalCount(30).usedCount(0)
                .price("300000")
                .status(status)
                .build());
    }

    @Test
    void 환불된_회원은_팀에_추가할_수_없다() {
        Fixture f = setup("refunded");
        ComplexMember m = newMember(f, "환불회원", "01010000001");
        newMembership(f, m, MembershipStatus.환불, LocalDate.now().plusDays(80));

        assertThatThrownBy(() -> complexClassService.addMember(f.clazz.getSeq(), m.getSeq()))
                .isInstanceOf(IllegalStateException.class);

        assertThat(classMappingRepository.findByMemberSeq(m.getSeq()))
                .as("거부되었으므로 매핑이 생성되지 않아야 한다").isEmpty();
    }

    @Test
    void 만료된_회원은_팀에_추가할_수_없다() {
        Fixture f = setup("expired");
        ComplexMember m = newMember(f, "만료회원", "01010000002");
        newMembership(f, m, MembershipStatus.만료, LocalDate.now().minusDays(1));

        assertThatThrownBy(() -> complexClassService.addMember(f.clazz.getSeq(), m.getSeq()))
                .isInstanceOf(IllegalStateException.class);

        assertThat(classMappingRepository.findByMemberSeq(m.getSeq())).isEmpty();
    }

    @Test
    void 정지된_회원은_팀에_추가할_수_없다() {
        Fixture f = setup("suspended");
        ComplexMember m = newMember(f, "정지회원", "01010000003");
        newMembership(f, m, MembershipStatus.정지, LocalDate.now().plusDays(80));

        assertThatThrownBy(() -> complexClassService.addMember(f.clazz.getSeq(), m.getSeq()))
                .isInstanceOf(IllegalStateException.class);

        assertThat(classMappingRepository.findByMemberSeq(m.getSeq())).isEmpty();
    }

    @Test
    void 멤버십이_하나도_없는_회원은_팀에_추가할_수_없다() {
        Fixture f = setup("no-membership");
        ComplexMember m = newMember(f, "신규회원", "01010000004");
        // 멤버십 미생성

        assertThatThrownBy(() -> complexClassService.addMember(f.clazz.getSeq(), m.getSeq()))
                .isInstanceOf(IllegalStateException.class);
    }

    @Test
    void 활성_멤버십이_있는_회원은_정상적으로_팀에_추가된다() {
        Fixture f = setup("active");
        ComplexMember m = newMember(f, "활성회원", "01010000005");
        newMembership(f, m, MembershipStatus.활성, LocalDate.now().plusDays(80));

        assertThatCode(() -> complexClassService.addMember(f.clazz.getSeq(), m.getSeq()))
                .doesNotThrowAnyException();

        assertThat(classMappingRepository.findByMemberSeq(m.getSeq()))
                .as("매핑이 1건 생성되어야 한다").hasSize(1);
    }

    @Test
    void 환불된_멤버십과_활성_멤버십을_함께_가진_회원은_팀_추가_허용() {
        Fixture f = setup("refund-plus-active");
        ComplexMember m = newMember(f, "재구매회원", "01010000006");
        // 환불된 과거 멤버십
        newMembership(f, m, MembershipStatus.환불, LocalDate.now().minusDays(5));
        // 새로 구매한 활성 멤버십
        newMembership(f, m, MembershipStatus.활성, LocalDate.now().plusDays(80));

        assertThatCode(() -> complexClassService.addMember(f.clazz.getSeq(), m.getSeq()))
                .doesNotThrowAnyException();

        assertThat(classMappingRepository.findByMemberSeq(m.getSeq())).hasSize(1);
    }

    private record Fixture(Branch branch, ComplexClass clazz, Membership product) {}
}
