package com.culcom.repository;

import com.culcom.entity.complex.clazz.ComplexClass;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;
import java.util.Optional;

public interface ComplexClassRepository extends JpaRepository<ComplexClass, Long> {

    Optional<ComplexClass> findBySeqAndDeletedFalse(Long seq);

    List<ComplexClass> findByBranchSeqAndDeletedFalseOrderBySortOrder(Long branchSeq);

    Page<ComplexClass> findByBranchSeqAndDeletedFalseOrderBySortOrder(Long branchSeq, Pageable pageable);

    @Query("SELECT c FROM ComplexClass c LEFT JOIN c.staff s LEFT JOIN c.timeSlot t " +
           "WHERE c.branch.seq = :branchSeq AND c.deleted = false AND t.deleted = false " +
           "AND (c.name LIKE %:keyword% OR s.name LIKE %:keyword% OR t.name LIKE %:keyword%) " +
           "ORDER BY c.sortOrder")
    Page<ComplexClass> searchByBranchSeq(@Param("branchSeq") Long branchSeq, @Param("keyword") String keyword, Pageable pageable);

    @Query("SELECT c FROM ComplexClass c " +
           "JOIN FETCH c.timeSlot t " +
           "LEFT JOIN FETCH c.staff " +
           "WHERE c.branch.seq = :branchSeq AND c.deleted = false AND t.deleted = false " +
           "ORDER BY t.seq, c.sortOrder")
    List<ComplexClass> findAllWithTimeSlotByBranch(@Param("branchSeq") Long branchSeq);

    @Query("SELECT c FROM ComplexClass c " +
           "JOIN FETCH c.timeSlot t " +
           "LEFT JOIN FETCH c.staff " +
           "WHERE t.seq = :timeSlotSeq AND c.branch.seq = :branchSeq " +
           "AND c.deleted = false AND t.deleted = false " +
           "ORDER BY c.sortOrder")
    List<ComplexClass> findByTimeSlotAndBranch(
            @Param("branchSeq") Long branchSeq, @Param("timeSlotSeq") Long timeSlotSeq);

    /**
     * sortOrder 자동 부여용. soft-deleted 행은 제외해야 새 sortOrder 가
     * 비현실적으로 커지는 것을 방지한다.
     */
    @Query("SELECT COALESCE(MAX(c.sortOrder), 0) FROM ComplexClass c " +
           "WHERE c.branch.seq = :branchSeq AND c.deleted = false")
    int findMaxSortOrderByBranchSeq(@Param("branchSeq") Long branchSeq);

    List<ComplexClass> findByStaffSeqAndDeletedFalse(Long staffSeq);

    /**
     * 시간대 삭제 가드용 — 해당 timeSlot 을 참조하는 활성 팀이 하나라도 있는지.
     */
    boolean existsByTimeSlotSeqAndDeletedFalse(Long timeSlotSeq);

    long countByTimeSlotSeqAndDeletedFalse(Long timeSlotSeq);
}
