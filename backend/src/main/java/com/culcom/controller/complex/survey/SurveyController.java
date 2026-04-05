package com.culcom.controller.complex.survey;

import com.culcom.dto.ApiResponse;
import com.culcom.dto.complex.survey.*;
import com.culcom.entity.survey.SurveyTemplate;
import com.culcom.entity.survey.SurveyTemplateOption;
import com.culcom.entity.survey.SurveyTemplateQuestion;
import com.culcom.entity.survey.SurveyTemplateSection;
import com.culcom.entity.enums.InputType;
import com.culcom.entity.enums.SurveyStatus;
import com.culcom.repository.*;
import com.culcom.config.security.CustomUserPrincipal;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/complex/survey")
@RequiredArgsConstructor
public class SurveyController {

    private final SurveyTemplateRepository templateRepository;
    private final SurveyTemplateSectionRepository sectionRepository;
    private final SurveyTemplateQuestionRepository questionRepository;
    private final SurveyTemplateOptionRepository optionRepository;
    private final BranchRepository branchRepository;

    // ── 설문 템플릿 CRUD ──

    @GetMapping("/templates")
    public ResponseEntity<ApiResponse<List<SurveyTemplateResponse>>> listTemplates(
            @AuthenticationPrincipal CustomUserPrincipal principal) {
        Long branchSeq = principal.getSelectedBranchSeq();
        List<SurveyTemplate> templates = templateRepository.findByBranchSeqOrderByCreatedDateDesc(branchSeq);
        List<SurveyTemplateResponse> responses = templates.stream()
                .map(t -> SurveyTemplateResponse.from(t, optionRepository.countByTemplateSeq(t.getSeq())))
                .collect(Collectors.toList());
        return ResponseEntity.ok(ApiResponse.ok(responses));
    }

