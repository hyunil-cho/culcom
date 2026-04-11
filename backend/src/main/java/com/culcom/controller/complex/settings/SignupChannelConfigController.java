package com.culcom.controller.complex.settings;

import com.culcom.dto.ApiResponse;
import com.culcom.dto.complex.settings.SignupChannelConfigDto;
import com.culcom.service.SignupChannelConfigService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/complex/settings/signup-channels")
@RequiredArgsConstructor
public class SignupChannelConfigController {

    private final SignupChannelConfigService service;

    @GetMapping
    public ResponseEntity<ApiResponse<List<SignupChannelConfigDto.Response>>> list() {
        return ResponseEntity.ok(ApiResponse.ok(service.listAll()));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<SignupChannelConfigDto.Response>> create(
            @RequestBody SignupChannelConfigDto.CreateRequest req) {
        return ResponseEntity.ok(ApiResponse.ok("가입경로 추가 완료", service.create(req)));
    }

    @PutMapping("/{seq}")
    public ResponseEntity<ApiResponse<SignupChannelConfigDto.Response>> update(
            @PathVariable Long seq, @RequestBody SignupChannelConfigDto.UpdateRequest req) {
        return ResponseEntity.ok(ApiResponse.ok("가입경로 수정 완료", service.update(seq, req)));
    }

    @DeleteMapping("/{seq}")
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable Long seq) {
        service.delete(seq);
        return ResponseEntity.ok(ApiResponse.ok("가입경로 삭제 완료", null));
    }
}