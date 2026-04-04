package com.culcom.repository;

import com.culcom.entity.complex.clazz.ClassTimeSlot;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface ClassTimeSlotRepository extends JpaRepository<ClassTimeSlot, Long> {
    List<ClassTimeSlot> findByBranchSeq(Long branchSeq);
}
