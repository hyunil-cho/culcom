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
 * 팀 리더(ComplexClass.staff) 배정 시 활성 멤버십 검증 시나리오.
 *
 * 프로젝트의 도메인 모델에서 리더도 결국 ComplexMember이고,
 * 스태프는 internal 멤버십(status=활성)을 통해 팀에 배정된다.
 * 휴직/퇴직 시 internal 멤버십이 정지로 토글되므로
 * existsActiveByMemberSeq가 일반 회원 경로와 동일하게 동작한다.
 * 따라서 addMember와 동일한 가드가 setLeader에도 필요하다.
 */
@SpringBootTest
@ActiveProfiles("test")
@Transactional
class ComplexClassServiceSetLeaderTest {

    @Autowired ComplexClassService complexClassService;
    @Autowired BranchRepository branchRepository;
    @Autowired ClassTimeSlotRepository classTimeSlotRepository;
    @Autowired ComplexClassRepository classRepository;
    @Autowired MembershipRepository membershipRepository;
    @Autowired ComplexMemberRepository memberRepository;
    @Autowired ComplexMemberMembershipRepository memberMembershipRepository;

    private Fixture setup(String suffix) {
        Branch branch = branchRepository.save(Branch.builder()
                .branchName("테스트지점")
                .alias("test-setleader-" + suffix + "-" + System.nanoTime())
                .build());

        ClassTimeSlot slot = classTimeSlotRepository.save(ClassTimeSlot.builder()
                .branch(branch).name("월수금").daysOfWeek("MON,WED,FRI")
                .startTime(LocalTime.of(9, 0)).endTime(LocalTime.of(10, 0))
                .build());

        ComplexClass clazz = classRepository.save(ComplexClass.builder()
                .branch(branch).timeSlot(slot).name("영어A").capacity(10).sortOrder(0).build());

        // 스태프 internal 멤버십 상품 (무제한 성격이지만 테스트에선 의미 없는 숫자로 충분)
        Membership product = membershipRepository.save(Membership.builder()
                .name("스태프 내부권").duration(365).count(9999).price(0).build());

        return new Fixture(branch, clazz, product);
    }

    private ComplexMember newStaffLikeMember(Fixture f, String name, String phone,
                                              MembershipStatus status, LocalDate expiry, boolean internal) {
        ComplexMember m = memberRepository.save(ComplexMember.builder()
                .name(name).phoneNumber(phone).branch(f.branch).build());
        memberMembershipRepository.save(ComplexMemberMembership.builder()
                .member(m).membership(f.product)
                .startDate(LocalDate.now().minusDays(1))
                .expiryDate(expiry)
                .totalCount(9999).usedCount(0)
                .price("0")
                .status(status)
                .internal(internal)
                .build());
        return m;
    }

    @Test
    void 활성_internal_멤버십이_있는_스태프는_리더로_배정된다() {
        Fixture f = setup("active-staff");
        ComplexMember staff = newStaffLikeMember(f, "활성리더", "01020000001",
                MembershipStatus.활성, LocalDate.now().plusDays(365), true);

        assertThatCode(() -> complexClassService.setLeader(f.clazz.getSeq(), staff.getSeq()))
                .doesNotThrowAnyException();

        assertThat(classRepository.findById(f.clazz.getSeq()).orElseThrow().getStaff().getSeq())
                .isEqualTo(staff.getSeq());
    }

    @Test
    void 휴직_전환으로_internal_멤버십이_정지된_스태프는_리더로_배정_불가() {
        Fixture f = setup("suspended-staff");
        ComplexMember staff = newStaffLikeMember(f, "휴직자", "01020000002",
                MembershipStatus.정지, LocalDate.now().plusDays(365), true);

        assertThatThrownBy(() -> complexClassService.setLeader(f.clazz.getSeq(), staff.getSeq()))
                .isInstanceOf(IllegalStateException.class);

        assertThat(classRepository.findById(f.clazz.getSeq()).orElseThrow().getStaff())
                .as("거부되었으므로 리더 필드는 변경되지 않아야 한다").isNull();
    }

    @Test
    void 만료된_internal_멤버십을_가진_스태프는_리더로_배정_불가() {
        Fixture f = setup("expired-staff");
        ComplexMember staff = newStaffLikeMember(f, "만료스태프", "01020000003",
                MembershipStatus.만료, LocalDate.now().minusDays(1), true);

        assertThatThrownBy(() -> complexClassService.setLeader(f.clazz.getSeq(), staff.getSeq()))
                .isInstanceOf(IllegalStateException.class);
    }

    @Test
    void 환불된_일반_멤버십만_가진_회원은_리더로_배정_불가() {
        // 일반 회원 시나리오 — 리더로 세팅 시도 시에도 동일 가드 적용되어야 한다
        Fixture f = setup("refunded-general");
        ComplexMember m = newStaffLikeMember(f, "환불회원", "01020000004",
                MembershipStatus.환불, LocalDate.now().plusDays(80), false);

        assertThatThrownBy(() -> complexClassService.setLeader(f.clazz.getSeq(), m.getSeq()))
                .isInstanceOf(IllegalStateException.class);
    }

    @Test
    void 멤버십이_전혀_없는_회원은_리더로_배정_불가() {
        Fixture f = setup("no-membership");
        ComplexMember m = memberRepository.save(ComplexMember.builder()
                .name("신규").phoneNumber("01020000005").branch(f.branch).build());

        assertThatThrownBy(() -> complexClassService.setLeader(f.clazz.getSeq(), m.getSeq()))
                .isInstanceOf(IllegalStateException.class);
    }

    @Test
    void 리더_해제_null은_활성_멤버십_검증과_무관하게_허용() {
        // given — 먼저 활성 스태프를 리더로 지정
        Fixture f = setup("unset-leader");
        ComplexMember staff = newStaffLikeMember(f, "해제대상", "01020000006",
                MembershipStatus.활성, LocalDate.now().plusDays(365), true);
        complexClassService.setLeader(f.clazz.getSeq(), staff.getSeq());

        // 이후 internal 멤버십을 정지로 바꿔도 (= 휴직 상황 유사)
        // 리더 해제(null)는 별도의 의미라 거부되면 안 된다.
        var mm = memberMembershipRepository.findByMemberSeqAndInternalTrue(staff.getSeq()).get(0);
        mm.setStatus(MembershipStatus.정지);
        memberMembershipRepository.save(mm);

        assertThatCode(() -> complexClassService.setLeader(f.clazz.getSeq(), null))
                .as("리더 해제 자체는 언제나 허용되어야 한다").doesNotThrowAnyException();

        assertThat(classRepository.findById(f.clazz.getSeq()).orElseThrow().getStaff()).isNull();
    }

    private record Fixture(Branch branch, ComplexClass clazz, Membership product) {}
}
