package com.culcom.repository;

import com.culcom.entity.SurveyTemplateOption;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface SurveyTemplateOptionRepository extends JpaRepository<SurveyTemplateOption, Long> {
    List<SurveyTemplateOption> findByTemplateSeqAndQuestionKeyOrderBySortOrder(Long templateSeq, String questionKey);
    List<SurveyTemplateOption> findByTemplateSeqOrderBySortOrder(Long templateSeq);
    void deleteByTemplateSeqAndQuestionKey(Long templateSeq, String questionKey);
}
