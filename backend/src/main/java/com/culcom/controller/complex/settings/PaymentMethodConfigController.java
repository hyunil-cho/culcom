package com.culcom.controller.complex.settings;

import com.culcom.dto.ApiResponse;
import com.culcom.dto.complex.settings.PaymentMethodConfigDto;
import com.culcom.service.PaymentMethodConfigService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/complex/settings/payment-methods")
@RequiredArgsConstructor
public class PaymentMethodConfigController {

    private final PaymentMethodConfigService service;

    @GetMapping
    public ResponseEntity<ApiResponse<List<PaymentMethodConfigDto.Response>>> list() {
        return ResponseEntity.ok(ApiResponse.ok(service.listAll()));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<PaymentMethodConfigDto.Response>> create(
            @RequestBody PaymentMethodConfigDto.CreateRequest req) {
        return ResponseEntity.ok(ApiResponse.ok("결제 수단 추가 완료", service.create(req)));
    }

    @PutMapping("/{seq}")
    public ResponseEntity<ApiResponse<PaymentMethodConfigDto.Response>> update(
            @PathVariable Long seq, @RequestBody PaymentMethodConfigDto.UpdateRequest req) {
        return ResponseEntity.ok(ApiResponse.ok("결제 수단 수정 완료", service.update(seq, req)));
    }

    @DeleteMapping("/{seq}")
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable Long seq) {
        service.delete(seq);
        return ResponseEntity.ok(ApiResponse.ok("결제 수단 삭제 완료", null));
    }
}
