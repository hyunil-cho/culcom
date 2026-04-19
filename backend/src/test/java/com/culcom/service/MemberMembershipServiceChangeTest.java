package com.culcom.service;

import com.culcom.dto.complex.member.ComplexMemberMembershipResponse;
import com.culcom.dto.complex.member.MembershipChangeRequest;
import com.culcom.entity.branch.Branch;
import com.culcom.entity.complex.clazz.ClassTimeSlot;
import com.culcom.entity.complex.clazz.ComplexClass;
import com.culcom.entity.complex.member.ComplexMember;
import com.culcom.entity.complex.member.ComplexMemberClassMapping;
import com.culcom.entity.complex.member.ComplexMemberMembership;
import com.culcom.entity.complex.member.MembershipPayment;
import com.culcom.entity.enums.MembershipStatus;
import com.culcom.entity.enums.PaymentKind;
import com.culcom.entity.product.Membership;
import com.culcom.repository.*;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import java.lang.reflect.Field;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * 멤버십 변경(active → 다른 상품으로 교체) 시나리오.
 * - 원본은 {@link MembershipStatus#변경}으로 종결되고 수업 배정은 유지
 * - 새 멤버십은 {@code 활성}으로 생성되며 {@code changedFromSeq}/{@code changeFee}가 세팅된다
 * - 추가 비용이 양수/음수/0일 때 결제 기록 생성 여부와 kind가 올바른지
 */
@SpringBootTest
@ActiveProfiles("test")
@Transactional
class MemberMembershipServiceChangeTest {

    @Autowired MemberMembershipService memberMembershipService;
    @Autowired BranchRepository branchRepository;
    @Autowired ClassTimeSlotRepository classTimeSlotRepository;
    @Autowired ComplexClassRepository classRepository;
    @Autowired MembershipRepository membershipRepository;
    @Autowired ComplexMemberRepository memberRepository;
    @Autowired ComplexMemberMembershipRepository memberMembershipRepository;
    @Autowired ComplexMemberClassMappingRepository classMappingRepository;
    @Autowired MembershipPaymentRepository paymentRepository;

    private static class Fixture {
        Branch branch;
        ComplexMember member;
        Membership oldProduct;
        Membership newProduct;
        ComplexMemberMembership sourceMm;
        ComplexClass classA;
    }

    private Fixture setupFixture(String suffix) {
        Fixture f = new Fixture();
        f.branch = branchRepository.save(Branch.builder()
                .branchName("테스트지점").alias("test-change-" + suffix).build());

        ClassTimeSlot slot = classTimeSlotRepository.save(ClassTimeSlot.builder()
                .branch(f.branch).name("월수금-change-" + suffix).daysOfWeek("MON,WED,FRI")
                .startTime(LocalTime.of(9, 0)).endTime(LocalTime.of(10, 0))
                .build());
        f.classA = classRepository.save(ComplexClass.builder()
                .branch(f.branch).timeSlot(slot).name("요가A").capacity(10).sortOrder(0).build());

        // 기존 범용 변경(=다운그레이드/동일 등급 경로) 검증을 위해 new < old로 구성한다.
        // 업그레이드(new > old)는 별도 테스트에서 다룬다.
        f.oldProduct = membershipRepository.save(Membership.builder()
                .name("20회권-" + suffix).duration(90).count(20).price(280000).build());
        f.newProduct = membershipRepository.save(Membership.builder()
                .name("10회권-" + suffix).duration(60).count(10).price(150000).build());

        f.member = memberRepository.save(ComplexMember.builder()
                .name("김회원").phoneNumber("0101111" + suffix.substring(0, Math.min(4, suffix.length())))
                .branch(f.branch).build());

        f.sourceMm = memberMembershipRepository.save(ComplexMemberMembership.builder()
                .member(f.member).membership(f.oldProduct)
                .startDate(LocalDate.now().minusDays(15))
                .expiryDate(LocalDate.now().plusDays(75))
                .totalCount(20).usedCount(3)
                .price("280000")
                .status(MembershipStatus.활성)
                .build());

        classMappingRepository.save(ComplexMemberClassMapping.builder()
                .member(f.member).complexClass(f.classA).sortOrder(0).build());

        return f;
    }

    @Test
    void 변경_성공_시_원본은_변경상태_새멤버십은_활성_수업배정은_유지된다() {
        Fixture f = setupFixture("a");

        MembershipChangeRequest req = new MembershipChangeRequest();
        setField(req, "newMembershipSeq", f.newProduct.getSeq());
        setField(req, "price", "280000");
        setField(req, "changeFee", 50000L);
        setField(req, "paymentMethod", "현금");
        setField(req, "changeNote", "더 긴 기간으로 업그레이드");

        ComplexMemberMembershipResponse response =
                memberMembershipService.changeMembership(f.member.getSeq(), f.sourceMm.getSeq(), req);

        // 원본: 변경 상태
        ComplexMemberMembership reloadedSource = memberMembershipRepository.findById(f.sourceMm.getSeq()).orElseThrow();
        assertThat(reloadedSource.getStatus()).isEqualTo(MembershipStatus.변경);

        // 새 멤버십: 활성 + changedFromSeq/changeFee 세팅
        ComplexMemberMembership target = memberMembershipRepository.findById(response.getSeq()).orElseThrow();
        assertThat(target.getStatus()).isEqualTo(MembershipStatus.활성);
        assertThat(target.getChangedFromSeq()).isEqualTo(f.sourceMm.getSeq());
        assertThat(target.getChangeFee()).isEqualTo(50000L);
        assertThat(target.getMembership().getSeq()).isEqualTo(f.newProduct.getSeq());

        // 수업 배정 유지
        assertThat(classMappingRepository.findByMemberSeq(f.member.getSeq()))
                .as("변경 후에도 수업 배정이 유지되어야 한다")
                .hasSize(1);

        // 결제 기록: ADDITIONAL 1건
        List<MembershipPayment> payments = paymentRepository.findByMemberMembershipSeqOrderByPaidDateAscSeqAsc(target.getSeq());
        assertThat(payments).hasSize(1);
        assertThat(payments.get(0).getAmount()).isEqualTo(50000L);
        assertThat(payments.get(0).getKind()).isEqualTo(PaymentKind.ADDITIONAL);
        assertThat(payments.get(0).getNote()).contains("멤버십 변경").contains("10회권").contains("20회권");
    }

    @Test
    void 추가비용이_음수면_REFUND_kind로_기록된다() {
        Fixture f = setupFixture("b");

        MembershipChangeRequest req = new MembershipChangeRequest();
        setField(req, "newMembershipSeq", f.newProduct.getSeq());
        setField(req, "price", "100000");
        setField(req, "changeFee", -30000L);  // 차액 환급

        ComplexMemberMembershipResponse response =
                memberMembershipService.changeMembership(f.member.getSeq(), f.sourceMm.getSeq(), req);

        List<MembershipPayment> payments = paymentRepository.findByMemberMembershipSeqOrderByPaidDateAscSeqAsc(response.getSeq());
        assertThat(payments).hasSize(1);
        assertThat(payments.get(0).getAmount()).isEqualTo(-30000L);
        assertThat(payments.get(0).getKind()).isEqualTo(PaymentKind.REFUND);
    }

    @Test
    void 추가비용이_0이면_결제기록을_남기지_않는다() {
        Fixture f = setupFixture("c");

        MembershipChangeRequest req = new MembershipChangeRequest();
        setField(req, "newMembershipSeq", f.newProduct.getSeq());
        setField(req, "price", "280000");
        setField(req, "changeFee", 0L);

        ComplexMemberMembershipResponse response =
                memberMembershipService.changeMembership(f.member.getSeq(), f.sourceMm.getSeq(), req);

        List<MembershipPayment> payments = paymentRepository.findByMemberMembershipSeqOrderByPaidDateAscSeqAsc(response.getSeq());
        assertThat(payments).isEmpty();

        // changeFee 컬럼은 그대로 0으로 저장
        ComplexMemberMembership target = memberMembershipRepository.findById(response.getSeq()).orElseThrow();
        assertThat(target.getChangeFee()).isEqualTo(0L);
    }

    @Test
    void 원본이_활성이_아니면_변경할_수_없다() {
        Fixture f = setupFixture("d");
        f.sourceMm.setStatus(MembershipStatus.만료);
        memberMembershipRepository.save(f.sourceMm);

        MembershipChangeRequest req = new MembershipChangeRequest();
        setField(req, "newMembershipSeq", f.newProduct.getSeq());
        setField(req, "price", "280000");
        setField(req, "changeFee", 50000L);

        assertThatThrownBy(() ->
                memberMembershipService.changeMembership(f.member.getSeq(), f.sourceMm.getSeq(), req))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("활성");
    }

    @Test
    void 변경_후_새_활성_멤버십이_유일해서_이후_activeOnly_쿼리에_원본이_잡히지_않는다() {
        Fixture f = setupFixture("e");

        MembershipChangeRequest req = new MembershipChangeRequest();
        setField(req, "newMembershipSeq", f.newProduct.getSeq());
        setField(req, "price", "280000");
        setField(req, "changeFee", 10000L);

        memberMembershipService.changeMembership(f.member.getSeq(), f.sourceMm.getSeq(), req);

        // 변경 후: 원본은 변경 상태라 existsActive 쿼리는 새 멤버십만 잡아야 한다
        assertThat(memberMembershipRepository.existsActiveByMemberSeq(f.member.getSeq())).isTrue();
        assertThat(memberMembershipRepository.existsActiveByMemberSeqExcluding(
                f.member.getSeq(), f.sourceMm.getSeq()))
                .as("원본 seq를 제외해도 새 멤버십이 활성으로 남아 있어야 한다")
                .isTrue();
    }

    /** MembershipChangeRequest가 setter를 노출하지 않아 리플렉션으로 주입한다. */
    private static void setField(Object target, String name, Object value) {
        try {
            Field f = target.getClass().getDeclaredField(name);
            f.setAccessible(true);
            f.set(target, value);
        } catch (ReflectiveOperationException e) {
            throw new RuntimeException(e);
        }
    }
}
