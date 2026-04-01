package com.culcom.controller;

import com.culcom.dto.ApiResponse;
import com.culcom.entity.SurveyTemplate;
import com.culcom.entity.SurveyTemplateOption;
import com.culcom.entity.SurveyTemplateQuestion;
import com.culcom.repository.BranchRepository;
import com.culcom.repository.SurveyTemplateOptionRepository;
import com.culcom.repository.SurveyTemplateQuestionRepository;
import com.culcom.repository.SurveyTemplateRepository;
import com.culcom.service.AuthService;
import jakarta.servlet.http.HttpSession;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/complex/survey")
@RequiredArgsConstructor
public class SurveyController {

    private final SurveyTemplateRepository templateRepository;
    private final SurveyTemplateQuestionRepository questionRepository;
    private final SurveyTemplateOptionRepository optionRepository;
    private final BranchRepository branchRepository;
    private final AuthService authService;

    @GetMapping("/templates")
    public ResponseEntity<ApiResponse<List<SurveyTemplate>>> listTemplates(HttpSession session) {
        Long branchSeq = authService.getSessionBranchSeq(session);
        return ResponseEntity.ok(ApiResponse.ok(templateRepository.findByBranchSeqOrderByCreatedDateDesc(branchSeq)));
    }

    @GetMapping("/templates/{seq}")
    public ResponseEntity<ApiResponse<SurveyTemplate>> getTemplate(@PathVariable Long seq) {
        return templateRepository.findById(seq)
                .map(t -> ResponseEntity.ok(ApiResponse.ok(t)))
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping("/templates")
    public ResponseEntity<ApiResponse<SurveyTemplate>> createTemplate(
            @RequestBody SurveyTemplate template, HttpSession session) {
        Long branchSeq = authService.getSessionBranchSeq(session);
        branchRepository.findById(branchSeq).ifPresent(template::setBranch);
        return ResponseEntity.ok(ApiResponse.ok("설문지 생성 완료", templateRepository.save(template)));
    }

    @GetMapping("/templates/{templateSeq}/questions")
    public ResponseEntity<ApiResponse<List<SurveyTemplateQuestion>>> listQuestions(
            @PathVariable Long templateSeq) {
        return ResponseEntity.ok(ApiResponse.ok(questionRepository.findByTemplateSeqOrderBySortOrder(templateSeq)));
    }

    @PostMapping("/templates/{templateSeq}/questions")
    public ResponseEntity<ApiResponse<SurveyTemplateQuestion>> createQuestion(
            @PathVariable Long templateSeq, @RequestBody SurveyTemplateQuestion question) {
        templateRepository.findById(templateSeq).ifPresent(question::setTemplate);
        return ResponseEntity.ok(ApiResponse.ok("질문 추가 완료", questionRepository.save(question)));
    }

    @GetMapping("/templates/{templateSeq}/options")
    public ResponseEntity<ApiResponse<List<SurveyTemplateOption>>> listOptions(
            @PathVariable Long templateSeq,
            @RequestParam(required = false) String questionKey) {
        if (questionKey != null) {
            return ResponseEntity.ok(ApiResponse.ok(
                    optionRepository.findByTemplateSeqAndQuestionKeyOrderBySortOrder(templateSeq, questionKey)));
        }
        return ResponseEntity.ok(ApiResponse.ok(optionRepository.findByTemplateSeqOrderBySortOrder(templateSeq)));
    }

    @PostMapping("/templates/{templateSeq}/options")
    public ResponseEntity<ApiResponse<SurveyTemplateOption>> createOption(
            @PathVariable Long templateSeq, @RequestBody SurveyTemplateOption option) {
        templateRepository.findById(templateSeq).ifPresent(option::setTemplate);
        return ResponseEntity.ok(ApiResponse.ok("선택지 추가 완료", optionRepository.save(option)));
    }
}