    @GetMapping("/templates/{seq}")
    public ResponseEntity<ApiResponse<SurveyTemplateResponse>> getTemplate(@PathVariable Long seq) {
        return templateRepository.findById(seq)
                .map(t -> ResponseEntity.ok(ApiResponse.ok(
                        SurveyTemplateResponse.from(t, optionRepository.countByTemplateSeq(t.getSeq())))))
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping("/templates")
    public ResponseEntity<ApiResponse<SurveyTemplateResponse>> createTemplate(
            @RequestBody SurveyTemplateRequest req,
            @AuthenticationPrincipal CustomUserPrincipal principal) {
        Long branchSeq = principal.getSelectedBranchSeq();
        SurveyTemplate entity = SurveyTemplate.builder()
                .name(req.getName())
                .description(req.getDescription())
                .build();
        branchRepository.findById(branchSeq).ifPresent(entity::setBranch);
        SurveyTemplate saved = templateRepository.save(entity);
        return ResponseEntity.ok(ApiResponse.ok("설문지 생성 완료", SurveyTemplateResponse.from(saved)));
    }

    @PutMapping("/templates/{seq}")
    public ResponseEntity<ApiResponse<SurveyTemplateResponse>> updateTemplate(
            @PathVariable Long seq, @RequestBody SurveyTemplateRequest req) {
        return templateRepository.findById(seq).map(t -> {
            if (req.getName() != null) t.setName(req.getName());
            if (req.getDescription() != null) t.setDescription(req.getDescription());
            t.setLastUpdateDate(LocalDateTime.now());
            SurveyTemplate saved = templateRepository.save(t);
            return ResponseEntity.ok(ApiResponse.ok("설문지가 수정되었습니다.",
                    SurveyTemplateResponse.from(saved, optionRepository.countByTemplateSeq(saved.getSeq()))));
        }).orElse(ResponseEntity.notFound().build());
    }

    @PutMapping("/templates/{seq}/status")
    public ResponseEntity<ApiResponse<SurveyTemplateResponse>> updateStatus(
            @PathVariable Long seq, @RequestBody Map<String, String> body) {
        return templateRepository.findById(seq).map(t -> {
            String statusStr = body.get("status");
            if (statusStr == null) {
                return ResponseEntity.badRequest().body(ApiResponse.<SurveyTemplateResponse>error("상태 값이 필요합니다."));
            }
            t.setStatus(SurveyStatus.valueOf(statusStr));
            SurveyTemplate saved = templateRepository.save(t);
            return ResponseEntity.ok(ApiResponse.ok("설문지 상태가 변경되었습니다.",
                    SurveyTemplateResponse.from(saved, optionRepository.countByTemplateSeq(saved.getSeq()))));
        }).orElse(ResponseEntity.notFound().build());
    }

    @PostMapping("/templates/{seq}/copy")
    @Transactional
    public ResponseEntity<ApiResponse<SurveyTemplateResponse>> copyTemplate(
            @PathVariable Long seq, @AuthenticationPrincipal CustomUserPrincipal principal) {
        return templateRepository.findById(seq).map(source -> {
            Long branchSeq = principal.getSelectedBranchSeq();

            SurveyTemplate copy = SurveyTemplate.builder()
                    .name(source.getName() + " (복사본)")
                    .description(source.getDescription())
                    .build();
            branchRepository.findById(branchSeq).ifPresent(copy::setBranch);
            SurveyTemplate savedTemplate = templateRepository.save(copy);

            // 섹션 복제
            Map<Long, SurveyTemplateSection> sectionMap = new HashMap<>();
            for (SurveyTemplateSection s : sectionRepository.findByTemplateSeqOrderBySortOrder(seq)) {
                SurveyTemplateSection sCopy = SurveyTemplateSection.builder()
                        .title(s.getTitle()).sortOrder(s.getSortOrder()).build();
                sCopy.setTemplate(savedTemplate);
                sectionMap.put(s.getSeq(), sectionRepository.save(sCopy));
            }

            // 질문 복제
            Map<Long, SurveyTemplateQuestion> questionMap = new HashMap<>();
            for (SurveyTemplateQuestion q : questionRepository.findByTemplateSeqOrderBySortOrder(seq)) {
                SurveyTemplateQuestion qCopy = SurveyTemplateQuestion.builder()
                        .questionKey(q.getQuestionKey()).title(q.getTitle()).description(q.getDescription())
                        .inputType(q.getInputType()).isGrouped(q.getIsGrouped()).groups(q.getGroups())
                        .sortOrder(q.getSortOrder()).required(q.getRequired()).build();
                qCopy.setTemplate(savedTemplate);
                if (q.getSection() != null) {
                    SurveyTemplateSection mappedSection = sectionMap.get(q.getSection().getSeq());
                    if (mappedSection != null) qCopy.setSection(mappedSection);
                }
                questionMap.put(q.getSeq(), questionRepository.save(qCopy));
            }

            // 선택지 복제
            for (SurveyTemplateOption o : optionRepository.findByTemplateSeqOrderBySortOrder(seq)) {
                SurveyTemplateOption oCopy = SurveyTemplateOption.builder()
                        .groupName(o.getGroupName()).label(o.getLabel()).sortOrder(o.getSortOrder()).build();
                oCopy.setTemplate(savedTemplate);
                if (o.getQuestion() != null) {
                    SurveyTemplateQuestion mappedQuestion = questionMap.get(o.getQuestion().getSeq());
                    if (mappedQuestion != null) oCopy.setQuestion(mappedQuestion);
                }
                optionRepository.save(oCopy);
            }

            return ResponseEntity.ok(ApiResponse.ok("설문지가 복제되었습니다.",
                    SurveyTemplateResponse.from(savedTemplate, optionRepository.countByTemplateSeq(savedTemplate.getSeq()))));
        }).orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/templates/{seq}")
    @Transactional
    public ResponseEntity<ApiResponse<Void>> deleteTemplate(@PathVariable Long seq) {
        if (!templateRepository.existsById(seq)) return ResponseEntity.notFound().build();
        optionRepository.deleteByTemplateSeq(seq);
        questionRepository.deleteByTemplateSeq(seq);
        sectionRepository.deleteByTemplateSeq(seq);
        templateRepository.deleteById(seq);
        return ResponseEntity.ok(ApiResponse.ok("설문지가 삭제되었습니다.", null));
    }

    // ── 섹션 CRUD ──

    @GetMapping("/templates/{templateSeq}/sections")
    public ResponseEntity<ApiResponse<List<SurveySectionResponse>>> listSections(@PathVariable Long templateSeq) {
        return ResponseEntity.ok(ApiResponse.ok(
                sectionRepository.findByTemplateSeqOrderBySortOrder(templateSeq).stream()
                        .map(SurveySectionResponse::from).collect(Collectors.toList())));
    }

    @PostMapping("/templates/{templateSeq}/sections")
    public ResponseEntity<ApiResponse<SurveySectionResponse>> createSection(
            @PathVariable Long templateSeq, @RequestBody SurveySectionRequest req) {
        int maxOrder = sectionRepository.findMaxSortOrder(templateSeq);
        SurveyTemplateSection entity = SurveyTemplateSection.builder()
                .title(req.getTitle()).sortOrder(maxOrder + 1).build();
        templateRepository.findById(templateSeq).ifPresent(entity::setTemplate);
        return ResponseEntity.ok(ApiResponse.ok("섹션 추가 완료", SurveySectionResponse.from(sectionRepository.save(entity))));
    }

    @PutMapping("/templates/{templateSeq}/sections/{sectionSeq}")
    public ResponseEntity<ApiResponse<SurveySectionResponse>> updateSection(
            @PathVariable Long templateSeq, @PathVariable Long sectionSeq, @RequestBody SurveySectionRequest req) {
        return sectionRepository.findById(sectionSeq).map(s -> {
            if (req.getTitle() != null) s.setTitle(req.getTitle());
            return ResponseEntity.ok(ApiResponse.ok("섹션이 수정되었습니다.", SurveySectionResponse.from(sectionRepository.save(s))));
        }).orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/templates/{templateSeq}/sections/{sectionSeq}")
    @Transactional
    public ResponseEntity<ApiResponse<Void>> deleteSection(
            @PathVariable Long templateSeq, @PathVariable Long sectionSeq) {
        if (!sectionRepository.existsById(sectionSeq)) return ResponseEntity.notFound().build();
        List<SurveyTemplateQuestion> questions = questionRepository.findBySectionSeqOrderBySortOrder(sectionSeq);
        for (SurveyTemplateQuestion q : questions) {
            optionRepository.deleteByQuestionSeq(q.getSeq());
        }
        questionRepository.deleteBySectionSeq(sectionSeq);
        sectionRepository.deleteById(sectionSeq);
        return ResponseEntity.ok(ApiResponse.ok("섹션이 삭제되었습니다.", null));
    }

    // ── 질문 CRUD ──

    @GetMapping("/templates/{templateSeq}/questions")
    public ResponseEntity<ApiResponse<List<SurveyQuestionResponse>>> listQuestions(@PathVariable Long templateSeq) {
        return ResponseEntity.ok(ApiResponse.ok(
                questionRepository.findByTemplateSeqOrderBySortOrder(templateSeq).stream()
                        .map(SurveyQuestionResponse::from).collect(Collectors.toList())));
    }

    @PostMapping("/templates/{templateSeq}/questions")
    public ResponseEntity<ApiResponse<SurveyQuestionResponse>> createQuestion(
            @PathVariable Long templateSeq, @RequestBody SurveyQuestionRequest req) {
        int maxOrder = questionRepository.findMaxSortOrder(templateSeq);
        SurveyTemplateQuestion entity = SurveyTemplateQuestion.builder()
                .questionKey(req.getQuestionKey())
                .title(req.getTitle()).description(req.getDescription())
                .inputType(req.getInputType() != null ? req.getInputType() : InputType.radio)
                .isGrouped(req.getIsGrouped() != null && req.getIsGrouped())
                .groups(req.getGroups())
                .sortOrder(maxOrder + 1)
                .required(req.getRequired() != null && req.getRequired())
                .build();
        templateRepository.findById(templateSeq).ifPresent(entity::setTemplate);
        if (req.getSectionSeq() != null) sectionRepository.findById(req.getSectionSeq()).ifPresent(entity::setSection);
        return ResponseEntity.ok(ApiResponse.ok("질문 추가 완료", SurveyQuestionResponse.from(questionRepository.save(entity))));
    }

    @PutMapping("/templates/{templateSeq}/questions/{questionSeq}")
    public ResponseEntity<ApiResponse<SurveyQuestionResponse>> updateQuestion(
            @PathVariable Long templateSeq, @PathVariable Long questionSeq, @RequestBody SurveyQuestionRequest req) {
        return questionRepository.findById(questionSeq).map(q -> {
            if (req.getQuestionKey() != null) q.setQuestionKey(req.getQuestionKey());
            if (req.getTitle() != null) q.setTitle(req.getTitle());
            if (req.getInputType() != null) q.setInputType(req.getInputType());
            if (req.getIsGrouped() != null) q.setIsGrouped(req.getIsGrouped());
            if (req.getGroups() != null) q.setGroups(req.getGroups());
            if (req.getRequired() != null) q.setRequired(req.getRequired());
            if (req.getSectionSeq() != null) sectionRepository.findById(req.getSectionSeq()).ifPresent(q::setSection);
            return ResponseEntity.ok(ApiResponse.ok("질문이 수정되었습니다.", SurveyQuestionResponse.from(questionRepository.save(q))));
        }).orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/templates/{templateSeq}/questions/{questionSeq}")
    @Transactional
    public ResponseEntity<ApiResponse<Void>> deleteQuestion(
            @PathVariable Long templateSeq, @PathVariable Long questionSeq) {
        return questionRepository.findById(questionSeq).map(q -> {
            optionRepository.deleteByQuestionSeq(questionSeq);
            questionRepository.delete(q);
            return ResponseEntity.ok(ApiResponse.<Void>ok("질문이 삭제되었습니다.", null));
        }).orElse(ResponseEntity.notFound().build());
    }

    @PutMapping("/templates/{templateSeq}/questions/reorder")
    @Transactional
    public ResponseEntity<ApiResponse<List<SurveyQuestionResponse>>> reorderQuestions(
            @PathVariable Long templateSeq, @RequestBody QuestionReorderRequest req) {
        List<SurveyQuestionResponse> results = new ArrayList<>();
        for (QuestionReorderRequest.QuestionReorderItem item : req.getItems()) {
            questionRepository.findById(item.getSeq()).ifPresent(q -> {
                q.setSortOrder(item.getSortOrder());
                if (item.getNewQuestionKey() != null) {
                    q.setQuestionKey(item.getNewQuestionKey());
                }
                results.add(SurveyQuestionResponse.from(questionRepository.save(q)));
            });
        }
        return ResponseEntity.ok(ApiResponse.ok("질문 순서가 변경되었습니다.", results));
    }

    // ── 선택지 CRUD ──

    @GetMapping("/templates/{templateSeq}/options")
    public ResponseEntity<ApiResponse<List<SurveyOptionResponse>>> listOptions(
            @PathVariable Long templateSeq,
            @RequestParam(required = false) Long questionSeq) {
        List<SurveyTemplateOption> options;
        if (questionSeq != null) {
            options = optionRepository.findByQuestionSeqOrderBySortOrder(questionSeq);
        } else {
            options = optionRepository.findByTemplateSeqOrderBySortOrder(templateSeq);
        }
        return ResponseEntity.ok(ApiResponse.ok(
                options.stream().map(SurveyOptionResponse::from).collect(Collectors.toList())));
    }

    @PostMapping("/templates/{templateSeq}/options")
    public ResponseEntity<ApiResponse<SurveyOptionResponse>> createOption(
            @PathVariable Long templateSeq, @RequestBody SurveyOptionRequest req) {
        int maxOrder = optionRepository.findMaxSortOrder(
                req.getQuestionSeq(), req.getGroupName() != null ? req.getGroupName() : "");
        SurveyTemplateOption entity = SurveyTemplateOption.builder()
                .groupName(req.getGroupName() != null ? req.getGroupName() : "")
                .label(req.getLabel())
                .sortOrder(maxOrder + 1)
                .build();
        templateRepository.findById(templateSeq).ifPresent(entity::setTemplate);
        questionRepository.findById(req.getQuestionSeq()).ifPresent(entity::setQuestion);
        return ResponseEntity.ok(ApiResponse.ok("선택지 추가 완료", SurveyOptionResponse.from(optionRepository.save(entity))));
    }

    @DeleteMapping("/templates/{templateSeq}/options/{optionSeq}")
    public ResponseEntity<ApiResponse<Void>> deleteOption(
            @PathVariable Long templateSeq, @PathVariable Long optionSeq) {
        if (!optionRepository.existsById(optionSeq)) return ResponseEntity.notFound().build();
        optionRepository.deleteById(optionSeq);
        return ResponseEntity.ok(ApiResponse.ok("선택지가 삭제되었습니다.", null));
    }
}
