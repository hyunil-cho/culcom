package com.culcom.repository;

import com.culcom.entity.complex.postponement.ComplexPostponementReturnScanLog;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface ComplexPostponementReturnScanLogRepository extends JpaRepository<ComplexPostponementReturnScanLog, Long> {

    Optional<ComplexPostponementReturnScanLog> findByBranchSeqAndScanDate(Long branchSeq, LocalDate scanDate);

    List<ComplexPostponementReturnScanLog> findByBranchSeqAndScanDateGreaterThanEqualOrderByScanDateDesc(
            Long branchSeq, LocalDate since);
}
