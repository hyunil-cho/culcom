package com.culcom.controller.kakaosync;

import com.culcom.config.KakaoSyncProperties;
import com.culcom.config.security.CustomUserPrincipal;
import com.culcom.dto.ApiResponse;
import com.culcom.dto.kakaosync.KakaoSyncUrlResponse;
import com.culcom.entity.branch.Branch;
import com.culcom.exception.EntityNotFoundException;
import com.culcom.repository.BranchRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;

@RestController
@RequestMapping("/api/kakao-sync")
@RequiredArgsConstructor
public class KakaoSyncController {

    private final BranchRepository branchRepository;
    private final KakaoSyncProperties kakaoSyncProperties;

    @GetMapping("/url")
    public ResponseEntity<ApiResponse<KakaoSyncUrlResponse>> getKakaoSyncUrl(
            @AuthenticationPrincipal CustomUserPrincipal principal) {
        Long branchSeq = principal.getSelectedBranchSeq();

        Branch branch = branchRepository.findById(branchSeq)
                .orElseThrow(() -> new EntityNotFoundException("지점"));

        String kakaoSyncUrl = kakaoSyncProperties.getBaseUrl()
                + "?query=" + URLEncoder.encode("state=" + branchSeq, StandardCharsets.UTF_8);

        KakaoSyncUrlResponse response = KakaoSyncUrlResponse.builder()
                .kakaoSyncUrl(kakaoSyncUrl)
                .branchName(branch.getBranchName())
                .build();

        return ResponseEntity.ok(ApiResponse.ok(response));
    }
}