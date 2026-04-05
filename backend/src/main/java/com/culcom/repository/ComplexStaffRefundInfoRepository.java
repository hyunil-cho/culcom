package com.culcom.repository;

import com.culcom.entity.complex.staff.ComplexStaffRefundInfo;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface ComplexStaffRefundInfoRepository extends JpaRepository<ComplexStaffRefundInfo, Long> {
    Optional<ComplexStaffRefundInfo> findByStaffSeq(Long staffSeq);
    void deleteByStaffSeq(Long staffSeq);
}
