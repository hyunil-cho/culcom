package com.culcom.dto.dashboard;

import lombok.Builder;
import lombok.Getter;

import java.util.List;

@Getter
@Builder
public class DashboardResponse {
    private int todayTotalCustomers;
    private int smsRemaining;
    private int lmsRemaining;
    private List<DailyStatsResponse> dailyStats;
}