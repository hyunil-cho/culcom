package com.culcom.controller.publicapi;

import com.culcom.dto.ApiResponse;
import com.culcom.dto.publicapi.SurveySubmitRequest;
import com.culcom.entity.survey.SurveySubmission;
import com.culcom.entity.survey.SurveyTemplate;
import com.culcom.repository.SurveySubmissionRepository;
import com.culcom.repository.SurveyTemplateRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/public/survey")
@RequiredArgsConstructor
public class PublicSurveyController {

    private final SurveySubmissionRepository submissionRepository;
    private final SurveyTemplateRepository templateRepository;
    private final ObjectMapper objectMapper;

    @PostMapping("/submit")
    public ResponseEntity<ApiResponse<Void>> submit(@RequestBody SurveySubmitRequest req) {
        if (req.getName() == null || req.getName().isBlank()) {
            return ResponseEntity.badRequest().body(ApiResponse.error("이름은 필수입니다."));
        }
        if (req.getPhoneNumber() == null || req.getPhoneNumber().isBlank()) {
            return ResponseEntity.badRequest().body(ApiResponse.error("연락처는 필수입니다."));
        }

        SurveyTemplate template = templateRepository.findById(req.getTemplateSeq())
                .orElse(null);
        if (template == null) {
            return ResponseEntity.badRequest().body(ApiResponse.error("설문지를 찾을 수 없습니다."));
        }

        String answersJson;
        try {
            answersJson = req.getAnswers() != null ? objectMapper.writeValueAsString(req.getAnswers()) : "{}";
        } catch (Exception e) {
            answersJson = "{}";
        }

        SurveySubmission submission = SurveySubmission.builder()
                .branchSeq(template.getBranch().getSeq())
                .templateSeq(template.getSeq())
                .reservationSeq(req.getReservationSeq())
                .name(req.getName().trim())
                .phoneNumber(req.getPhoneNumber().replaceAll("[^0-9]", ""))
                .gender(req.getGender())
                .location(req.getLocation())
                .ageGroup(req.getAgeGroup())
                .occupation(req.getOccupation())
                .adSource(req.getAdSource())
                .answers(answersJson)
                .build();

        submissionRepository.save(submission);
        return ResponseEntity.ok(ApiResponse.ok(null));
    }
}
