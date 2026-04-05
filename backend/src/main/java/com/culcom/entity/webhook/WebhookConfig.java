package com.culcom.entity.webhook;

import com.culcom.entity.BaseTimeEntity;
import com.culcom.entity.branch.Branch;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "webhook_configs")
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
@Builder
public class WebhookConfig extends BaseTimeEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long seq;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "branch_seq", nullable = false)
    private Branch branch;

    @Column(nullable = false, length = 100)
    private String name;

    @Column(name = "source_name", nullable = false, length = 100)
    private String sourceName;

    @Column(name = "source_description", length = 500)
    private String sourceDescription;

    @Column(name = "http_method", nullable = false, length = 10)
    @Builder.Default
    private String httpMethod = "POST";

    @Column(name = "request_content_type", length = 100)
    @Builder.Default
    private String requestContentType = "application/json";

    @Column(name = "request_headers", columnDefinition = "text")
    private String requestHeaders;

    @Column(name = "request_body_schema", columnDefinition = "text")
    private String requestBodySchema;

    @Column(name = "response_status_code")
    @Builder.Default
    private Integer responseStatusCode = 200;

    @Column(name = "response_content_type", length = 100)
    @Builder.Default
    private String responseContentType = "application/json";

    @Column(name = "response_body_template", columnDefinition = "text")
    private String responseBodyTemplate;

    /** Customer 필드 ↔ 소스 파라미터 매핑 (JSON). 예: {"name":"userName","phoneNumber":"phone"} */
    @Column(name = "field_mapping", columnDefinition = "text")
    private String fieldMapping;

    @Column(name = "auth_type", length = 20)
    private String authType;

    /** 인증 타입별 설정 (JSON). 예: {"key":"xxx"}, {"secret":"xxx","verify_token":"yyy"} */
    @Column(name = "auth_config", columnDefinition = "text")
    private String authConfig;

    @Column(name = "is_active", nullable = false)
    @Builder.Default
    private Boolean isActive = false;

}
