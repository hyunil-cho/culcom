package com.culcom.service;

import com.culcom.entity.branch.Branch;
import com.culcom.entity.complex.clazz.ClassTimeSlot;
import com.culcom.entity.complex.clazz.ComplexClass;
import com.culcom.entity.complex.member.ComplexMember;
import com.culcom.entity.complex.member.ComplexMemberClassMapping;
import com.culcom.entity.complex.member.ComplexMemberMembership;
import com.culcom.entity.complex.member.track.MemberActivityLog;
import com.culcom.entity.enums.ActivityEventType;
import com.culcom.entity.enums.MembershipStatus;
import com.culcom.entity.product.Membership;
import com.culcom.repository.*;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.transaction.TestTransaction;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * 멤버십 기간 만료 자동 처리 검증.
 * MembershipExpiryService.expirePastDueOn(today) 가 호출되면:
 *  - 만료일이 지난 활성 멤버십 → status = 만료
 *  - 활동 히스토리에 기간 만료 이벤트 기록
 *  - 해당 회원의 모든 수업 매핑이 일괄 해제
 *  - 만료일이 아직 안 지난 멤버십은 영향 없음
 */
@SpringBootTest
@ActiveProfiles("test")
@Transactional
class MembershipExpiryServiceTest {

    @Autowired MembershipExpiryService membershipExpiryService;
    @Autowired BranchRepository branchRepository;
    @Autowired ClassTimeSlotRepository classTimeSlotRepository;
    @Autowired ComplexClassRepository classRepository;
    @Autowired MembershipRepository membershipRepository;
    @Autowired ComplexMemberRepository memberRepository;
    @Autowired ComplexMemberMembershipRepository memberMembershipRepository;
    @Autowired ComplexMemberClassMappingRepository classMappingRepository;
    @Autowired MemberActivityLogRepository memberActivityLogRepository;

    @Test
    void 기간_만료된_활성_멤버십이_자동으로_만료_상태가_되고_히스토리에_기록되며_수업이_해제된다() {
        // given
        long uniq = System.nanoTime();
        Branch branch = branchRepository.save(Branch.builder()
                .branchName("테스트지점-expire-cron-" + uniq)
                .alias("test-expire-cron-" + uniq)
                .build());

        ClassTimeSlot slot = classTimeSlotRepository.save(ClassTimeSlot.builder()
                .branch(branch).name("월수금").daysOfWeek("MON,WED,FRI")
                .startTime(LocalTime.of(9, 0)).endTime(LocalTime.of(10, 0))
                .build());

        ComplexClass clazzA = classRepository.save(ComplexClass.builder()
                .branch(branch).timeSlot(slot).name("요가A").capacity(10).sortOrder(0).build());
        ComplexClass clazzB = classRepository.save(ComplexClass.builder()
                .branch(branch).timeSlot(slot).name("필라테스B").capacity(10).sortOrder(1).build());

        Membership product = membershipRepository.save(Membership.builder()
                .name("10회권").duration(60).count(10).price(150000).build());

        // 만료된 회원 (어제 만료, 활성 상태)
        ComplexMember expiredMember = memberRepository.save(ComplexMember.builder()
                .name("만료자").phoneNumber("01011112222").branch(branch).build());
        ComplexMemberMembership expiredMm = memberMembershipRepository.save(ComplexMemberMembership.builder()
                .member(expiredMember).membership(product)
                .startDate(LocalDate.now().minusDays(60))
                .expiryDate(LocalDate.now().minusDays(1))
                .totalCount(10).usedCount(5)
                .status(MembershipStatus.활성)
                .build());
        classMappingRepository.save(ComplexMemberClassMapping.builder()
                .member(expiredMember).complexClass(clazzA).sortOrder(0).build());
        classMappingRepository.save(ComplexMemberClassMapping.builder()
                .member(expiredMember).complexClass(clazzB).sortOrder(0).build());

        // 멀쩡한 회원 (만료일 미도래, 영향받지 않아야 함)
        ComplexMember healthyMember = memberRepository.save(ComplexMember.builder()
                .name("정상자").phoneNumber("01033334444").branch(branch).build());
        ComplexMemberMembership healthyMm = memberMembershipRepository.save(ComplexMemberMembership.builder()
                .member(healthyMember).membership(product)
                .startDate(LocalDate.now().minusDays(10))
                .expiryDate(LocalDate.now().plusDays(50))
                .totalCount(10).usedCount(2)
                .status(MembershipStatus.활성)
                .build());
        classMappingRepository.save(ComplexMemberClassMapping.builder()
                .member(healthyMember).complexClass(clazzA).sortOrder(0).build());

        Long expiredMemberSeq = expiredMember.getSeq();
        Long expiredMmSeq = expiredMm.getSeq();
        Long healthyMemberSeq = healthyMember.getSeq();
        Long healthyMmSeq = healthyMm.getSeq();

        // when — 셋업 commit 후 서비스 실행
        TestTransaction.flagForCommit();
        TestTransaction.end();

        int count = membershipExpiryService.expirePastDueOn(LocalDate.now());

        // then
        TestTransaction.start();
        TestTransaction.flagForRollback();

        assertThat(count).as("만료 처리된 건수는 1건").isEqualTo(1);

        ComplexMemberMembership reloadedExpired = memberMembershipRepository.findById(expiredMmSeq).orElseThrow();
        assertThat(reloadedExpired.getStatus())
                .as("기간 만료된 멤버십은 만료 상태로 전환되어야 한다")
                .isEqualTo(MembershipStatus.만료);

        ComplexMemberMembership reloadedHealthy = memberMembershipRepository.findById(healthyMmSeq).orElseThrow();
        assertThat(reloadedHealthy.getStatus())
                .as("만료일이 미도래한 멤버십은 활성으로 유지되어야 한다")
                .isEqualTo(MembershipStatus.활성);

        // 수업 매핑 검증
        assertThat(classMappingRepository.findByMemberSeq(expiredMemberSeq))
                .as("만료된 회원의 수업 배정은 모두 해제되어야 한다")
                .isEmpty();
        assertThat(classMappingRepository.findByMemberSeq(healthyMemberSeq))
                .as("정상 회원의 수업 배정은 유지되어야 한다")
                .hasSize(1);

        // 활동 히스토리 검증
        List<MemberActivityLog> logs = memberActivityLogRepository
                .findByMemberSeqOrderByCreatedDateDesc(expiredMemberSeq);
        assertThat(logs)
                .as("기간 만료 이벤트가 히스토리에 기록되어야 한다")
                .anySatisfy(log -> {
                    assertThat(log.getEventType()).isEqualTo(ActivityEventType.MEMBERSHIP_UPDATE);
                    assertThat(log.getMemberMembershipSeq()).isEqualTo(expiredMmSeq);
                    assertThat(log.getNote())
                            .as("만료 사유 노트에 '기간 만료' 키워드가 포함되어야 한다")
                            .contains("기간 만료");
                });

        assertThat(memberActivityLogRepository.findByMemberSeqOrderByCreatedDateDesc(healthyMemberSeq))
                .as("정상 회원에는 만료 이벤트가 기록되지 않아야 한다")
                .noneMatch(log -> log.getEventType() == ActivityEventType.MEMBERSHIP_UPDATE
                        && log.getNote() != null && log.getNote().contains("기간 만료"));
    }

