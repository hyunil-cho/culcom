package com.culcom.controller.complex.survey;

import com.culcom.dto.ApiResponse;
import com.culcom.dto.complex.survey.*;
import com.culcom.mapper.SurveyQueryMapper;
import com.culcom.service.SurveyService;
import com.culcom.config.security.CustomUserPrincipal;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.*;

@RestController
@RequestMapping("/api/complex/survey")
@RequiredArgsConstructor
public class SurveyController {

    private final SurveyService surveyService;
    private final SurveyQueryMapper surveyQueryMapper;

    // ── 설문 제출 조회 ──

    @GetMapping("/submissions")
    public ResponseEntity<ApiResponse<Page<SurveySubmissionRow>>> listSubmissions(
            @AuthenticationPrincipal CustomUserPrincipal principal,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        Long branchSeq = principal.getSelectedBranchSeq();
        int offset = page * size;
        List<SurveySubmissionRow> list = surveyQueryMapper.selectSubmissions(branchSeq, offset, size);
        int total = surveyQueryMapper.countSubmissions(branchSeq);
        Page<SurveySubmissionRow> result = new PageImpl<>(list, PageRequest.of(page, size), total);
        return ResponseEntity.ok(ApiResponse.ok(result));
    }

    @GetMapping("/submissions/{seq}")
    public ResponseEntity<ApiResponse<SurveySubmissionDetailRow>> getSubmission(@PathVariable Long seq) {
        return ResponseEntity.ok(ApiResponse.ok(surveyService.getSubmissionDetail(seq)));
    }

    // ── 설문 템플릿 CRUD ──

    @GetMapping("/templates")
    public ResponseEntity<ApiResponse<List<SurveyTemplateResponse>>> listTemplates(
            @AuthenticationPrincipal CustomUserPrincipal principal) {
        return ResponseEntity.ok(ApiResponse.ok(surveyService.listTemplates(principal.getSelectedBranchSeq())));
    }

    @GetMapping("/templates/{seq}")
    public ResponseEntity<ApiResponse<SurveyTemplateResponse>> getTemplate(@PathVariable Long seq) {
        return ResponseEntity.ok(ApiResponse.ok(surveyService.getTemplate(seq)));
    }

    @PostMapping("/templates")
    public ResponseEntity<ApiResponse<SurveyTemplateResponse>> createTemplate(
            @Valid @RequestBody SurveyTemplateRequest req,
            @AuthenticationPrincipal CustomUserPrincipal principal) {
        return ResponseEntity.ok(ApiResponse.ok("설문지 생성 완료",
                surveyService.createTemplate(req, principal.getSelectedBranchSeq())));
    }

    @PutMapping("/templates/{seq}")
    public ResponseEntity<ApiResponse<SurveyTemplateResponse>> updateTemplate(
            @PathVariable Long seq, @RequestBody SurveyTemplateRequest req) {
        return ResponseEntity.ok(ApiResponse.ok("설문지가 수정되었습니다.",
                surveyService.updateTemplate(seq, req)));
    }

    @PutMapping("/templates/{seq}/status")
    public ResponseEntity<ApiResponse<SurveyTemplateResponse>> updateStatus(
            @PathVariable Long seq, @Valid @RequestBody SurveyStatusRequest req) {
        return ResponseEntity.ok(ApiResponse.ok("설문지 상태가 변경되었습니다.",
                surveyService.updateStatus(seq, req.getStatus())));
    }

    @PostMapping("/templates/{seq}/copy")
    public ResponseEntity<ApiResponse<SurveyTemplateResponse>> copyTemplate(
            @PathVariable Long seq, @AuthenticationPrincipal CustomUserPrincipal principal) {
        return ResponseEntity.ok(ApiResponse.ok("설문지가 복제되었습니다.",
                surveyService.copyTemplate(seq, principal.getSelectedBranchSeq())));
    }

    @DeleteMapping("/templates/{seq}")
    public ResponseEntity<ApiResponse<Void>> deleteTemplate(@PathVariable Long seq) {
        surveyService.deleteTemplate(seq);
        return ResponseEntity.ok(ApiResponse.ok("설문지가 삭제되었습니다.", null));
    }

    // ── 섹션 CRUD ──

    @GetMapping("/templates/{templateSeq}/sections")
    public ResponseEntity<ApiResponse<List<SurveySectionResponse>>> listSections(@PathVariable Long templateSeq) {
        return ResponseEntity.ok(ApiResponse.ok(surveyService.listSections(templateSeq)));
    }

