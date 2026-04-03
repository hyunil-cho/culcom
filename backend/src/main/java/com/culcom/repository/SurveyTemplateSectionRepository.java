package com.culcom.repository;

import com.culcom.entity.SurveyTemplateSection;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import java.util.List;

public interface SurveyTemplateSectionRepository extends JpaRepository<SurveyTemplateSection, Long> {
    List<SurveyTemplateSection> findByTemplateSeqOrderBySortOrder(Long templateSeq);
    void deleteByTemplateSeq(Long templateSeq);

    @Query("SELECT COALESCE(MAX(s.sortOrder), 0) FROM SurveyTemplateSection s WHERE s.template.seq = :templateSeq")
    int findMaxSortOrder(Long templateSeq);
}
