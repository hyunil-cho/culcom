package com.culcom.service;

import com.culcom.dto.complex.survey.*;
import com.culcom.entity.enums.InputType;
import com.culcom.entity.enums.SurveyStatus;
import com.culcom.entity.survey.*;
import com.culcom.exception.EntityNotFoundException;
import com.culcom.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class SurveyService {

    private final SurveyTemplateRepository templateRepository;
    private final SurveyTemplateSectionRepository sectionRepository;
    private final SurveyTemplateQuestionRepository questionRepository;
    private final SurveyTemplateOptionRepository optionRepository;
    private final BranchRepository branchRepository;

    // ── 설문 템플릿 CRUD ──

    public List<SurveyTemplateResponse> listTemplates(Long branchSeq) {
        List<SurveyTemplate> templates = templateRepository.findByBranchSeqOrderByCreatedDateDesc(branchSeq);
        return templates.stream()
                .map(t -> SurveyTemplateResponse.from(t, optionRepository.countByTemplateSeq(t.getSeq())))
                .collect(Collectors.toList());
    }

    public SurveyTemplateResponse getTemplate(Long seq) {
        SurveyTemplate t = templateRepository.findById(seq)
                .orElseThrow(() -> new EntityNotFoundException("설문지"));
        return SurveyTemplateResponse.from(t, optionRepository.countByTemplateSeq(t.getSeq()));
    }

    @Transactional
    public SurveyTemplateResponse createTemplate(SurveyTemplateRequest req, Long branchSeq) {
        SurveyTemplate entity = SurveyTemplate.builder()
                .name(req.getName())
                .description(req.getDescription())
                .build();
        branchRepository.findById(branchSeq).ifPresent(entity::setBranch);
        return SurveyTemplateResponse.from(templateRepository.save(entity));
    }

    @Transactional
    public SurveyTemplateResponse updateTemplate(Long seq, SurveyTemplateRequest req) {
        SurveyTemplate t = templateRepository.findById(seq)
                .orElseThrow(() -> new EntityNotFoundException("설문지"));
        if (req.getName() != null) t.setName(req.getName());
        if (req.getDescription() != null) t.setDescription(req.getDescription());
        SurveyTemplate saved = templateRepository.save(t);
        return SurveyTemplateResponse.from(saved, optionRepository.countByTemplateSeq(saved.getSeq()));
    }

    @Transactional
    public SurveyTemplateResponse updateStatus(Long seq, String statusStr) {
        SurveyTemplate t = templateRepository.findById(seq)
                .orElseThrow(() -> new EntityNotFoundException("설문지"));
        t.setStatus(SurveyStatus.valueOf(statusStr));
        SurveyTemplate saved = templateRepository.save(t);
        return SurveyTemplateResponse.from(saved, optionRepository.countByTemplateSeq(saved.getSeq()));
    }

    @Transactional
    public void deleteTemplate(Long seq) {
        if (!templateRepository.existsById(seq)) {
            throw new EntityNotFoundException("설문지");
        }
        optionRepository.deleteByTemplateSeq(seq);
        questionRepository.deleteByTemplateSeq(seq);
        sectionRepository.deleteByTemplateSeq(seq);
        templateRepository.deleteById(seq);
    }

    // ── 섹션 CRUD ──

    public List<SurveySectionResponse> listSections(Long templateSeq) {
        return sectionRepository.findByTemplateSeqOrderBySortOrder(templateSeq).stream()
                .map(SurveySectionResponse::from).collect(Collectors.toList());
    }

    @Transactional
    public SurveySectionResponse createSection(Long templateSeq, SurveySectionRequest req) {
        int maxOrder = sectionRepository.findMaxSortOrder(templateSeq);
        SurveyTemplateSection entity = SurveyTemplateSection.builder()
                .title(req.getTitle()).sortOrder(maxOrder + 1).build();
        templateRepository.findById(templateSeq).ifPresent(entity::setTemplate);
        return SurveySectionResponse.from(sectionRepository.save(entity));
    }

    @Transactional
    public SurveySectionResponse updateSection(Long sectionSeq, SurveySectionRequest req) {
        SurveyTemplateSection s = sectionRepository.findById(sectionSeq)
                .orElseThrow(() -> new EntityNotFoundException("섹션"));
        if (req.getTitle() != null) s.setTitle(req.getTitle());
        return SurveySectionResponse.from(sectionRepository.save(s));
    }

    @Transactional
    public void deleteSection(Long sectionSeq) {
        if (!sectionRepository.existsById(sectionSeq)) {
            throw new EntityNotFoundException("섹션");
        }
        List<SurveyTemplateQuestion> questions = questionRepository.findBySectionSeqOrderBySortOrder(sectionSeq);
        for (SurveyTemplateQuestion q : questions) {
            optionRepository.deleteByQuestionSeq(q.getSeq());
        }
        questionRepository.deleteBySectionSeq(sectionSeq);
        sectionRepository.deleteById(sectionSeq);
    }

    // ── 질문 CRUD ──

    public List<SurveyQuestionResponse> listQuestions(Long templateSeq) {
        return questionRepository.findByTemplateSeqOrderBySortOrder(templateSeq).stream()
                .map(SurveyQuestionResponse::from).collect(Collectors.toList());
    }

    @Transactional
    public SurveyQuestionResponse createQuestion(Long templateSeq, SurveyQuestionRequest req) {
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
        return SurveyQuestionResponse.from(questionRepository.save(entity));
    }

    @Transactional
    public SurveyQuestionResponse updateQuestion(Long questionSeq, SurveyQuestionRequest req) {
        SurveyTemplateQuestion q = questionRepository.findById(questionSeq)
                .orElseThrow(() -> new EntityNotFoundException("질문"));
        if (req.getQuestionKey() != null) q.setQuestionKey(req.getQuestionKey());
        if (req.getTitle() != null) q.setTitle(req.getTitle());
        if (req.getInputType() != null) q.setInputType(req.getInputType());
        if (req.getIsGrouped() != null) q.setIsGrouped(req.getIsGrouped());
        if (req.getGroups() != null) q.setGroups(req.getGroups());
        if (req.getRequired() != null) q.setRequired(req.getRequired());
        if (req.getSectionSeq() != null) sectionRepository.findById(req.getSectionSeq()).ifPresent(q::setSection);
        return SurveyQuestionResponse.from(questionRepository.save(q));
    }

    @Transactional
    public void deleteQuestion(Long questionSeq) {
        SurveyTemplateQuestion q = questionRepository.findById(questionSeq)
                .orElseThrow(() -> new EntityNotFoundException("질문"));
        optionRepository.deleteByQuestionSeq(questionSeq);
        questionRepository.delete(q);
    }

    @Transactional
    public List<SurveyQuestionResponse> reorderQuestions(QuestionReorderRequest req) {
        List<Long> seqs = req.getItems().stream().map(QuestionReorderRequest.QuestionReorderItem::getSeq).toList();
        Map<Long, SurveyTemplateQuestion> questionMap = new HashMap<>();
        questionRepository.findAllById(seqs).forEach(q -> questionMap.put(q.getSeq(), q));

        for (QuestionReorderRequest.QuestionReorderItem item : req.getItems()) {
            SurveyTemplateQuestion q = questionMap.get(item.getSeq());
            if (q != null) {
                q.setSortOrder(item.getSortOrder());
                if (item.getNewQuestionKey() != null) q.setQuestionKey(item.getNewQuestionKey());
            }
        }
        List<SurveyTemplateQuestion> saved = questionRepository.saveAll(questionMap.values());
        return saved.stream().map(SurveyQuestionResponse::from).toList();
    }

    // ── 선택지 CRUD ──

    public List<SurveyOptionResponse> listOptions(Long templateSeq, Long questionSeq) {
        List<SurveyTemplateOption> options;
        if (questionSeq != null) {
            options = optionRepository.findByQuestionSeqOrderBySortOrder(questionSeq);
        } else {
            options = optionRepository.findByTemplateSeqOrderBySortOrder(templateSeq);
        }
        return options.stream().map(SurveyOptionResponse::from).collect(Collectors.toList());
    }

    @Transactional
    public SurveyOptionResponse createOption(Long templateSeq, SurveyOptionRequest req) {
        int maxOrder = optionRepository.findMaxSortOrder(
                req.getQuestionSeq(), req.getGroupName() != null ? req.getGroupName() : "");
        SurveyTemplateOption entity = SurveyTemplateOption.builder()
                .groupName(req.getGroupName() != null ? req.getGroupName() : "")
                .label(req.getLabel())
                .sortOrder(maxOrder + 1)
                .build();
        templateRepository.findById(templateSeq).ifPresent(entity::setTemplate);
        questionRepository.findById(req.getQuestionSeq()).ifPresent(entity::setQuestion);
        return SurveyOptionResponse.from(optionRepository.save(entity));
    }

    @Transactional
    public void deleteOption(Long optionSeq) {
        if (!optionRepository.existsById(optionSeq)) {
            throw new EntityNotFoundException("선택지");
        }
        optionRepository.deleteById(optionSeq);
    }

    @Transactional
    public SurveyTemplateResponse copyTemplate(Long sourceSeq, Long branchSeq) {
        SurveyTemplate source = templateRepository.findById(sourceSeq)
                .orElseThrow(() -> new EntityNotFoundException("설문지"));

        SurveyTemplate copy = SurveyTemplate.builder()
                .name(source.getName() + " (복사본)")
                .description(source.getDescription())
                .build();
        branchRepository.findById(branchSeq).ifPresent(copy::setBranch);
        SurveyTemplate savedTemplate = templateRepository.save(copy);

        // 섹션 배치 복제
        Map<Long, SurveyTemplateSection> sectionMap = new HashMap<>();
        List<SurveyTemplateSection> sectionCopies = new ArrayList<>();
        List<SurveyTemplateSection> sourceSections = sectionRepository.findByTemplateSeqOrderBySortOrder(sourceSeq);
        for (SurveyTemplateSection s : sourceSections) {
            SurveyTemplateSection sCopy = SurveyTemplateSection.builder()
                    .title(s.getTitle()).sortOrder(s.getSortOrder()).build();
            sCopy.setTemplate(savedTemplate);
            sectionCopies.add(sCopy);
        }
        List<SurveyTemplateSection> savedSections = sectionRepository.saveAll(sectionCopies);
        for (int i = 0; i < sourceSections.size(); i++) {
            sectionMap.put(sourceSections.get(i).getSeq(), savedSections.get(i));
        }

        // 질문 배치 복제
        Map<Long, SurveyTemplateQuestion> questionMap = new HashMap<>();
        List<SurveyTemplateQuestion> questionCopies = new ArrayList<>();
        List<SurveyTemplateQuestion> sourceQuestions = questionRepository.findByTemplateSeqOrderBySortOrder(sourceSeq);
        for (SurveyTemplateQuestion q : sourceQuestions) {
            SurveyTemplateQuestion qCopy = SurveyTemplateQuestion.builder()
                    .questionKey(q.getQuestionKey()).title(q.getTitle()).description(q.getDescription())
                    .inputType(q.getInputType()).isGrouped(q.getIsGrouped()).groups(q.getGroups())
                    .sortOrder(q.getSortOrder()).required(q.getRequired()).build();
            qCopy.setTemplate(savedTemplate);
            if (q.getSection() != null) {
                SurveyTemplateSection mapped = sectionMap.get(q.getSection().getSeq());
                if (mapped != null) qCopy.setSection(mapped);
            }
            questionCopies.add(qCopy);
        }
        List<SurveyTemplateQuestion> savedQuestions = questionRepository.saveAll(questionCopies);
        for (int i = 0; i < sourceQuestions.size(); i++) {
            questionMap.put(sourceQuestions.get(i).getSeq(), savedQuestions.get(i));
        }

        // 선택지 배치 복제
        List<SurveyTemplateOption> optionCopies = new ArrayList<>();
        for (SurveyTemplateOption o : optionRepository.findByTemplateSeqOrderBySortOrder(sourceSeq)) {
            SurveyTemplateOption oCopy = SurveyTemplateOption.builder()
                    .groupName(o.getGroupName()).label(o.getLabel()).sortOrder(o.getSortOrder()).build();
            oCopy.setTemplate(savedTemplate);
            if (o.getQuestion() != null) {
                SurveyTemplateQuestion mapped = questionMap.get(o.getQuestion().getSeq());
                if (mapped != null) oCopy.setQuestion(mapped);
            }
            optionCopies.add(oCopy);
        }
        optionRepository.saveAll(optionCopies);

        return SurveyTemplateResponse.from(savedTemplate, optionRepository.countByTemplateSeq(savedTemplate.getSeq()));
    }
}
