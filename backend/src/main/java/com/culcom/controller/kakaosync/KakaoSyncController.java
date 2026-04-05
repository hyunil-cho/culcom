package com.culcom.controller.kakaosync;

import com.culcom.config.security.CustomUserPrincipal;
import com.culcom.dto.ApiResponse;
import com.culcom.dto.kakaosync.KakaoSyncUrlResponse;
import com.culcom.service.KakaoSyncService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/kakao-sync")
@RequiredArgsConstructor
public class KakaoSyncController {

    private final KakaoSyncService kakaoSyncService;

    @GetMapping("/url")
    public ResponseEntity<ApiResponse<KakaoSyncUrlResponse>> getKakaoSyncUrl(
            @AuthenticationPrincipal CustomUserPrincipal principal) {
        return ResponseEntity.ok(ApiResponse.ok(
                kakaoSyncService.getKakaoSyncUrl(principal.getSelectedBranchSeq())));
    }
}
