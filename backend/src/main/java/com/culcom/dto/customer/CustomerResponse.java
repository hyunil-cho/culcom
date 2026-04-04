package com.culcom.dto.customer;

import com.culcom.entity.customer.Customer;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Getter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CustomerResponse {
    private Long seq;
    private String name;
    private String phoneNumber;
    private String comment;
    private String commercialName;
    private String adSource;
    private Integer callCount;
    private String status;
    private LocalDateTime createdDate;
    private LocalDateTime lastUpdateDate;

    public static CustomerResponse from(Customer c) {
        return CustomerResponse.builder()
                .seq(c.getSeq())
                .name(c.getName())
                .phoneNumber(c.getPhoneNumber())
                .comment(c.getComment())
                .commercialName(c.getCommercialName())
                .adSource(c.getAdSource())
                .callCount(c.getCallCount())
                .status(c.getStatus().name())
                .createdDate(c.getCreatedDate())
                .lastUpdateDate(c.getLastUpdateDate())
                .build();
    }
}
