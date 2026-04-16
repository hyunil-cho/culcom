package com.culcom.controller.complex.settings;

import com.culcom.dto.ApiResponse;
import com.culcom.dto.complex.settings.ConfigDto;
import com.culcom.service.CardCompanyConfigService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/complex/settings/card-companies")
@RequiredArgsConstructor
public class CardCompanyConfigController {

    private final CardCompanyConfigService service;

    @GetMapping
    public ResponseEntity<ApiResponse<List<ConfigDto.Response>>> list() {
        return ResponseEntity.ok(ApiResponse.ok(service.listAll()));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<ConfigDto.Response>> create(
            @RequestBody ConfigDto.CreateRequest req) {
        return ResponseEntity.ok(ApiResponse.ok("카드사 추가 완료", service.create(req)));
    }

    @PutMapping("/{seq}")
    public ResponseEntity<ApiResponse<ConfigDto.Response>> update(
            @PathVariable Long seq, @RequestBody ConfigDto.UpdateRequest req) {
        return ResponseEntity.ok(ApiResponse.ok("카드사 수정 완료", service.update(seq, req)));
    }

    @DeleteMapping("/{seq}")
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable Long seq) {
        service.delete(seq);
        return ResponseEntity.ok(ApiResponse.ok("카드사 삭제 완료", null));
    }
}
