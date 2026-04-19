package com.culcom.entity.survey;

import com.culcom.entity.BaseTimeEntity;
import com.culcom.entity.branch.Branch;
import com.culcom.entity.enums.SurveyStatus;
import jakarta.persistence.*;
import lombok.*;

import java.util.List;
import java.util.Map;

@Entity
@Table(name = "survey_templates")
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
@Builder
public class SurveyTemplate extends BaseTimeEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long seq;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "branch_seq", nullable = false)
    private Branch branch;

    @Column(nullable = false, length = 200)
    private String name;

    @Column(length = 500)
    private String description;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private SurveyStatus status = SurveyStatus.작성중;

    @Column(name = "customer_field_options", columnDefinition = "TEXT")
    @Convert(converter = CustomerFieldOptionsConverter.class)
    private Map<String, List<String>> customerFieldOptions;

    @Column(name = "customer_field_order", columnDefinition = "TEXT")
    @Convert(converter = StringListConverter.class)
    private List<String> customerFieldOrder;

}
