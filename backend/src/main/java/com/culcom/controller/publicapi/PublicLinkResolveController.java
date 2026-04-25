package com.culcom.controller.publicapi;

import com.culcom.dto.ApiResponse;
import com.culcom.dto.publiclink.PublicLinkResolveResponse;
import com.culcom.service.PublicLinkService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

/**
 * 공개 단축 링크 resolve API. SecurityConfig 의 `/api/public/**` permitAll 규칙으로 인증 불필요.
 */
@RestController
@RequestMapping("/api/public/links")
@RequiredArgsConstructor
public class PublicLinkResolveController {

    private final PublicLinkService publicLinkService;

    @GetMapping("/{code}")
    public ResponseEntity<ApiResponse<PublicLinkResolveResponse>> resolve(@PathVariable String code) {
        return ResponseEntity.ok(ApiResponse.ok(publicLinkService.resolve(code)));
    }
}
