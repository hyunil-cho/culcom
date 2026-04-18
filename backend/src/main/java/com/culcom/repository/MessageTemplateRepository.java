package com.culcom.repository;

import com.culcom.entity.enums.SmsEventType;
import com.culcom.entity.message.MessageTemplate;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface MessageTemplateRepository extends JpaRepository<MessageTemplate, Long> {
    List<MessageTemplate> findByBranchSeqOrderBySeqDesc(Long branchSeq);
    List<MessageTemplate> findByBranchSeqOrderByIsDefaultDescLastUpdateDateDesc(Long branchSeq);
    List<MessageTemplate> findByBranchSeqAndIsActiveTrueOrderByIsDefaultDescLastUpdateDateDesc(Long branchSeq);
    List<MessageTemplate> findByBranchSeqAndEventTypeAndIsActiveTrueOrderByIsDefaultDescLastUpdateDateDesc(Long branchSeq, SmsEventType eventType);
}
