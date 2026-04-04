package com.culcom.repository;

import com.culcom.entity.webhook.WebhookConfig;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface WebhookConfigRepository extends JpaRepository<WebhookConfig, Long> {
    List<WebhookConfig> findByBranchSeqOrderByCreatedDateDesc(Long branchSeq);
}
