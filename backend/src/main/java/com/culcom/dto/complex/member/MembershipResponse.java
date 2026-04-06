package com.culcom.dto.complex.member;

import com.culcom.entity.product.Membership;
import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;

@Getter
@Builder
public class MembershipResponse {
    private Long seq;
    private String name;
    private Integer duration;
    private Integer count;
    private Integer price;
    private LocalDateTime createdDate;

    public static MembershipResponse from(Membership entity) {
        return MembershipResponse.builder()
                .seq(entity.getSeq())
                .name(entity.getName())
                .duration(entity.getDuration())
                .count(entity.getCount())
                .price(entity.getPrice())
                .createdDate(entity.getCreatedDate())
                .build();
    }
}
