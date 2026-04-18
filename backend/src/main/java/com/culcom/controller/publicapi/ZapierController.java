package com.culcom.controller.publicapi;

import com.culcom.dto.ApiResponse;
import com.culcom.dto.publicapi.ZapierCustomerRequest;
import com.culcom.service.ZapierService;
import jakarta.validation.Valid;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/public/zapier")
@RequiredArgsConstructor
public class ZapierController {

    private static final String TOKEN_HEADER = "X-Webhook-Token";

    private final ZapierService zapierService;

    /**
     * Zapier 에서 전달되는 광고 리드(잠재 고객)를 Customer 로 저장한다.
     * 요청 헤더 X-Webhook-Token 은 서버에 설정된 시크릿과 일치해야 한다.
     */
    @PostMapping("/customer")
    public ResponseEntity<ApiResponse<CustomerCreatedResponse>> createCustomer(
            @RequestHeader(value = TOKEN_HEADER, required = false) String token,
            @Valid @RequestBody ZapierCustomerRequest request) {
        zapierService.verifySecret(token);
        Long seq = zapierService.createCustomer(request);
        return ResponseEntity.ok(ApiResponse.ok("고객 등록 완료", new CustomerCreatedResponse(seq)));
    }

    @Getter
    @AllArgsConstructor
    public static class CustomerCreatedResponse {
        private final Long seq;
    }
}
