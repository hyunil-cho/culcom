package com.culcom.repository;

import com.culcom.entity.SurveyTemplate;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface SurveyTemplateRepository extends JpaRepository<SurveyTemplate, Long> {
    List<SurveyTemplate> findByBranchSeqOrderByCreatedDateDesc(Long branchSeq);
}
