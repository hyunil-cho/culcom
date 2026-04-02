package com.culcom.controller.kakaosync;

import com.culcom.config.KakaoSyncProperties;
import com.culcom.dto.ApiResponse;
import com.culcom.dto.kakaosync.KakaoSyncUrlResponse;
import com.culcom.entity.Branch;
import com.culcom.repository.BranchRepository;
import com.culcom.service.AuthService;
import jakarta.servlet.http.HttpSession;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;

@RestController
@RequestMapping("/api/kakao-sync")
@RequiredArgsConstructor
public class KakaoSyncController {

    private final AuthService authService;
    private final BranchRepository branchRepository;
    private final KakaoSyncProperties kakaoSyncProperties;

    @GetMapping("/url")
    public ResponseEntity<ApiResponse<KakaoSyncUrlResponse>> getKakaoSyncUrl(HttpSession session) {
        Long branchSeq = authService.getSessionBranchSeq(session);

        Branch branch = branchRepository.findById(branchSeq)
                .orElseThrow(() -> new RuntimeException("지점을 찾을 수 없습니다."));

        String kakaoSyncUrl = kakaoSyncProperties.getBaseUrl()
                + "?query=" + URLEncoder.encode("state=" + branchSeq, StandardCharsets.UTF_8);

        KakaoSyncUrlResponse response = KakaoSyncUrlResponse.builder()
                .kakaoSyncUrl(kakaoSyncUrl)
                .branchName(branch.getBranchName())
                .build();

        return ResponseEntity.ok(ApiResponse.ok(response));
    }
}