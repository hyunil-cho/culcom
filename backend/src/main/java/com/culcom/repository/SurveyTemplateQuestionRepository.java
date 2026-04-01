package com.culcom.repository;

import com.culcom.entity.SurveyTemplateQuestion;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface SurveyTemplateQuestionRepository extends JpaRepository<SurveyTemplateQuestion, Long> {
    List<SurveyTemplateQuestion> findByTemplateSeqOrderBySortOrder(Long templateSeq);
}
