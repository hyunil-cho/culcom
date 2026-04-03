package com.culcom.repository;

import com.culcom.entity.SurveyTemplateQuestion;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import java.util.List;

public interface SurveyTemplateQuestionRepository extends JpaRepository<SurveyTemplateQuestion, Long> {
    List<SurveyTemplateQuestion> findByTemplateSeqOrderBySortOrder(Long templateSeq);
    List<SurveyTemplateQuestion> findBySectionSeqOrderBySortOrder(Long sectionSeq);
    void deleteByTemplateSeq(Long templateSeq);
    void deleteBySectionSeq(Long sectionSeq);

    @Query("SELECT COALESCE(MAX(q.sortOrder), 0) FROM SurveyTemplateQuestion q WHERE q.template.seq = :templateSeq")
    int findMaxSortOrder(Long templateSeq);
}
