package com.culcom.dto.complex.dashboard;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TrendItem {
    private String bucket;  // 일: yyyy-MM-dd, 주: yyyy-WW (ISO), 월: yyyy-MM, 연: yyyy
    private int count;
}
