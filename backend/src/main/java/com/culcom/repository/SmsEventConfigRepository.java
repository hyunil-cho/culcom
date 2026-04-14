package com.culcom.repository;

import com.culcom.entity.enums.SmsEventType;
import com.culcom.entity.settings.SmsEventConfig;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface SmsEventConfigRepository extends JpaRepository<SmsEventConfig, Long> {
    Optional<SmsEventConfig> findByBranchSeqAndEventType(Long branchSeq, SmsEventType eventType);
    List<SmsEventConfig> findByBranchSeq(Long branchSeq);
    void deleteByTemplateSeq(Long templateSeq);
}
