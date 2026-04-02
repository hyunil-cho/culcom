package com.culcom.dto.dashboard;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class CallerStatsResponse {
    private String caller;
    private int selectionCount;
    private int reservationConfirm;
    private double confirmRate;
}