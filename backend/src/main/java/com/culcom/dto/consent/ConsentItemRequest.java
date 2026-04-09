package com.culcom.dto.consent;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class ConsentItemRequest {
    @NotBlank
    private String title;
    @NotBlank
    private String content;
    @NotNull
    private Boolean required;
    @NotBlank
    private String category;
}
