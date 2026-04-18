package com.culcom.dto.publicapi;

import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class ZapierCustomerRequest {

    @NotBlank(message = "name은 필수입니다.")
    private String name;

    @NotBlank(message = "phone은 필수입니다.")
    private String phone;

    /**
     * 광고 상호/상품명. Customer.commercialName 으로 저장된다.
     */
    private String adName;

    /**
     * 광고 출처. Customer.adSource 로 저장된다.
     */
    private String adSource;

    /**
     * 지점 식별용 alias. Branch.alias 로 조회된다.
     */
    @NotBlank(message = "location은 필수입니다.")
    private String location;
}
