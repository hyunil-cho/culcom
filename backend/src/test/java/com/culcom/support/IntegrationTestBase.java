package com.culcom.support;

import com.culcom.entity.branch.Branch;
import com.culcom.entity.complex.clazz.ClassTimeSlot;
import com.culcom.entity.complex.clazz.ComplexClass;
import com.culcom.entity.complex.member.ComplexMember;
import com.culcom.entity.complex.member.ComplexMemberMembership;
import com.culcom.entity.enums.MembershipStatus;
import com.culcom.entity.product.Membership;
import com.culcom.repository.BranchRepository;
import com.culcom.repository.ClassTimeSlotRepository;
import com.culcom.repository.ComplexClassRepository;
import com.culcom.repository.ComplexMemberMembershipRepository;
import com.culcom.repository.ComplexMemberRepository;
import com.culcom.repository.MembershipRepository;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.concurrent.atomic.AtomicLong;

/**
 * 통합(서비스/매퍼/리포지토리) 테스트 공통 베이스.
 *
 * <p>목적:
 * <ol>
 *   <li>{@code @SpringBootTest + @ActiveProfiles("test") + @Transactional} 어노테이션 세트를 고정해
 *       Spring 컨텍스트 캐시가 확실히 단일 인스턴스로 공유되도록 한다.</li>
 *   <li>테스트마다 반복되는 엔티티 생성(브랜치/멤버/수업/멤버십 등) 보일러플레이트를 제거한다.</li>
 * </ol>
 *
 * <p>사용: 서비스/통합 테스트 클래스가 이 클래스를 {@code extends} 하고 필요한 헬퍼를 호출한다.
 * 개별 테스트에서 추가 리포지토리/서비스가 필요하면 본인 클래스에서 {@code @Autowired} 하면 된다.
 *
 * <p>주의: 본 클래스 자체에 {@code @MockBean} 선언을 두면 안 된다 — 하위 클래스별로 다르면 컨텍스트가 다시 깨진다.
 */
@SpringBootTest
@ActiveProfiles("test")
@Transactional
public abstract class IntegrationTestBase {

    // 테스트 간 unique alias/phone 생성용 — nanoTime 충돌 대응.
    private static final AtomicLong UNIQUE = new AtomicLong(System.nanoTime());

    @Autowired protected BranchRepository branchRepository;
    @Autowired protected ClassTimeSlotRepository timeSlotRepository;
    @Autowired protected ComplexClassRepository classRepository;
    @Autowired protected ComplexMemberRepository memberRepository;
    @Autowired protected ComplexMemberMembershipRepository memberMembershipRepository;
    @Autowired protected MembershipRepository membershipRepository;

    @PersistenceContext protected EntityManager em;

    protected static long uniq() {
        return UNIQUE.incrementAndGet();
    }

    // ── Branch ──

    protected Branch newBranch(String name) {
        return branchRepository.save(Branch.builder()
                .branchName(name)
                .alias("alias-" + uniq())
                .build());
    }

    protected Branch newBranch() {
        return newBranch("테스트지점-" + uniq());
    }

    // ── ClassTimeSlot ──

    protected ClassTimeSlot newSlot(Branch branch) {
        return newSlot(branch, "슬롯-" + uniq());
    }

    protected ClassTimeSlot newSlot(Branch branch, String name) {
        return timeSlotRepository.save(ClassTimeSlot.builder()
                .branch(branch).name(name).daysOfWeek("MON,WED,FRI")
                .startTime(LocalTime.of(10, 0)).endTime(LocalTime.of(11, 0))
                .build());
    }

    // ── ComplexClass ──

    protected ComplexClass newClass(Branch branch, ClassTimeSlot slot) {
        return newClass(branch, slot, "수업-" + uniq(), null);
    }

    protected ComplexClass newClass(Branch branch, ClassTimeSlot slot, String name) {
        return newClass(branch, slot, name, null);
    }

    protected ComplexClass newClass(Branch branch, ClassTimeSlot slot, String name, ComplexMember staffLeader) {
        return classRepository.save(ComplexClass.builder()
                .branch(branch).timeSlot(slot).name(name)
                .capacity(10).sortOrder(0)
                .staff(staffLeader)
                .build());
    }

    // ── ComplexMember ──

    protected ComplexMember newMember(Branch branch) {
        return newMember(branch, "회원-" + uniq());
    }

    protected ComplexMember newMember(Branch branch, String name) {
        return memberRepository.save(ComplexMember.builder()
                .name(name)
                .phoneNumber("010" + (uniq() % 100000000L))
                .branch(branch)
                .build());
    }

    // ── Membership product ──

    protected Membership newMembershipProduct(int count, int durationDays) {
        return membershipRepository.save(Membership.builder()
                .name("멤버십-" + uniq())
                .count(count)
                .duration(durationDays)
                .price(60000)
                .build());
    }

    // ── ComplexMemberMembership (회원 보유 멤버십) ──

    protected ComplexMemberMembership newActiveMemberMembership(
            ComplexMember member, Membership product, int usedCount) {
        return memberMembershipRepository.save(ComplexMemberMembership.builder()
                .member(member).membership(product)
                .startDate(LocalDate.now())
                .expiryDate(LocalDate.now().plusDays(product.getDuration()))
                .totalCount(product.getCount())
                .usedCount(usedCount)
                .status(MembershipStatus.활성)
                .build());
    }

    protected ComplexMemberMembership newActiveMemberMembership(ComplexMember member, Membership product) {
        return newActiveMemberMembership(member, product, 0);
    }
}
