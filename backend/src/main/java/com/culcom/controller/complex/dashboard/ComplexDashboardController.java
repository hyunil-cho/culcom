package com.culcom.controller.complex.dashboard;

import com.culcom.config.security.CustomUserPrincipal;
import com.culcom.dto.ApiResponse;
import com.culcom.dto.complex.dashboard.AutoExpiredItem;
import com.culcom.dto.complex.dashboard.MembershipAlertItem;
import com.culcom.dto.complex.dashboard.MembershipAlertsResponse;
import com.culcom.dto.complex.dashboard.TrendResponse;
import com.culcom.entity.complex.member.ComplexMemberMembership;
import com.culcom.entity.complex.member.logs.MemberActivityLog;
import com.culcom.mapper.ComplexDashboardMapper;
import com.culcom.repository.ComplexMemberMembershipRepository;
import com.culcom.repository.MemberActivityLogRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.Comparator;
import java.util.List;

@RestController
@RequestMapping("/api/complex/dashboard")
@RequiredArgsConstructor
public class ComplexDashboardController {

    private final ComplexMemberMembershipRepository membershipRepository;
    private final MemberActivityLogRepository memberActivityLogRepository;
    private final ComplexDashboardMapper complexDashboardMapper;

    /**
     * 대시보드 멤버십 알림 — 3개 위젯을 한 번에 반환.
     *
     * @param windowDays    만료 임박/만료 위젯의 대칭 윈도우 (기본 14일)
     * @param countThreshold 잔여 횟수 임박 기준 (기본 3회)
     */
    @GetMapping("/membership-alerts")
    public ResponseEntity<ApiResponse<MembershipAlertsResponse>> membershipAlerts(
            @AuthenticationPrincipal CustomUserPrincipal principal,
            @RequestParam(defaultValue = "14") int windowDays,
            @RequestParam(defaultValue = "3") int countThreshold) {

        Long branchSeq = principal.getSelectedBranchSeq();
        LocalDate today = LocalDate.now();
        LocalDate until = today.plusDays(windowDays);
        LocalDate since = today.minusDays(windowDays);

        // 만료 임박: 만료일 가까운 순
        List<MembershipAlertItem> expiringSoon = membershipRepository
                .findExpiringSoon(branchSeq, today, until)
                .stream()
                .sorted(Comparator.comparing(ComplexMemberMembership::getExpiryDate))
                .map(mm -> toItem(mm, today))
                .toList();

        // 이미 만료: 만료일 최근 순 (어제 → 더 옛날)
        List<MembershipAlertItem> recentlyExpired = membershipRepository
                .findRecentlyExpired(branchSeq, today, since)
                .stream()
                .sorted(Comparator.comparing(ComplexMemberMembership::getExpiryDate).reversed())
                .map(mm -> toItem(mm, today))
                .toList();

        // 잔여 횟수 임박: 적은 순
        List<MembershipAlertItem> lowRemaining = membershipRepository
                .findLowRemaining(branchSeq, today, countThreshold)
                .stream()
                .sorted(Comparator.comparingInt(mm -> remaining(mm)))
                .map(mm -> toItem(mm, today))
                .toList();

        // 당일 자동 만료된 멤버십 (스케줄러 / 출석 시 횟수 소진 트리거 통합)
        LocalDateTime startOfDay = today.atStartOfDay();
        LocalDateTime startOfTomorrow = today.plusDays(1).atStartOfDay();
        List<AutoExpiredItem> autoExpiredToday = memberActivityLogRepository
                .findAutoExpiredBetween(branchSeq, startOfDay, startOfTomorrow)
                .stream()
                .map(ComplexDashboardController::toAutoExpiredItem)
                .toList();

        return ResponseEntity.ok(ApiResponse.ok(MembershipAlertsResponse.builder()
                .expiringSoon(expiringSoon)
                .recentlyExpired(recentlyExpired)
                .lowRemaining(lowRemaining)
                .autoExpiredToday(autoExpiredToday)
                .windowDays(windowDays)
                .countThreshold(countThreshold)
                .build()));
    }

    /**
     * 등록/요청 추이.
     *
     * @param period 일(day) / 주(week) / 월(month) / 연(year) — 기본 month
     * @param count  반환할 버킷 개수 — 기본 6
     */
    @GetMapping("/trends")
    public ResponseEntity<ApiResponse<TrendResponse>> trends(
            @AuthenticationPrincipal CustomUserPrincipal principal,
            @RequestParam(defaultValue = "month") String period,
            @RequestParam(defaultValue = "6") int count) {

        Long branchSeq = principal.getSelectedBranchSeq();
        String normalized = switch (period) {
            case "day", "week", "month", "year" -> period;
            default -> "month";
        };

        return ResponseEntity.ok(ApiResponse.ok(TrendResponse.builder()
                .period(normalized)
                .count(count)
                .members(complexDashboardMapper.selectMembers(branchSeq, normalized, count))
                .staffs(complexDashboardMapper.selectStaffs(branchSeq, normalized, count))
                .postponements(complexDashboardMapper.selectPostponements(branchSeq, normalized, count))
                .refunds(complexDashboardMapper.selectRefunds(branchSeq, normalized, count))
                .transfers(complexDashboardMapper.selectTransfers(branchSeq, normalized, count))
                .postponementReturns(complexDashboardMapper.selectPostponementReturns(branchSeq, normalized, count))
                .returnSmsSuccess(complexDashboardMapper.selectReturnSmsSuccess(branchSeq, normalized, count))
                .returnSmsFail(complexDashboardMapper.selectReturnSmsFail(branchSeq, normalized, count))
                .build()));
    }

    private static AutoExpiredItem toAutoExpiredItem(MemberActivityLog log) {
        String note = log.getNote() != null ? log.getNote() : "";
        String reason = note.contains("기간 만료") ? "기간만료"
                      : note.contains("소진") ? "횟수소진"
                      : "자동만료";
        return AutoExpiredItem.builder()
                .memberSeq(log.getMember().getSeq())
                .memberName(log.getMember().getName())
                .phoneNumber(log.getMember().getPhoneNumber())
                .memberMembershipSeq(log.getMemberMembershipSeq())
                .reason(reason)
                .expiredAt(log.getEventDate())
                .note(note)
                .build();
    }

    private static int remaining(ComplexMemberMembership mm) {
        Integer t = mm.getTotalCount();
        Integer u = mm.getUsedCount();
        if (t == null) return Integer.MAX_VALUE;
        return t - (u != null ? u : 0);
    }

    private static MembershipAlertItem toItem(ComplexMemberMembership mm, LocalDate today) {
        Long days = mm.getExpiryDate() != null
                ? ChronoUnit.DAYS.between(today, mm.getExpiryDate())
                : null;
        return MembershipAlertItem.builder()
                .memberSeq(mm.getMember().getSeq())
                .memberName(mm.getMember().getName())
                .phoneNumber(mm.getMember().getPhoneNumber())
                .memberMembershipSeq(mm.getSeq())
                .membershipName(mm.getMembership() != null ? mm.getMembership().getName() : null)
                .expiryDate(mm.getExpiryDate())
                .daysFromToday(days)
                .totalCount(mm.getTotalCount())
                .usedCount(mm.getUsedCount())
                .remainingCount(remaining(mm))
                .build();
    }
}
