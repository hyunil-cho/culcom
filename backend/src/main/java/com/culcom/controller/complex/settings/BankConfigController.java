package com.culcom.controller.complex.settings;

import com.culcom.dto.ApiResponse;
import com.culcom.dto.complex.settings.BankConfigDto;
import com.culcom.service.BankConfigService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/complex/settings/banks")
@RequiredArgsConstructor
public class BankConfigController {

    private final BankConfigService service;

    @GetMapping
    public ResponseEntity<ApiResponse<List<BankConfigDto.Response>>> list() {
        return ResponseEntity.ok(ApiResponse.ok(service.listAll()));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<BankConfigDto.Response>> create(
            @RequestBody BankConfigDto.CreateRequest req) {
        return ResponseEntity.ok(ApiResponse.ok("은행 추가 완료", service.create(req)));
    }

    @PutMapping("/{seq}")
    public ResponseEntity<ApiResponse<BankConfigDto.Response>> update(
            @PathVariable Long seq, @RequestBody BankConfigDto.UpdateRequest req) {
        return ResponseEntity.ok(ApiResponse.ok("은행 수정 완료", service.update(seq, req)));
    }

    @DeleteMapping("/{seq}")
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable Long seq) {
        service.delete(seq);
        return ResponseEntity.ok(ApiResponse.ok("은행 삭제 완료", null));
    }
}
