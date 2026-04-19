package com.culcom.entity.survey;

import com.culcom.entity.enums.InputType;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "survey_template_questions", uniqueConstraints = {
    @UniqueConstraint(name = "uk_question_section_key", columnNames = {"section_seq", "question_key"})
})
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
@Builder
public class SurveyTemplateQuestion {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long seq;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "template_seq", nullable = false)
    private SurveyTemplate template;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "section_seq")
    private SurveyTemplateSection section;

    @Column(name = "question_key", nullable = false, length = 50)
    private String questionKey;

    @Column(nullable = false, length = 200)
    private String title;

    @Column(length = 500)
    private String description;

    @Enumerated(EnumType.STRING)
    @Column(name = "input_type", nullable = false)
    @Builder.Default
    private InputType inputType = InputType.radio;

    @Column(name = "is_grouped", nullable = false)
    @Builder.Default
    private Boolean isGrouped = false;

    @Column(name = "group_label", length = 500)
    private String groupLabel;

    @Column(name = "sort_order", nullable = false)
    @Builder.Default
    private Integer sortOrder = 0;

    @Column(nullable = false)
    @Builder.Default
    private Boolean required = false;
}
