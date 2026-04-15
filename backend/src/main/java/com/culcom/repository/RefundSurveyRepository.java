package com.culcom.repository;

import com.culcom.entity.complex.refund.RefundSurvey;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface RefundSurveyRepository extends JpaRepository<RefundSurvey, Long> {

    Optional<RefundSurvey> findByRefundRequestSeq(Long refundRequestSeq);

    boolean existsByRefundRequestSeq(Long refundRequestSeq);
}
