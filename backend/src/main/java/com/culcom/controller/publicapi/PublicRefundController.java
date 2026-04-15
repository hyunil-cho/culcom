package com.culcom.controller.publicapi;

import com.culcom.dto.ApiResponse;
import com.culcom.dto.publicapi.MemberSearchResponse;
import com.culcom.dto.publicapi.RefundSubmitRequest;
import com.culcom.service.PublicRefundService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/public/refund")
@RequiredArgsConstructor
public class PublicRefundController {

    private final PublicRefundService publicRefundService;

    @GetMapping("/search-member")
    public ResponseEntity<ApiResponse<MemberSearchResponse>> searchMember(
            @RequestParam String name, @RequestParam String phone) {
        return ResponseEntity.ok(ApiResponse.ok(publicRefundService.searchMember(name, phone)));
    }

    @PostMapping("/submit")
    public ResponseEntity<ApiResponse<Long>> submit(@RequestBody RefundSubmitRequest req) {
        try {
            Long seq = publicRefundService.submit(req);
            return ResponseEntity.ok(ApiResponse.ok(seq));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage()));
        }
    }

    @GetMapping("/reasons")
    public ResponseEntity<ApiResponse<List<String>>> reasons(@RequestParam Long branchSeq) {
        return ResponseEntity.ok(ApiResponse.ok(publicRefundService.reasons(branchSeq)));
    }
}
