package com.culcom.controller.consent;

import com.culcom.dto.ApiResponse;
import com.culcom.dto.consent.ConsentItemRequest;
import com.culcom.dto.consent.ConsentItemResponse;
import com.culcom.service.ConsentItemService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/consent-items")
@RequiredArgsConstructor
public class ConsentItemController {

    private final ConsentItemService consentItemService;

    @GetMapping
    public ResponseEntity<ApiResponse<List<ConsentItemResponse>>> list(
            @RequestParam(required = false) String category) {
        List<ConsentItemResponse> data = category != null
                ? consentItemService.listByCategory(category)
                : consentItemService.list();
        return ResponseEntity.ok(ApiResponse.ok(data));
    }

    @GetMapping("/{seq}")
    public ResponseEntity<ApiResponse<ConsentItemResponse>> get(@PathVariable Long seq) {
        return ResponseEntity.ok(ApiResponse.ok(consentItemService.get(seq)));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<ConsentItemResponse>> create(
            @Valid @RequestBody ConsentItemRequest req) {
        return ResponseEntity.ok(ApiResponse.ok("동의항목 추가 완료", consentItemService.create(req)));
    }

    @PutMapping("/{seq}")
    public ResponseEntity<ApiResponse<ConsentItemResponse>> update(
            @PathVariable Long seq, @Valid @RequestBody ConsentItemRequest req) {
        return ResponseEntity.ok(ApiResponse.ok("동의항목 수정 완료", consentItemService.update(seq, req)));
    }

    @DeleteMapping("/{seq}")
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable Long seq) {
        consentItemService.delete(seq);
        return ResponseEntity.ok(ApiResponse.ok("동의항목 삭제 완료", null));
    }
}
