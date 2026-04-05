package com.culcom.repository;

import com.culcom.entity.survey.SurveySubmission;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SurveySubmissionRepository extends JpaRepository<SurveySubmission, Long> {
}
