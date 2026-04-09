package com.culcom.dto.complex.member;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class MembershipRequest {
    @NotBlank
    private String name;
    @NotNull
    private Integer duration;
    @NotNull
    private Integer count;
    @NotNull
    private Integer price;

    private Boolean transferable = true;
}
