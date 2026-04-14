package com.culcom.service;

import com.culcom.dto.complex.survey.*;
import com.culcom.entity.branch.Branch;
import com.culcom.entity.enums.InputType;
import com.culcom.entity.enums.SurveyStatus;
import com.culcom.repository.BranchRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * 설문 편집기 핵심 시나리오 검증:
 * 1) 섹션 이름 변경
 * 2) 질문 이름 변경 (부분 수정 포함)
 * 3) 선택지 순서 변경
 */
@SpringBootTest
@ActiveProfiles("test")
@Transactional
class SurveyEditorTest {

    @Autowired SurveyService surveyService;
    @Autowired BranchRepository branchRepository;

    private Branch branch;
    private Long templateSeq;

    @BeforeEach
    void setUp() {
        branch = branchRepository.save(Branch.builder()
                .branchName("테스트지점")
                .alias("survey-editor-" + System.nanoTime())
                .build());

        SurveyTemplateResponse template = surveyService.createTemplate(
                createTemplateRequest("테스트 설문"), branch.getSeq());
        templateSeq = template.getSeq();
    }

    private SurveyTemplateRequest createTemplateRequest(String name) {
        SurveyTemplateRequest req = new SurveyTemplateRequest();
        req.setName(name);
        return req;
    }

    private SurveySectionRequest createSectionRequest(String title) {
        SurveySectionRequest req = new SurveySectionRequest();
        req.setTitle(title);
        return req;
    }

    private SurveyQuestionRequest createQuestionRequest(Long sectionSeq, String key, String title) {
        SurveyQuestionRequest req = new SurveyQuestionRequest();
        req.setSectionSeq(sectionSeq);
        req.setQuestionKey(key);
        req.setTitle(title);
        req.setInputType(InputType.radio);
        req.setRequired(false);
        return req;
    }

    private SurveyOptionRequest createOptionRequest(Long questionSeq, String label) {
        SurveyOptionRequest req = new SurveyOptionRequest();
        req.setQuestionSeq(questionSeq);
        req.setLabel(label);
        return req;
    }

    private OptionReorderRequest.OptionReorderItem reorderItem(Long seq, int sortOrder) {
        OptionReorderRequest.OptionReorderItem item = new OptionReorderRequest.OptionReorderItem();
        item.setSeq(seq);
        item.setSortOrder(sortOrder);
        return item;
    }

    // ========== 섹션 이름 변경 ==========

    @Nested
    class 섹션_이름_변경 {

        @Test
        void 섹션_이름을_변경하면_반영된다() {
            SurveySectionResponse section = surveyService.createSection(templateSeq, createSectionRequest("기본 정보"));

            SurveySectionResponse updated = surveyService.updateSection(section.getSeq(), createSectionRequest("변경된 섹션명"));

            assertThat(updated.getTitle()).isEqualTo("변경된 섹션명");
        }

        @Test
        void 변경된_섹션_이름이_목록_조회에_반영된다() {
            SurveySectionResponse section = surveyService.createSection(templateSeq, createSectionRequest("원래 이름"));
            surveyService.updateSection(section.getSeq(), createSectionRequest("새 이름"));

            List<SurveySectionResponse> sections = surveyService.listSections(templateSeq);

            assertThat(sections).hasSize(1);
            assertThat(sections.get(0).getTitle()).isEqualTo("새 이름");
        }

        @Test
        void 존재하지_않는_섹션_수정시_예외() {
            assertThatThrownBy(() -> surveyService.updateSection(999999L, createSectionRequest("실패")))
                    .hasMessageContaining("섹션");
        }
    }

    // ========== 질문 이름 변경 ==========

    @Nested
    class 질문_이름_변경 {

        private Long sectionSeq;

        @BeforeEach
        void createSection() {
            SurveySectionResponse section = surveyService.createSection(templateSeq, createSectionRequest("섹션1"));
            sectionSeq = section.getSeq();
        }

        @Test
        void 질문_제목을_변경하면_반영된다() {
            SurveyQuestionResponse question = surveyService.createQuestion(templateSeq,
                    createQuestionRequest(sectionSeq, "q1", "원래 질문"));

            SurveyQuestionRequest updateReq = new SurveyQuestionRequest();
            updateReq.setSectionSeq(sectionSeq);
            updateReq.setQuestionKey("q1");
            updateReq.setTitle("변경된 질문");
            updateReq.setInputType(InputType.radio);
            updateReq.setRequired(false);

            SurveyQuestionResponse updated = surveyService.updateQuestion(question.getSeq(), updateReq);

            assertThat(updated.getTitle()).isEqualTo("변경된 질문");
        }

