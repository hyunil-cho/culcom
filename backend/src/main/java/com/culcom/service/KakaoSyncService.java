package com.culcom.service;

import com.culcom.config.KakaoSyncProperties;
import com.culcom.dto.kakaosync.KakaoSyncUrlResponse;
import com.culcom.entity.branch.Branch;
import com.culcom.exception.EntityNotFoundException;
import com.culcom.repository.BranchRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;

@Service
@RequiredArgsConstructor
public class KakaoSyncService {

    private final BranchRepository branchRepository;
    private final KakaoSyncProperties kakaoSyncProperties;

    public KakaoSyncUrlResponse getKakaoSyncUrl(Long branchSeq) {
        Branch branch = branchRepository.findById(branchSeq)
                .orElseThrow(() -> new EntityNotFoundException("지점"));

        String kakaoSyncUrl = kakaoSyncProperties.getBaseUrl()
                + "?query=" + URLEncoder.encode("state=" + branchSeq, StandardCharsets.UTF_8);

        return KakaoSyncUrlResponse.builder()
                .kakaoSyncUrl(kakaoSyncUrl)
                .branchName(branch.getBranchName())
                .build();
    }
}
