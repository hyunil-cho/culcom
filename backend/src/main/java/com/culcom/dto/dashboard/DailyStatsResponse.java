package com.culcom.dto.dashboard;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class DailyStatsResponse {
    private String date;
    private int count;
    private int reservationCount;
}