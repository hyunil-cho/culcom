package com.culcom.dto.complex.dashboard;

import lombok.Builder;
import lombok.Getter;

import java.util.List;

/**
 * 복귀 예정자 스캔 상태 — 최근 N일치 스캔 로그를 그대로 나열.
 * 해당 날짜에 스캔 로그가 아예 없으면 스캔 미실행(또는 실패) 가능성이 있음을 UI에서 표현.
 */
@Getter
@Builder
public class ReturnScanStatusResponse {
    private int days;
    private List<ReturnScanLogItem> logs;
}