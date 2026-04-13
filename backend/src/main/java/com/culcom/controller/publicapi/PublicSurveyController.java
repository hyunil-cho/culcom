package com.culcom.controller.publicapi;

import com.culcom.dto.ApiResponse;
import com.culcom.dto.publicapi.SurveySubmitRequest;
import com.culcom.service.PublicSurveyService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/public/survey")
@RequiredArgsConstructor
public class PublicSurveyController {

    private final PublicSurveyService publicSurveyService;

    @PostMapping("/submit")
    public ResponseEntity<ApiResponse<Void>> submit(@RequestBody SurveySubmitRequest req) {
        if (req.getName() == null || req.getName().isBlank()) {
            return ResponseEntity.badRequest().body(ApiResponse.error("이름은 필수입니다."));
        }
        if (req.getPhoneNumber() == null || req.getPhoneNumber().isBlank()) {
            return ResponseEntity.badRequest().body(ApiResponse.error("연락처는 필수입니다."));
        }

        publicSurveyService.submit(req);
        return ResponseEntity.ok(ApiResponse.ok(null));
    }
}
