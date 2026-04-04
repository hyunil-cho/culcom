package com.culcom.entity.survey;

import com.culcom.entity.enums.InputType;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "survey_template_settings",
       uniqueConstraints = @UniqueConstraint(columnNames = {"template_seq", "question_key"}))
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
@Builder
public class SurveyTemplateSettings {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long seq;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "template_seq", nullable = false)
    private SurveyTemplate template;

    @Column(name = "question_key", nullable = false, length = 50)
    private String questionKey;

    @Enumerated(EnumType.STRING)
    @Column(name = "input_type", nullable = false)
    @Builder.Default
    private InputType inputType = InputType.radio;
}