        @Test
        void 제목만_부분_수정해도_다른_필드는_유지된다() {
            SurveyQuestionResponse question = surveyService.createQuestion(templateSeq,
                    createQuestionRequest(sectionSeq, "q1", "원래 질문"));

            // title만 보내는 부분 수정
            SurveyQuestionRequest partialReq = new SurveyQuestionRequest();
            partialReq.setTitle("부분 수정된 질문");

            SurveyQuestionResponse updated = surveyService.updateQuestion(question.getSeq(), partialReq);

            assertThat(updated.getTitle()).isEqualTo("부분 수정된 질문");
            assertThat(updated.getQuestionKey()).isEqualTo("q1");
            assertThat(updated.getInputType()).isEqualTo(InputType.radio);
        }

        @Test
        void 필수여부만_부분_수정해도_제목은_유지된다() {
            SurveyQuestionResponse question = surveyService.createQuestion(templateSeq,
                    createQuestionRequest(sectionSeq, "q1", "질문 제목"));

            SurveyQuestionRequest partialReq = new SurveyQuestionRequest();
            partialReq.setRequired(true);

            SurveyQuestionResponse updated = surveyService.updateQuestion(question.getSeq(), partialReq);

            assertThat(updated.getRequired()).isTrue();
            assertThat(updated.getTitle()).isEqualTo("질문 제목");
        }

        @Test
        void 응답형식만_부분_수정해도_제목은_유지된다() {
            SurveyQuestionResponse question = surveyService.createQuestion(templateSeq,
                    createQuestionRequest(sectionSeq, "q1", "질문 제목"));

            SurveyQuestionRequest partialReq = new SurveyQuestionRequest();
            partialReq.setInputType(InputType.text);

            SurveyQuestionResponse updated = surveyService.updateQuestion(question.getSeq(), partialReq);

            assertThat(updated.getInputType()).isEqualTo(InputType.text);
            assertThat(updated.getTitle()).isEqualTo("질문 제목");
        }

        @Test
        void 변경된_질문_제목이_목록에_반영된다() {
            SurveyQuestionResponse question = surveyService.createQuestion(templateSeq,
                    createQuestionRequest(sectionSeq, "q1", "원래 질문"));

            SurveyQuestionRequest updateReq = new SurveyQuestionRequest();
            updateReq.setTitle("수정된 질문");
            surveyService.updateQuestion(question.getSeq(), updateReq);

            List<SurveyQuestionResponse> questions = surveyService.listQuestions(templateSeq);

            assertThat(questions).hasSize(1);
            assertThat(questions.get(0).getTitle()).isEqualTo("수정된 질문");
        }

        @Test
        void 존재하지_않는_질문_수정시_예외() {
            SurveyQuestionRequest req = new SurveyQuestionRequest();
            req.setTitle("실패");

            assertThatThrownBy(() -> surveyService.updateQuestion(999999L, req))
                    .hasMessageContaining("질문");
        }
    }

    // ========== 설문지 복사 독립성 검증 ==========

    @Nested
    class 설문지_복사_독립성 {

        private Long sectionSeq;
        private Long questionSeq;

        @BeforeEach
        void createFullTemplate() {
            SurveySectionResponse section = surveyService.createSection(templateSeq, createSectionRequest("섹션1"));
            sectionSeq = section.getSeq();

            SurveyQuestionResponse question = surveyService.createQuestion(templateSeq,
                    createQuestionRequest(sectionSeq, "q1", "질문1"));
            questionSeq = question.getSeq();

            surveyService.createOption(templateSeq, createOptionRequest(questionSeq, "선택A"));
            surveyService.createOption(templateSeq, createOptionRequest(questionSeq, "선택B"));
        }

        @Test
        void 복사된_설문지는_별도의_seq를_가진다() {
            SurveyTemplateResponse copy = surveyService.copyTemplate(templateSeq, branch.getSeq());

            assertThat(copy.getSeq()).isNotEqualTo(templateSeq);
            assertThat(copy.getName()).isEqualTo("테스트 설문 (복사본)");
        }

        @Test
        void 복사된_설문지의_섹션은_원본과_독립이다() {
            SurveyTemplateResponse copy = surveyService.copyTemplate(templateSeq, branch.getSeq());

            List<SurveySectionResponse> originalSections = surveyService.listSections(templateSeq);
            List<SurveySectionResponse> copiedSections = surveyService.listSections(copy.getSeq());

            assertThat(copiedSections).hasSameSizeAs(originalSections);
            // seq가 다른 별개의 엔티티인지 확인
            for (int i = 0; i < originalSections.size(); i++) {
                assertThat(copiedSections.get(i).getSeq()).isNotEqualTo(originalSections.get(i).getSeq());
                assertThat(copiedSections.get(i).getTitle()).isEqualTo(originalSections.get(i).getTitle());
            }
        }

