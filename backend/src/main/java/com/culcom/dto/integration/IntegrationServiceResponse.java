package com.culcom.dto.integration;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class IntegrationServiceResponse {
    private Long id;
    private String name;
    private String description;
    private String icon;
    private String category;
    private String status;     // active, inactive, not-configured
    private boolean connected;
}
