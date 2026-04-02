package com.culcom.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "webhook_logs")
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
@Builder
public class WebhookLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long seq;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "webhook_config_seq", nullable = false)
    private WebhookConfig webhookConfig;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "customer_seq")
    private Customer customer;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "branch_seq", nullable = false)
    private Branch branch;

    /** 웹훅 소스 이름 (WebhookConfig.sourceName 스냅샷) */
    @Column(name = "source_name", nullable = false, length = 100)
    private String sourceName;

    /** 수신된 원본 요청 Body */
    @Column(name = "raw_request", columnDefinition = "text")
    private String rawRequest;

    /** 처리 결과 (SUCCESS, FAILED, DUPLICATE 등) */
    @Column(nullable = false, length = 20)
    @Builder.Default
    private String status = "SUCCESS";

    /** 실패 시 에러 메시지 */
    @Column(name = "error_message", length = 500)
    private String errorMessage;

    /** 요청 IP */
    @Column(name = "remote_ip", length = 50)
    private String remoteIp;

    @Column(name = "createdDate", nullable = false, updatable = false)
    private LocalDateTime createdDate;

    @PrePersist
    protected void onCreate() {
        createdDate = LocalDateTime.now();
    }
}
