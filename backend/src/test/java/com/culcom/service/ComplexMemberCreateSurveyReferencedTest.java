package com.culcom.service;

import com.culcom.dto.complex.member.ComplexMemberRequest;
import com.culcom.dto.complex.survey.SurveySubmissionRow;
import com.culcom.entity.branch.Branch;
import com.culcom.entity.survey.SurveySubmission;
import com.culcom.entity.survey.SurveyTemplate;
import com.culcom.mapper.SurveyQueryMapper;
import com.culcom.repository.BranchRepository;
import com.culcom.repository.SurveySubmissionRepository;
import com.culcom.repository.SurveyTemplateRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * 설문 제출 링크를 통해 회원가입이 발생한 경우:
 *   1) 해당 설문 제출의 referenced 가 true 로 변경되어야 한다.
 *   2) referenced=true 인 설문 제출은 관리 리스트(selectSubmissions)에서 제외되어야 한다.
 */
@SpringBootTest
@ActiveProfiles("test")
@Transactional
class ComplexMemberCreateSurveyReferencedTest {

    @Autowired ComplexMemberService complexMemberService;
    @Autowired BranchRepository branchRepository;
    @Autowired SurveyTemplateRepository surveyTemplateRepository;
    @Autowired SurveySubmissionRepository surveySubmissionRepository;
    @Autowired SurveyQueryMapper surveyQueryMapper;

    private Branch newBranch(String aliasPrefix) {
        return branchRepository.save(Branch.builder()
                .branchName("테스트지점")
                .alias(aliasPrefix + "-" + System.nanoTime())
                .build());
    }

    private SurveySubmission newSubmission(Branch branch, String name, String phone) {
        SurveyTemplate template = surveyTemplateRepository.save(SurveyTemplate.builder()
                .name("체험 설문지")
                .branch(branch)
                .build());
        return surveySubmissionRepository.save(SurveySubmission.builder()
                .branchSeq(branch.getSeq())
                .templateSeq(template.getSeq())
                .name(name)
                .phoneNumber(phone)
                .answers("{}")
                .build());
    }

    private ComplexMemberRequest newMemberRequest(String name, String phone, Long surveySubmissionSeq) {
        ComplexMemberRequest req = new ComplexMemberRequest();
        req.setName(name);
        req.setPhoneNumber(phone);
        req.setSurveySubmissionSeq(surveySubmissionSeq);
        return req;
    }

    @Test
    void 설문제출_링크로_회원가입하면_해당_설문의_referenced가_true가_된다() {
        // given
        Branch branch = newBranch("test-survey-ref");
        SurveySubmission submission = newSubmission(branch, "홍길동", "01012345678");
        assertThat(submission.getReferenced()).isFalse();

        // when — 설문 제출 seq를 들고 회원가입
        complexMemberService.create(
                newMemberRequest("홍길동", "01012345678", submission.getSeq()),
                branch.getSeq());

        // then — 설문 제출의 referenced 가 true 로 변경되어야 한다
        SurveySubmission reloaded = surveySubmissionRepository.findById(submission.getSeq()).orElseThrow();
        assertThat(reloaded.getReferenced())
                .as("회원가입에 사용된 설문 제출은 referenced=true로 마킹되어야 한다")
                .isTrue();
    }

    @Test
    void 설문제출_seq_없이_회원가입하면_기존_설문의_referenced는_변경되지_않는다() {
        // given
        Branch branch = newBranch("test-survey-noref");
        SurveySubmission submission = newSubmission(branch, "김영희", "01099998888");

        // when — surveySubmissionSeq=null 로 일반 회원가입
        complexMemberService.create(
                newMemberRequest("김영희", "01099998888", null),
                branch.getSeq());

        // then — 어떤 설문 제출도 영향을 받지 않아야 한다
        SurveySubmission reloaded = surveySubmissionRepository.findById(submission.getSeq()).orElseThrow();
        assertThat(reloaded.getReferenced()).isFalse();
    }

    @Test
    void referenced가_true인_설문은_관리_리스트에서_제외된다() {
        // given — 같은 지점에 referenced=false 1건, true 1건
        Branch branch = newBranch("test-survey-list");
        SurveySubmission active = newSubmission(branch, "활성고객", "01011112222");
        SurveySubmission consumed = newSubmission(branch, "이미사용", "01033334444");
        consumed.setReferenced(true);
        surveySubmissionRepository.save(consumed);
        surveySubmissionRepository.flush();

        // when
        List<SurveySubmissionRow> rows = surveyQueryMapper.selectSubmissions(branch.getSeq());

        // then — referenced=false 인 것만 조회되어야 한다
        assertThat(rows).extracting(SurveySubmissionRow::getSeq)
                .as("referenced=true 인 설문 제출은 리스트에 노출되지 않아야 한다")
                .contains(active.getSeq())
                .doesNotContain(consumed.getSeq());
    }

}
