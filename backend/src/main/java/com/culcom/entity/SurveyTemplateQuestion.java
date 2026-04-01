package com.culcom.entity;

import com.culcom.entity.enums.InputType;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "survey_template_questions")
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

    @Column(name = "question_key", nullable = false, length = 50)
    private String questionKey;

    @Column(nullable = false, length = 200)
    private String title;

    @Column(length = 500)
    private String description;

    @Column(nullable = false)
    @Builder.Default
    private Integer section = 1;

    @Column(name = "section_title", length = 100)
    private String sectionTitle;

    @Column(name = "show_divider", nullable = false)
    @Builder.Default
    private Boolean showDivider = false;

    @Enumerated(EnumType.STRING)
    @Column(name = "input_type", nullable = false)
    @Builder.Default
    private InputType inputType = InputType.radio;

    @Column(name = "is_grouped", nullable = false)
    @Builder.Default
    private Boolean isGrouped = false;

    @Column(length = 500)
    private String groups;

    @Column(name = "sort_order", nullable = false)
    @Builder.Default
    private Integer sortOrder = 0;
}