    @Test
    void scheduledExpire_엔트리포인트가_만료_처리를_위임한다() {
        // given — 어제 만료된 활성 멤버십 1건
        long uniq = System.nanoTime();
        Branch branch = branchRepository.save(Branch.builder()
                .branchName("테스트지점-sched-" + uniq)
                .alias("test-sched-" + uniq)
                .build());
        Membership product = membershipRepository.save(Membership.builder()
                .name("10회권").duration(60).count(10).price(150000).build());
        ComplexMember member = memberRepository.save(ComplexMember.builder()
                .name("스케줄대상").phoneNumber("01099998888").branch(branch).build());
        ComplexMemberMembership mm = memberMembershipRepository.save(ComplexMemberMembership.builder()
                .member(member).membership(product)
                .startDate(LocalDate.now().minusDays(60))
                .expiryDate(LocalDate.now().minusDays(1))
                .totalCount(10).usedCount(3)
                .status(MembershipStatus.활성).build());

        Long mmSeq = mm.getSeq();
        Long memberSeq = member.getSeq();

        // when — @Scheduled 메서드를 직접 호출 (cron 트리거 시뮬레이션)
        TestTransaction.flagForCommit();
        TestTransaction.end();

        membershipExpiryService.scheduledExpire();

        // then
        TestTransaction.start();
        TestTransaction.flagForRollback();

        assertThat(memberMembershipRepository.findById(mmSeq).orElseThrow().getStatus())
                .as("scheduledExpire() 호출 시 기간 만료 멤버십이 만료 상태로 전환")
                .isEqualTo(MembershipStatus.만료);
        assertThat(memberActivityLogRepository.findByMemberSeqOrderByCreatedDateDesc(memberSeq))
                .anySatisfy(log -> {
                    assertThat(log.getEventType()).isEqualTo(ActivityEventType.MEMBERSHIP_UPDATE);
                    assertThat(log.getNote()).contains("기간 만료");
                });
    }
}
