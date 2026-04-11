package com.culcom.dto.complex.member;

import com.culcom.entity.enums.StaffStatus;
import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDate;

@Getter
@Setter
public class ComplexStaffRequest {
    @NotBlank
    private String name;
    @NotBlank
    private String phoneNumber;
    private StaffStatus status;
    private LocalDate joinDate;
}
