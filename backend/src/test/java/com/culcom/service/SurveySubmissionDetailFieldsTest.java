package com.culcom.service;

import com.culcom.dto.complex.survey.SurveySubmissionDetailRow;
import com.culcom.entity.branch.Branch;
import com.culcom.entity.survey.SurveySubmission;
import com.culcom.entity.survey.SurveyTemplate;
import com.culcom.repository.BranchRepository;
import com.culcom.repository.SurveySubmissionRepository;
import com.culcom.repository.SurveyTemplateRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * 설문 상세 조회 시 인적사항 필드(gender, location, ageGroup, occupation, adSource)가
 * 모두 정상적으로 반환되는지 검증.
 * 프론트엔드에서 이 필드들을 '/' 구분으로 회원 info에 매핑하므로,
 * 백엔드가 올바르게 전달하는 것이 전제 조건.
 */
@SpringBootTest
@ActiveProfiles("test")
@Transactional
class SurveySubmissionDetailFieldsTest {

    @Autowired SurveyService surveyService;
    @Autowired BranchRepository branchRepository;
    @Autowired SurveyTemplateRepository surveyTemplateRepository;
    @Autowired SurveySubmissionRepository surveySubmissionRepository;

    @Test
    void 설문_상세_조회시_인적사항_필드가_모두_반환된다() {
        // given
        Branch branch = branchRepository.save(Branch.builder()
                .branchName("테스트지점")
                .alias("test-detail-fields-" + System.nanoTime())
                .build());

        SurveyTemplate template = surveyTemplateRepository.save(SurveyTemplate.builder()
                .name("체험 설문지")
                .branch(branch)
                .build());

        SurveySubmission submission = surveySubmissionRepository.save(SurveySubmission.builder()
                .branchSeq(branch.getSeq())
                .templateSeq(template.getSeq())
                .name("홍길동")
                .phoneNumber("01012345678")
                .gender("남성")
                .location("서울")
                .ageGroup("30대")
                .occupation("직장인")
                .adSource("인스타그램")
                .answers("{}")
                .build());

        // when
        SurveySubmissionDetailRow detail = surveyService.getSubmissionDetail(submission.getSeq());

        // then — 모든 인적사항 필드가 올바르게 반환되어야 한다
        assertThat(detail.getGender()).isEqualTo("남성");
        assertThat(detail.getLocation()).isEqualTo("서울");
        assertThat(detail.getAgeGroup()).isEqualTo("30대");
        assertThat(detail.getOccupation()).isEqualTo("직장인");
        assertThat(detail.getAdSource()).isEqualTo("인스타그램");
    }

    @Test
    void 인적사항_필드가_null이면_null로_반환된다() {
        // given — 인적사항 필드 없이 제출
        Branch branch = branchRepository.save(Branch.builder()
                .branchName("테스트지점2")
                .alias("test-detail-null-" + System.nanoTime())
                .build());

        SurveyTemplate template = surveyTemplateRepository.save(SurveyTemplate.builder()
                .name("간단 설문지")
                .branch(branch)
                .build());

        SurveySubmission submission = surveySubmissionRepository.save(SurveySubmission.builder()
                .branchSeq(branch.getSeq())
                .templateSeq(template.getSeq())
                .name("김철수")
                .phoneNumber("01099998888")
                .answers("{}")
                .build());

        // when
        SurveySubmissionDetailRow detail = surveyService.getSubmissionDetail(submission.getSeq());

        // then — null 필드들은 null로 반환
        assertThat(detail.getGender()).isNull();
        assertThat(detail.getLocation()).isNull();
        assertThat(detail.getAgeGroup()).isNull();
        assertThat(detail.getOccupation()).isNull();
        assertThat(detail.getAdSource()).isNull();
    }

    @Test
    void 일부_인적사항_필드만_있을_때_정상_반환된다() {
        // given — gender, adSource만 있음
        Branch branch = branchRepository.save(Branch.builder()
                .branchName("테스트지점3")
                .alias("test-detail-partial-" + System.nanoTime())
                .build());

        SurveyTemplate template = surveyTemplateRepository.save(SurveyTemplate.builder()
                .name("부분 설문지")
                .branch(branch)
                .build());

        SurveySubmission submission = surveySubmissionRepository.save(SurveySubmission.builder()
                .branchSeq(branch.getSeq())
                .templateSeq(template.getSeq())
                .name("이영희")
                .phoneNumber("01055556666")
                .gender("여성")
                .adSource("블로그")
                .answers("{}")
                .build());

        // when
        SurveySubmissionDetailRow detail = surveyService.getSubmissionDetail(submission.getSeq());

        // then — 입력된 필드만 값이 있고 나머지는 null
        assertThat(detail.getGender()).isEqualTo("여성");
        assertThat(detail.getLocation()).isNull();
        assertThat(detail.getAgeGroup()).isNull();
        assertThat(detail.getOccupation()).isNull();
        assertThat(detail.getAdSource()).isEqualTo("블로그");
    }
}