        @Test
        void 복사된_설문지의_질문은_원본과_독립이다() {
            SurveyTemplateResponse copy = surveyService.copyTemplate(templateSeq, branch.getSeq());

            List<SurveyQuestionResponse> originalQuestions = surveyService.listQuestions(templateSeq);
            List<SurveyQuestionResponse> copiedQuestions = surveyService.listQuestions(copy.getSeq());

            assertThat(copiedQuestions).hasSameSizeAs(originalQuestions);
            for (int i = 0; i < originalQuestions.size(); i++) {
                assertThat(copiedQuestions.get(i).getSeq()).isNotEqualTo(originalQuestions.get(i).getSeq());
                assertThat(copiedQuestions.get(i).getTitle()).isEqualTo(originalQuestions.get(i).getTitle());
                assertThat(copiedQuestions.get(i).getQuestionKey()).isEqualTo(originalQuestions.get(i).getQuestionKey());
            }
        }

        @Test
        void 복사된_설문지의_선택지는_원본과_독립이다() {
            SurveyTemplateResponse copy = surveyService.copyTemplate(templateSeq, branch.getSeq());

            List<SurveyOptionResponse> originalOptions = surveyService.listOptions(templateSeq, null);
            List<SurveyOptionResponse> copiedOptions = surveyService.listOptions(copy.getSeq(), null);

            assertThat(copiedOptions).hasSameSizeAs(originalOptions);
            for (int i = 0; i < originalOptions.size(); i++) {
                assertThat(copiedOptions.get(i).getSeq()).isNotEqualTo(originalOptions.get(i).getSeq());
                assertThat(copiedOptions.get(i).getLabel()).isEqualTo(originalOptions.get(i).getLabel());
            }
        }

        @Test
        void 복사본_수정이_원본에_영향을_주지_않는다() {
            SurveyTemplateResponse copy = surveyService.copyTemplate(templateSeq, branch.getSeq());

            // 복사본의 템플릿 이름 변경
            SurveyTemplateRequest nameReq = new SurveyTemplateRequest();
            nameReq.setName("수정된 복사본");
            surveyService.updateTemplate(copy.getSeq(), nameReq);

            // 복사본의 섹션 이름 변경
            List<SurveySectionResponse> copiedSections = surveyService.listSections(copy.getSeq());
            surveyService.updateSection(copiedSections.get(0).getSeq(), createSectionRequest("수정된 섹션"));

            // 복사본의 질문 제목 변경
            List<SurveyQuestionResponse> copiedQuestions = surveyService.listQuestions(copy.getSeq());
            SurveyQuestionRequest qReq = new SurveyQuestionRequest();
            qReq.setTitle("수정된 질문");
            surveyService.updateQuestion(copiedQuestions.get(0).getSeq(), qReq);

            // 원본은 변경되지 않았는지 검증
            SurveyTemplateResponse originalTemplate = surveyService.getTemplate(templateSeq);
            assertThat(originalTemplate.getName()).isEqualTo("테스트 설문");

            List<SurveySectionResponse> originalSections = surveyService.listSections(templateSeq);
            assertThat(originalSections.get(0).getTitle()).isEqualTo("섹션1");

            List<SurveyQuestionResponse> originalQuestions = surveyService.listQuestions(templateSeq);
            assertThat(originalQuestions.get(0).getTitle()).isEqualTo("질문1");

            List<SurveyOptionResponse> originalOptions = surveyService.listOptions(templateSeq, null);
            assertThat(originalOptions).hasSize(2);
            assertThat(originalOptions).extracting(SurveyOptionResponse::getLabel)
                    .containsExactly("선택A", "선택B");
        }

        @Test
        void 복사본_선택지_삭제가_원본에_영향을_주지_않는다() {
            SurveyTemplateResponse copy = surveyService.copyTemplate(templateSeq, branch.getSeq());

            // 복사본의 선택지 전부 삭제
            List<SurveyOptionResponse> copiedOptions = surveyService.listOptions(copy.getSeq(), null);
            for (SurveyOptionResponse opt : copiedOptions) {
                surveyService.deleteOption(opt.getSeq());
            }

            // 복사본은 선택지 0개
            assertThat(surveyService.listOptions(copy.getSeq(), null)).isEmpty();

            // 원본은 여전히 2개
            List<SurveyOptionResponse> originalOptions = surveyService.listOptions(templateSeq, null);
            assertThat(originalOptions).hasSize(2);
        }

