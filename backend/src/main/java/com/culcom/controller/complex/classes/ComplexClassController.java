package com.culcom.controller.complex.classes;

import com.culcom.dto.ApiResponse;
import com.culcom.dto.complex.classes.ComplexClassRequest;
import com.culcom.dto.complex.classes.ComplexClassResponse;
import com.culcom.config.security.CustomUserPrincipal;
import com.culcom.service.ComplexClassService;
import jakarta.validation.Valid;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/complex/classes")
@RequiredArgsConstructor
public class ComplexClassController {

    private final ComplexClassService complexClassService;

    @GetMapping("/{seq}")
    public ResponseEntity<ApiResponse<ComplexClassResponse>> get(@PathVariable Long seq) {
        ComplexClassResponse result = complexClassService.get(seq);
        return ResponseEntity.ok(ApiResponse.ok(result));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<ComplexClassResponse>> create(
            @Valid @RequestBody ComplexClassRequest req, @AuthenticationPrincipal CustomUserPrincipal principal) {
        ComplexClassResponse result = complexClassService.create(req, principal.getSelectedBranchSeq());
        return ResponseEntity.ok(ApiResponse.ok("수업 추가 완료", result));
    }

    @PutMapping("/{seq}")
    public ResponseEntity<ApiResponse<ComplexClassResponse>> update(
            @PathVariable Long seq, @RequestBody ComplexClassRequest req) {
        ComplexClassResponse result = complexClassService.update(seq, req);
        return ResponseEntity.ok(ApiResponse.ok("수업 수정 완료", result));
    }

    @DeleteMapping("/{seq}")
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable Long seq) {
        complexClassService.delete(seq);
        return ResponseEntity.ok(ApiResponse.ok("수업 삭제 완료", null));
    }
}
