package com.culcom.controller.complex.publiclink;

import com.culcom.dto.ApiResponse;
import com.culcom.dto.publiclink.*;
import com.culcom.service.PublicLinkService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

/**
 * 관리자 인증 하에 공개 단축 링크를 발급하는 컨트롤러.
 *
 * 일반 3종(멤버십·연기·환불) 은 `POST /api/complex/public-links`,
 * 양도는 TransferRequest 생성과 함께 한 트랜잭션으로 처리해야 하므로 별도
 * `POST /api/complex/public-links/transfer` 엔드포인트로 분리한다.
 */
@RestController
@RequestMapping("/api/complex/public-links")
@RequiredArgsConstructor
public class PublicLinkController {

    private final PublicLinkService publicLinkService;

    @PostMapping
    public ResponseEntity<ApiResponse<PublicLinkCreateResponse>> create(
            @Valid @RequestBody PublicLinkCreateRequest req) {
        return ResponseEntity.ok(ApiResponse.ok(publicLinkService.create(req)));
    }

    @PostMapping("/transfer")
    public ResponseEntity<ApiResponse<PublicLinkTransferCreateResponse>> createForTransfer(
            @Valid @RequestBody PublicLinkCreateTransferRequest req) {
        return ResponseEntity.ok(ApiResponse.ok(publicLinkService.createForTransfer(req)));
    }
}