        @Test
        void 원본_삭제가_복사본에_영향을_주지_않는다() {
            SurveyTemplateResponse copy = surveyService.copyTemplate(templateSeq, branch.getSeq());
            Long copySeq = copy.getSeq();

            // 원본 삭제
            surveyService.deleteTemplate(templateSeq);

            // 복사본은 여전히 정상 조회
            SurveyTemplateResponse survivingCopy = surveyService.getTemplate(copySeq);
            assertThat(survivingCopy.getName()).isEqualTo("테스트 설문 (복사본)");

            List<SurveySectionResponse> copySections = surveyService.listSections(copySeq);
            assertThat(copySections).hasSize(1);

            List<SurveyQuestionResponse> copyQuestions = surveyService.listQuestions(copySeq);
            assertThat(copyQuestions).hasSize(1);

            List<SurveyOptionResponse> copyOptions = surveyService.listOptions(copySeq, null);
            assertThat(copyOptions).hasSize(2);
        }

        @Test
        void 복사본은_작성중_상태로_생성된다() {
            // 원본을 활성화
            surveyService.updateStatus(templateSeq, "활성");

            SurveyTemplateResponse copy = surveyService.copyTemplate(templateSeq, branch.getSeq());

            assertThat(copy.getStatus()).isEqualTo(SurveyStatus.작성중);
        }
    }

    // ========== 선택지 순서 변경 ==========

    @Nested
    class 선택지_순서_변경 {

        private Long questionSeq;

        @BeforeEach
        void createQuestionWithOptions() {
            SurveySectionResponse section = surveyService.createSection(templateSeq, createSectionRequest("섹션"));
            SurveyQuestionResponse question = surveyService.createQuestion(templateSeq,
                    createQuestionRequest(section.getSeq(), "q1", "질문"));
            questionSeq = question.getSeq();
        }

        @Test
        void 선택지_3개의_순서를_역순으로_변경한다() {
            SurveyOptionResponse opt1 = surveyService.createOption(templateSeq, createOptionRequest(questionSeq, "A"));
            SurveyOptionResponse opt2 = surveyService.createOption(templateSeq, createOptionRequest(questionSeq, "B"));
            SurveyOptionResponse opt3 = surveyService.createOption(templateSeq, createOptionRequest(questionSeq, "C"));

            // A(1), B(2), C(3) → C(1), B(2), A(3)
            OptionReorderRequest reorderReq = new OptionReorderRequest();
            reorderReq.setItems(List.of(
                    reorderItem(opt3.getSeq(), 1),
                    reorderItem(opt2.getSeq(), 2),
                    reorderItem(opt1.getSeq(), 3)
            ));

            List<SurveyOptionResponse> reordered = surveyService.reorderOptions(reorderReq);

            assertThat(reordered).hasSize(3);

            // 목록 재조회하여 순서 검증
            List<SurveyOptionResponse> options = surveyService.listOptions(templateSeq, questionSeq);
            assertThat(options.get(0).getLabel()).isEqualTo("C");
            assertThat(options.get(1).getLabel()).isEqualTo("B");
            assertThat(options.get(2).getLabel()).isEqualTo("A");
        }

        @Test
        void 선택지_중간_삽입_순서_변경() {
            SurveyOptionResponse opt1 = surveyService.createOption(templateSeq, createOptionRequest(questionSeq, "첫번째"));
            SurveyOptionResponse opt2 = surveyService.createOption(templateSeq, createOptionRequest(questionSeq, "두번째"));
            SurveyOptionResponse opt3 = surveyService.createOption(templateSeq, createOptionRequest(questionSeq, "세번째"));

            // 첫(1), 두(2), 세(3) → 세(1), 첫(2), 두(3)
            OptionReorderRequest reorderReq = new OptionReorderRequest();
            reorderReq.setItems(List.of(
                    reorderItem(opt3.getSeq(), 1),
                    reorderItem(opt1.getSeq(), 2),
                    reorderItem(opt2.getSeq(), 3)
            ));
            surveyService.reorderOptions(reorderReq);

            List<SurveyOptionResponse> options = surveyService.listOptions(templateSeq, questionSeq);
            assertThat(options).extracting(SurveyOptionResponse::getLabel)
                    .containsExactly("세번째", "첫번째", "두번째");
        }

        @Test
        void 선택지가_하나일_때_순서_변경해도_문제없다() {
            SurveyOptionResponse opt1 = surveyService.createOption(templateSeq, createOptionRequest(questionSeq, "유일"));

            OptionReorderRequest reorderReq = new OptionReorderRequest();
            reorderReq.setItems(List.of(
                    reorderItem(opt1.getSeq(), 1)
            ));

            List<SurveyOptionResponse> reordered = surveyService.reorderOptions(reorderReq);
            assertThat(reordered).hasSize(1);
            assertThat(reordered.get(0).getLabel()).isEqualTo("유일");
        }
    }
}
