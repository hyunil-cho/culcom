package com.culcom.controller.publicapi;

import com.culcom.dto.ApiResponse;
import com.culcom.dto.consent.ConsentItemResponse;
import com.culcom.service.ConsentItemService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * 비로그인 사용자가 약관 항목을 조회할 수 있는 공개 엔드포인트.
 * 회원가입, 공개 설문, 공개 환불 등 로그인 없이 동의를 받아야 하는 플로우에서 사용한다.
 */
@RestController
@RequestMapping("/api/public/consent-items")
@RequiredArgsConstructor
public class PublicConsentController {

    private final ConsentItemService consentItemService;

    @GetMapping
    public ResponseEntity<ApiResponse<List<ConsentItemResponse>>> list(
            @RequestParam(required = false) String category) {
        List<ConsentItemResponse> items = category != null && !category.isBlank()
                ? consentItemService.listByCategory(category)
                : consentItemService.list();
        return ResponseEntity.ok(ApiResponse.ok(items));
    }
}
