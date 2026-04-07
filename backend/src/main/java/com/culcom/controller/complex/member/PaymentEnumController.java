package com.culcom.controller.complex.member;

import com.culcom.dto.ApiResponse;
import com.culcom.dto.complex.member.EnumOption;
import com.culcom.entity.enums.PaymentKind;
import com.culcom.repository.BankConfigRepository;
import com.culcom.repository.PaymentMethodConfigRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Arrays;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/complex/payments/options")
@RequiredArgsConstructor
public class PaymentEnumController {

    private final PaymentMethodConfigRepository paymentMethodRepository;
    private final BankConfigRepository bankRepository;

    @GetMapping
    public ResponseEntity<ApiResponse<Map<String, List<EnumOption>>>> options() {
        Map<String, List<EnumOption>> result = new LinkedHashMap<>();
        result.put("methods", paymentMethodRepository.findAllByIsActiveTrueOrderBySortOrderAscSeqAsc()
                .stream().map(m -> new EnumOption(m.getCode(), m.getLabel())).toList());
        result.put("banks", bankRepository.findAllByIsActiveTrueOrderBySortOrderAscSeqAsc()
                .stream().map(b -> new EnumOption(b.getCode(), b.getLabel())).toList());
        result.put("kinds", Arrays.stream(PaymentKind.values())
                .map(k -> new EnumOption(k.name(), k.getLabel())).toList());
        return ResponseEntity.ok(ApiResponse.ok(result));
    }
}
