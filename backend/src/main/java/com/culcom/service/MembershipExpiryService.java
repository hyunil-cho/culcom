package com.culcom.service;

import com.culcom.entity.complex.member.ComplexMemberMembership;
import com.culcom.entity.enums.ActivityEventType;
import com.culcom.entity.enums.MembershipStatus;
import com.culcom.event.ActivityEvent;
import com.culcom.repository.ComplexMemberMembershipRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;

/**
 * 멤버십 기간 만료 자동 처리.
 *
 * 매일 자정(00:00:00)에 status='활성' 이지만 expiry_date < today 인 멤버십을
 * MembershipStatus.만료 로 전환하고, MemberActivityLog 에 만료 이벤트를 기록한다.
 * 만료된 멤버십을 듣던 회원은 소속 수업 매핑이 일괄 해제된다.
 *
 * 호출 시점:
 *  - 운영: @Scheduled 로 자동 실행
 *  - 테스트/수동: expirePastDueOn(today) 직접 호출
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class MembershipExpiryService {

    private final ComplexMemberMembershipRepository memberMembershipRepository;
    private final ComplexMemberService complexMemberService;
    private final ApplicationEventPublisher eventPublisher;

    /**
     * 매일 자정 00:00:00 — Asia/Seoul.
     * 자기 자신 호출(this.expirePastDueOn) 시 프록시를 거치지 않아 내부 @Transactional이 무력화되므로
     * 진입 메서드에도 직접 @Transactional 을 부여한다.
     */
    @Scheduled(cron = "0 0 0 * * *", zone = "Asia/Seoul")
    @Transactional
    public void scheduledExpire() {
        int count = expirePastDueOn(LocalDate.now());
        if (count > 0) {
            log.info("[MembershipExpiry] {}건 자동 만료 처리됨", count);
        }
    }

    /**
     * today 기준으로 기간이 지난 활성 멤버십을 만료로 전환한다.
     * @return 처리된 건수
     */
    @Transactional
    public int expirePastDueOn(LocalDate today) {
        List<ComplexMemberMembership> expired = memberMembershipRepository.findActiveButExpired(today);
        if (expired.isEmpty()) return 0;

        for (ComplexMemberMembership mm : expired) {
            mm.setStatus(MembershipStatus.만료);
            memberMembershipRepository.save(mm);

            eventPublisher.publishEvent(ActivityEvent.ofMembership(
                    mm.getMember(),
                    ActivityEventType.MEMBERSHIP_UPDATE,
                    mm.getSeq(),
                    "기간 만료로 자동 만료 (만료일 " + mm.getExpiryDate() + ")"));

            // 만료된 멤버십을 듣던 수업 배정도 자동 해제
            complexMemberService.detachMemberFromAllClasses(mm.getMember(), "만료");
        }
        return expired.size();
    }
}
