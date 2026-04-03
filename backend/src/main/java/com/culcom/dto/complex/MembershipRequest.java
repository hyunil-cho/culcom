package com.culcom.dto.complex;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class MembershipRequest {
    private String name;
    private Integer duration;
    private Integer count;
    private Integer price;
}