    @PostMapping("/templates/{templateSeq}/sections")
    public ResponseEntity<ApiResponse<SurveySectionResponse>> createSection(
            @PathVariable Long templateSeq, @Valid @RequestBody SurveySectionRequest req) {
        return ResponseEntity.ok(ApiResponse.ok("섹션 추가 완료",
                surveyService.createSection(templateSeq, req)));
    }

    @PutMapping("/templates/{templateSeq}/sections/{sectionSeq}")
    public ResponseEntity<ApiResponse<SurveySectionResponse>> updateSection(
            @PathVariable Long templateSeq, @PathVariable Long sectionSeq, @Valid @RequestBody SurveySectionRequest req) {
        return ResponseEntity.ok(ApiResponse.ok("섹션이 수정되었습니다.",
                surveyService.updateSection(sectionSeq, req)));
    }

    @DeleteMapping("/templates/{templateSeq}/sections/{sectionSeq}")
    public ResponseEntity<ApiResponse<Void>> deleteSection(
            @PathVariable Long templateSeq, @PathVariable Long sectionSeq) {
        surveyService.deleteSection(sectionSeq);
        return ResponseEntity.ok(ApiResponse.ok("섹션이 삭제되었습니다.", null));
    }

    // ── 질문 CRUD ──

    @GetMapping("/templates/{templateSeq}/questions")
    public ResponseEntity<ApiResponse<List<SurveyQuestionResponse>>> listQuestions(@PathVariable Long templateSeq) {
        return ResponseEntity.ok(ApiResponse.ok(surveyService.listQuestions(templateSeq)));
    }

    @PostMapping("/templates/{templateSeq}/questions")
    public ResponseEntity<ApiResponse<SurveyQuestionResponse>> createQuestion(
            @PathVariable Long templateSeq, @Valid @RequestBody SurveyQuestionRequest req) {
        return ResponseEntity.ok(ApiResponse.ok("질문 추가 완료",
                surveyService.createQuestion(templateSeq, req)));
    }

    @PutMapping("/templates/{templateSeq}/questions/{questionSeq}")
    public ResponseEntity<ApiResponse<SurveyQuestionResponse>> updateQuestion(
            @PathVariable Long templateSeq, @PathVariable Long questionSeq, @Valid @RequestBody SurveyQuestionRequest req) {
        return ResponseEntity.ok(ApiResponse.ok("질문이 수정되었습니다.",
                surveyService.updateQuestion(questionSeq, req)));
    }

    @DeleteMapping("/templates/{templateSeq}/questions/{questionSeq}")
    public ResponseEntity<ApiResponse<Void>> deleteQuestion(
            @PathVariable Long templateSeq, @PathVariable Long questionSeq) {
        surveyService.deleteQuestion(questionSeq);
        return ResponseEntity.ok(ApiResponse.ok("질문이 삭제되었습니다.", null));
    }

    @PutMapping("/templates/{templateSeq}/questions/reorder")
    public ResponseEntity<ApiResponse<List<SurveyQuestionResponse>>> reorderQuestions(
            @PathVariable Long templateSeq, @RequestBody QuestionReorderRequest req) {
        return ResponseEntity.ok(ApiResponse.ok("질문 순서가 변경되었습니다.",
                surveyService.reorderQuestions(req)));
    }

    // ── 선택지 CRUD ──

    @GetMapping("/templates/{templateSeq}/options")
    public ResponseEntity<ApiResponse<List<SurveyOptionResponse>>> listOptions(
            @PathVariable Long templateSeq,
            @RequestParam(required = false) Long questionSeq) {
        return ResponseEntity.ok(ApiResponse.ok(surveyService.listOptions(templateSeq, questionSeq)));
    }

    @PostMapping("/templates/{templateSeq}/options")
    public ResponseEntity<ApiResponse<SurveyOptionResponse>> createOption(
            @PathVariable Long templateSeq, @Valid @RequestBody SurveyOptionRequest req) {
        return ResponseEntity.ok(ApiResponse.ok("선택지 추가 완료",
                surveyService.createOption(templateSeq, req)));
    }

    @PutMapping("/templates/{templateSeq}/options/reorder")
    public ResponseEntity<ApiResponse<List<SurveyOptionResponse>>> reorderOptions(
            @PathVariable Long templateSeq, @RequestBody OptionReorderRequest req) {
        return ResponseEntity.ok(ApiResponse.ok("선택지 순서가 변경되었습니다.",
                surveyService.reorderOptions(req)));
    }

    @DeleteMapping("/templates/{templateSeq}/options/{optionSeq}")
    public ResponseEntity<ApiResponse<Void>> deleteOption(
            @PathVariable Long templateSeq, @PathVariable Long optionSeq) {
        surveyService.deleteOption(optionSeq);
        return ResponseEntity.ok(ApiResponse.ok("선택지가 삭제되었습니다.", null));
    }
}
