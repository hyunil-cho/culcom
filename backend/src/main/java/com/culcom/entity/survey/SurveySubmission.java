package com.culcom.entity.survey;

import com.culcom.entity.BaseTimeEntity;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "survey_submissions")
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
@Builder
public class SurveySubmission extends BaseTimeEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long seq;

    @Column(name = "branch_seq", nullable = false)
    private Long branchSeq;

    @Column(name = "template_seq", nullable = false)
    private Long templateSeq;

    @Column(name = "reservation_seq")
    private Long reservationSeq;

    /** 고객 기본 정보 */
    @Column(nullable = false, length = 50)
    private String name;

    @Column(name = "phone_number", nullable = false, length = 20)
    private String phoneNumber;

    @Column(length = 10)
    private String gender;

    @Column(length = 100)
    private String location;

    @Column(name = "age_group", length = 20)
    private String ageGroup;

    @Column(length = 20)
    private String occupation;

    @Column(name = "ad_source", length = 30)
    private String adSource;

    /** 설문 응답 (JSON) */
    @Column(columnDefinition = "TEXT")
    private String answers;

    /** 제출 시점 스냅샷 */
    @Column(name = "template_name", length = 200)
    private String templateName;

    @Column(name = "question_snapshot", columnDefinition = "TEXT")
    private String questionSnapshot;
}
