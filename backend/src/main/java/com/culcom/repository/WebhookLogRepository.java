package com.culcom.repository;

import com.culcom.entity.WebhookLog;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface WebhookLogRepository extends JpaRepository<WebhookLog, Long> {
    Page<WebhookLog> findByBranchSeqOrderByCreatedDateDesc(Long branchSeq, Pageable pageable);
    Page<WebhookLog> findByWebhookConfigSeqOrderByCreatedDateDesc(Long webhookConfigSeq, Pageable pageable);
    Page<WebhookLog> findByBranchSeqAndStatusOrderByCreatedDateDesc(Long branchSeq, String status, Pageable pageable);
}
