package com.culcom.repository;

import com.culcom.entity.MessageTemplate;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface MessageTemplateRepository extends JpaRepository<MessageTemplate, Long> {
    List<MessageTemplate> findByBranchSeqOrderBySeqDesc(Long branchSeq);
}
