package com.culcom.controller.complex;

import com.culcom.dto.ApiResponse;
import com.culcom.dto.complex.*;
import com.culcom.entity.SurveyTemplate;
import com.culcom.entity.SurveyTemplateOption;
import com.culcom.entity.SurveyTemplateQuestion;
import com.culcom.repository.BranchRepository;
import com.culcom.repository.SurveyTemplateOptionRepository;
import com.culcom.repository.SurveyTemplateQuestionRepository;
import com.culcom.repository.SurveyTemplateRepository;
import com.culcom.config.security.CustomUserPrincipal;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/complex/survey")
@RequiredArgsConstructor
public class SurveyController {

    private final SurveyTemplateRepository templateRepository;
    private final SurveyTemplateQuestionRepository questionRepository;
    private final SurveyTemplateOptionRepository optionRepository;
    private final BranchRepository branchRepository;

    @GetMapping("/templates")
    public ResponseEntity<ApiResponse<List<SurveyTemplateResponse>>> listTemplates(@AuthenticationPrincipal CustomUserPrincipal principal) {
        Long branchSeq = principal.getSelectedBranchSeq();
        List<SurveyTemplateResponse> responses = templateRepository.findByBranchSeqOrderByCreatedDateDesc(branchSeq).stream()
                .map(SurveyTemplateResponse::from)
                .collect(Collectors.toList());
        return ResponseEntity.ok(ApiResponse.ok(responses));
    }

    @GetMapping("/templates/{seq}")
    public ResponseEntity<ApiResponse<SurveyTemplateResponse>> getTemplate(@PathVariable Long seq) {
        return templateRepository.findById(seq)
                .map(t -> ResponseEntity.ok(ApiResponse.ok(SurveyTemplateResponse.from(t))))
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping("/templates")
    public ResponseEntity<ApiResponse<SurveyTemplateResponse>> createTemplate(
            @RequestBody SurveyTemplateRequest req, @AuthenticationPrincipal CustomUserPrincipal principal) {
        Long branchSeq = principal.getSelectedBranchSeq();
        SurveyTemplate entity = SurveyTemplate.builder()
                .name(req.getName())
                .description(req.getDescription())
                .build();
        branchRepository.findById(branchSeq).ifPresent(entity::setBranch);
        return ResponseEntity.ok(ApiResponse.ok("설문지 생성 완료", SurveyTemplateResponse.from(templateRepository.save(entity))));
    }

    @GetMapping("/templates/{templateSeq}/questions")
    public ResponseEntity<ApiResponse<List<SurveyQuestionResponse>>> listQuestions(
            @PathVariable Long templateSeq) {
        List<SurveyQuestionResponse> responses = questionRepository.findByTemplateSeqOrderBySortOrder(templateSeq).stream()
                .map(SurveyQuestionResponse::from)
                .collect(Collectors.toList());
        return ResponseEntity.ok(ApiResponse.ok(responses));
    }

    @PostMapping("/templates/{templateSeq}/questions")
    public ResponseEntity<ApiResponse<SurveyQuestionResponse>> createQuestion(
            @PathVariable Long templateSeq, @RequestBody SurveyQuestionRequest req) {
        SurveyTemplateQuestion entity = SurveyTemplateQuestion.builder()
                .questionKey(req.getQuestionKey())
                .title(req.getTitle())
                .description(req.getDescription())
                .section(req.getSection())
                .sectionTitle(req.getSectionTitle())
                .showDivider(req.getShowDivider())
                .inputType(req.getInputType())
                .isGrouped(req.getIsGrouped())
                .groups(req.getGroups())
                .sortOrder(req.getSortOrder())
                .build();
        templateRepository.findById(templateSeq).ifPresent(entity::setTemplate);
        return ResponseEntity.ok(ApiResponse.ok("질문 추가 완료", SurveyQuestionResponse.from(questionRepository.save(entity))));
    }

    @GetMapping("/templates/{templateSeq}/options")
    public ResponseEntity<ApiResponse<List<SurveyOptionResponse>>> listOptions(
            @PathVariable Long templateSeq,
            @RequestParam(required = false) String questionKey) {
        List<SurveyTemplateOption> options;
        if (questionKey != null) {
            options = optionRepository.findByTemplateSeqAndQuestionKeyOrderBySortOrder(templateSeq, questionKey);
        } else {
            options = optionRepository.findByTemplateSeqOrderBySortOrder(templateSeq);
        }
        List<SurveyOptionResponse> responses = options.stream()
                .map(SurveyOptionResponse::from)
                .collect(Collectors.toList());
        return ResponseEntity.ok(ApiResponse.ok(responses));
    }

    @PostMapping("/templates/{templateSeq}/options")
    public ResponseEntity<ApiResponse<SurveyOptionResponse>> createOption(
            @PathVariable Long templateSeq, @RequestBody SurveyOptionRequest req) {
        SurveyTemplateOption entity = SurveyTemplateOption.builder()
                .questionKey(req.getQuestionKey())
                .groupName(req.getGroupName())
                .label(req.getLabel())
                .sortOrder(req.getSortOrder())
                .build();
        templateRepository.findById(templateSeq).ifPresent(entity::setTemplate);
        return ResponseEntity.ok(ApiResponse.ok("선택지 추가 완료", SurveyOptionResponse.from(optionRepository.save(entity))));
    }
}
