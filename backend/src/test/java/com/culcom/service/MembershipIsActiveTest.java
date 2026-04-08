package com.culcom.service;

import com.culcom.entity.complex.member.ComplexMemberMembership;
import com.culcom.entity.enums.MembershipStatus;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

import java.time.LocalDate;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * 데이터 무결성 시나리오:
 * 멤버십이 (1) 만료되었거나 (2) 사용 횟수를 모두 소진한 경우,
 * ComplexMemberMembership.isActive() 는 false 를 반환해야 한다.
 */
@SpringBootTest
@ActiveProfiles("test")
class MembershipIsActiveTest {

    private ComplexMemberMembership build(LocalDate expiry, int total, int used, MembershipStatus status) {
        return ComplexMemberMembership.builder()
                .startDate(LocalDate.now().minusDays(30))
                .expiryDate(expiry)
                .totalCount(total)
                .usedCount(used)
                .status(status)
                .build();
    }

    @Test
    void 정상_멤버십은_active() {
        ComplexMemberMembership mm = build(LocalDate.now().plusDays(10), 10, 3, MembershipStatus.활성);
        assertThat(mm.isActive()).isTrue();
    }

    @Test
    void 만료된_멤버십은_inactive() {
        ComplexMemberMembership mm = build(LocalDate.now().minusDays(1), 10, 3, MembershipStatus.활성);
        assertThat(mm.isActive())
                .as("expiryDate가 오늘 이전이면 isActive=false")
                .isFalse();
    }

    @Test
    void 횟수_소진된_멤버십은_inactive() {
        ComplexMemberMembership mm = build(LocalDate.now().plusDays(10), 10, 10, MembershipStatus.활성);
        assertThat(mm.isActive())
                .as("usedCount가 totalCount에 도달하면 isActive=false")
                .isFalse();
    }

    @Test
    void 횟수_초과된_멤버십도_inactive() {
        ComplexMemberMembership mm = build(LocalDate.now().plusDays(10), 10, 11, MembershipStatus.활성);
        assertThat(mm.isActive()).isFalse();
    }

    @Test
    void 환불된_멤버십은_inactive() {
        ComplexMemberMembership mm = build(LocalDate.now().plusDays(10), 10, 3, MembershipStatus.환불);
        assertThat(mm.isActive()).isFalse();
    }

    @Test
    void 정지된_멤버십은_inactive() {
        ComplexMemberMembership mm = build(LocalDate.now().plusDays(10), 10, 3, MembershipStatus.정지);
        assertThat(mm.isActive()).isFalse();
    }

    @Test
    void 만료일이_오늘인_멤버십은_active() {
        // 만료일 == 오늘 → 아직 사용 가능 (isBefore false)
        ComplexMemberMembership mm = build(LocalDate.now(), 10, 3, MembershipStatus.활성);
        assertThat(mm.isActive()).isTrue();
    }
}
