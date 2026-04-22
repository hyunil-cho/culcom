package com.culcom.dto.complex.dashboard;

import lombok.Builder;
import lombok.Getter;

import java.time.LocalDate;

@Getter
@Builder
public class ReturnScanLogItem {
    private LocalDate scanDate;
    private LocalDate returnDate;
    private int memberCount;
    private int smsSuccessCount;
    private int smsFailCount;
    /** 가장 최근 실패 사유 — 없으면 null */
    private String errorMessage;
}