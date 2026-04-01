package com.culcom.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "survey_template_options")
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
@Builder
public class SurveyTemplateOption {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long seq;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "template_seq", nullable = false)
    private SurveyTemplate template;

    @Column(name = "question_key", nullable = false, length = 50)
    private String questionKey;

    @Column(name = "group_name", length = 100, columnDefinition = "varchar(100) default ''")
    @Builder.Default
    private String groupName = "";

    @Column(nullable = false, length = 300)
    private String label;

    @Column(name = "sort_order", nullable = false)
    @Builder.Default
    private Integer sortOrder = 0;

    @Column(name = "createdDate", nullable = false, updatable = false)
    private LocalDateTime createdDate;

    @PrePersist
    protected void onCreate() {
        createdDate = LocalDateTime.now();
    }
}
