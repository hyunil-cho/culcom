package com.culcom.dto.complex.dashboard;

import lombok.*;

import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TrendResponse {
    private String period;  // day | week | month | year
    private int count;
    private List<TrendItem> members;
    private List<TrendItem> staffs;
    private List<TrendItem> postponements;
    private List<TrendItem> refunds;
    private List<TrendItem> transfers;
}
