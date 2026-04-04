package com.culcom.repository;

import com.culcom.entity.survey.SurveyTemplateOption;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import java.util.List;

public interface SurveyTemplateOptionRepository extends JpaRepository<SurveyTemplateOption, Long> {
    List<SurveyTemplateOption> findByQuestionSeqOrderBySortOrder(Long questionSeq);
    List<SurveyTemplateOption> findByTemplateSeqOrderBySortOrder(Long templateSeq);
    void deleteByQuestionSeq(Long questionSeq);
    int countByTemplateSeq(Long templateSeq);
    void deleteByTemplateSeq(Long templateSeq);

    @Query("SELECT COALESCE(MAX(o.sortOrder), 0) FROM SurveyTemplateOption o WHERE o.question.seq = :questionSeq AND o.groupName = :groupName")
    int findMaxSortOrder(Long questionSeq, String groupName);
}
