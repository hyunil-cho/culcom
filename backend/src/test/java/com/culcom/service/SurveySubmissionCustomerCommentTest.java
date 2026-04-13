package com.culcom.service;

import com.culcom.dto.complex.survey.SurveySubmissionDetailRow;
import com.culcom.entity.auth.UserInfo;
import com.culcom.entity.branch.Branch;
import com.culcom.entity.customer.Customer;
import com.culcom.entity.enums.UserRole;
import com.culcom.entity.reservation.ReservationInfo;
import com.culcom.entity.survey.SurveySubmission;
import com.culcom.entity.survey.SurveyTemplate;
import com.culcom.repository.*;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * 고객이 예약 후 설문을 완료했을 때,
 * 설문 상세 조회 시 해당 고객의 코멘트가 포함되는지 검증.
 */
@SpringBootTest
@ActiveProfiles("test")
@Transactional
class SurveySubmissionCustomerCommentTest {

    @Autowired SurveyService surveyService;
    @Autowired BranchRepository branchRepository;
    @Autowired CustomerRepository customerRepository;
    @Autowired UserInfoRepository userInfoRepository;
    @Autowired ReservationInfoRepository reservationInfoRepository;
    @Autowired SurveyTemplateRepository surveyTemplateRepository;
    @Autowired SurveySubmissionRepository surveySubmissionRepository;

    @Test
    void 설문_상세_조회시_예약_고객의_코멘트가_포함된다() {
        // given — 지점, 유저, 고객 세팅
        Branch branch = branchRepository.save(Branch.builder()
                .branchName("테스트지점")
                .alias("test-survey-" + System.nanoTime())
                .build());

        UserInfo user = userInfoRepository.save(UserInfo.builder()
                .userId("test-user-" + System.nanoTime())
                .userPassword("password")
                .role(UserRole.ROOT)
                .build());

        Customer customer = customerRepository.save(Customer.builder()
                .name("홍길동")
                .phoneNumber("01012345678")
                .comment("영어 초급, 주 3회 희망")
                .branch(branch)
                .build());

        // given — 예약 생성
        ReservationInfo reservation = reservationInfoRepository.save(ReservationInfo.builder()
                .branch(branch)
                .customer(customer)
                .user(user)
                .caller("IN")
                .interviewDate(LocalDateTime.now().plusDays(1))
                .build());

        // given — 설문 템플릿 + 설문 제출 (reservationSeq 연결)
        SurveyTemplate template = surveyTemplateRepository.save(SurveyTemplate.builder()
                .name("체험 설문지")
                .branch(branch)
                .build());

        SurveySubmission submission = surveySubmissionRepository.save(SurveySubmission.builder()
                .branchSeq(branch.getSeq())
                .templateSeq(template.getSeq())
                .reservationSeq(reservation.getSeq())
                .name("홍길동")
                .phoneNumber("01012345678")
                .adSource("블로그")
                .answers("{}")
                .build());

        // when — 설문 상세 조회
        SurveySubmissionDetailRow detail = surveyService.getSubmissionDetail(submission.getSeq());

        // then — 고객 코멘트가 포함되어야 한다
        assertThat(detail.getCustomerComment())
                .as("예약된 고객의 코멘트가 설문 상세에 포함되어야 한다")
                .isEqualTo("영어 초급, 주 3회 희망");
        assertThat(detail.getName()).isEqualTo("홍길동");
        assertThat(detail.getAdSource()).isEqualTo("블로그");
        assertThat(detail.getTemplateName()).isEqualTo("체험 설문지");
    }

    @Test
    void 예약_없는_설문은_코멘트가_null이다() {
        // given — 예약 없이 설문 제출
        Branch branch = branchRepository.save(Branch.builder()
                .branchName("테스트지점2")
                .alias("test-survey-no-rsv-" + System.nanoTime())
                .build());

        SurveyTemplate template = surveyTemplateRepository.save(SurveyTemplate.builder()
                .name("일반 설문지")
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

        // then — reservationSeq가 없으므로 customerComment는 null
        assertThat(detail.getCustomerComment())
                .as("예약이 없는 설문은 고객 코멘트가 null이어야 한다")
                .isNull();
    }
}
