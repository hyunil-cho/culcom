package com.culcom.controller.dashboard;

import com.culcom.dto.ApiResponse;
import com.culcom.dto.dashboard.CallerStatsResponse;
import com.culcom.dto.dashboard.DashboardResponse;
import com.culcom.mapper.DashboardMapper;
import com.culcom.service.AuthService;
import jakarta.servlet.http.HttpSession;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/dashboard")
@RequiredArgsConstructor
public class DashboardController {

    private final DashboardMapper dashboardMapper;
    private final AuthService authService;

    @GetMapping
    public ResponseEntity<ApiResponse<DashboardResponse>> getDashboard(HttpSession session) {
        Long branchSeq = authService.getSessionBranchSeq(session);

        int todayCustomers = dashboardMapper.countTodayCustomers(branchSeq);
        var dailyStats = dashboardMapper.selectDailyStats(branchSeq, 7);

        int smsRemaining = 0;
        int lmsRemaining = 0;
        if (branchSeq != null) {
            try {
                smsRemaining = dashboardMapper.selectSmsRemaining(branchSeq);
            } catch (Exception ignored) {}
            try {
                lmsRemaining = dashboardMapper.selectLmsRemaining(branchSeq);
            } catch (Exception ignored) {}
        }

        DashboardResponse response = DashboardResponse.builder()
                .todayTotalCustomers(todayCustomers)
                .smsRemaining(smsRemaining)
                .lmsRemaining(lmsRemaining)
                .dailyStats(dailyStats)
                .build();

        return ResponseEntity.ok(ApiResponse.ok(response));
    }

    @GetMapping("/caller-stats")
    public ResponseEntity<ApiResponse<List<CallerStatsResponse>>> getCallerStats(
            HttpSession session,
            @RequestParam(defaultValue = "day") String period) {

        if (!period.equals("day") && !period.equals("week") && !period.equals("month")) {
            return ResponseEntity.badRequest()
                    .body(ApiResponse.error("유효하지 않은 기간입니다."));
        }

        Long branchSeq = authService.getSessionBranchSeq(session);
        List<CallerStatsResponse> stats = dashboardMapper.selectCallerStats(branchSeq, period);

        return ResponseEntity.ok(ApiResponse.ok(stats));
    }
}
