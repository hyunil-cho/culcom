package com.culcom.controller.publicapi;

import com.culcom.dto.ApiResponse;
import com.culcom.dto.publicapi.RefundSurveySubmitRequest;
import com.culcom.service.PublicRefundSurveyService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/public/refund-survey")
@RequiredArgsConstructor
public class PublicRefundSurveyController {

    private final PublicRefundSurveyService publicRefundSurveyService;

    @PostMapping("/submit")
    public ResponseEntity<ApiResponse<Void>> submit(@RequestBody RefundSurveySubmitRequest req) {
        try {
            publicRefundSurveyService.submit(req);
            return ResponseEntity.ok(ApiResponse.ok(null));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage()));
        }
    }
}
