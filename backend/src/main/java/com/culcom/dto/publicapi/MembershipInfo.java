package com.culcom.dto.publicapi;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data @AllArgsConstructor
public class MembershipInfo {
    private Long seq;
    private String membershipName;
    private String startDate;
    private String expiryDate;
    private Integer totalCount;
    private Integer usedCount;
    private Integer postponeTotal;
    private Integer postponeUsed;
}
