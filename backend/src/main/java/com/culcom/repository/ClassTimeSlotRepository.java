package com.culcom.repository;

import com.culcom.entity.complex.clazz.ClassTimeSlot;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface ClassTimeSlotRepository extends JpaRepository<ClassTimeSlot, Long> {

    Optional<ClassTimeSlot> findBySeqAndDeletedFalse(Long seq);

    List<ClassTimeSlot> findByBranchSeqAndDeletedFalse(Long branchSeq);
}
