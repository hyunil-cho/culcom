package com.culcom.entity.webhook;

import com.culcom.entity.BaseTimeEntity;
import com.culcom.entity.branch.Branch;
import com.culcom.entity.customer.Customer;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "webhook_logs")
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
@Builder
public class WebhookLog extends BaseTimeEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long seq;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "webhook_config_seq")
    private WebhookConfig webhookConfig;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "customer_seq")
    private Customer customer;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "branch_seq")
    private Branch branch;

    /** 웹훅 소스 이름 (WebhookConfig.sourceName 스냅샷) */
    @Column(name = "source_name", length = 100)
    private String sourceName;

    /** 수신된 원본 요청 Body */
    @Column(name = "raw_request", columnDefinition = "text")
    private String rawRequest;

    /** 파싱된 요청 파라미터 (JSON) — 통계/집계용 */
    @Column(name = "parsed_params", columnDefinition = "text")
    private String parsedParams;

    /** 필드 매핑 후 추출된 고객 데이터 (JSON) — 통계/집계용 */
    @Column(name = "mapped_data", columnDefinition = "text")
    private String mappedData;

    /** 응답 HTTP 상태 코드 — 통계/집계용 */
    @Column(name = "http_status_code")
    private Integer httpStatusCode;

    /** 처리 결과 (SUCCESS, FAILED 등) */
    @Column(nullable = false, length = 20)
    @Builder.Default
    private String status = "SUCCESS";

    /** 실패 시 에러 메시지 */
    @Column(name = "error_message", length = 500)
    private String errorMessage;

    /** 요청 IP */
    @Column(name = "remote_ip", length = 50)
    private String remoteIp;

}
