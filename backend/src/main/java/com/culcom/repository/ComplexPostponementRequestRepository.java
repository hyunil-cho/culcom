package com.culcom.repository;

import com.culcom.entity.complex.postponement.ComplexPostponementRequest;
import com.culcom.entity.enums.RequestStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ComplexPostponementRequestRepository extends JpaRepository<ComplexPostponementRequest, Long> {}
