package com.culcom.dto.publicapi;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data @AllArgsConstructor
public class PostponementSubmitResponse {
    private String name;
    private String phone;
    private String branchName;
    private String startDate;
    private String endDate;
    private String reason;
}
