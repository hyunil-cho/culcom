package com.culcom.dto.complex.member;

import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class ComplexMemberRequest {
    @NotBlank
    private String name;
    @NotBlank
    private String phoneNumber;
    private String info;
    private String chartNumber;
    private String comment;
    private String interviewer;
}
