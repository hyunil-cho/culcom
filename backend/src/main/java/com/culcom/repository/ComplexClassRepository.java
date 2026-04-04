package com.culcom.repository;

import com.culcom.entity.complex.clazz.ComplexClass;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;

public interface ComplexClassRepository extends JpaRepository<ComplexClass, Long> {
    List<ComplexClass> findByBranchSeqOrderBySortOrder(Long branchSeq);

    Page<ComplexClass> findByBranchSeqOrderBySortOrder(Long branchSeq, Pageable pageable);

    @Query("SELECT c FROM ComplexClass c LEFT JOIN c.staff s LEFT JOIN c.timeSlot t WHERE c.branch.seq = :branchSeq AND (c.name LIKE %:keyword% OR s.name LIKE %:keyword% OR t.name LIKE %:keyword%) ORDER BY c.sortOrder")
    Page<ComplexClass> searchByBranchSeq(@Param("branchSeq") Long branchSeq, @Param("keyword") String keyword, Pageable pageable);

    @Query("SELECT c FROM ComplexClass c " +
           "JOIN FETCH c.timeSlot t " +
           "LEFT JOIN FETCH c.staff " +
           "WHERE c.branch.seq = :branchSeq " +
           "ORDER BY t.seq, c.sortOrder")
    List<ComplexClass> findAllWithTimeSlotByBranch(@Param("branchSeq") Long branchSeq);

    @Query("SELECT c FROM ComplexClass c " +
           "JOIN FETCH c.timeSlot t " +
           "LEFT JOIN FETCH c.staff " +
           "WHERE t.seq = :timeSlotSeq AND c.branch.seq = :branchSeq " +
           "ORDER BY c.sortOrder")
    List<ComplexClass> findByTimeSlotAndBranch(
            @Param("branchSeq") Long branchSeq, @Param("timeSlotSeq") Long timeSlotSeq);

    @Query("SELECT COALESCE(MAX(c.sortOrder), 0) FROM ComplexClass c WHERE c.branch.seq = :branchSeq")
    int findMaxSortOrderByBranchSeq(@Param("branchSeq") Long branchSeq);
}
