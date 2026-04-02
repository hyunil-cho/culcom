package com.culcom.repository;

import com.culcom.entity.Notice;
import com.culcom.entity.enums.NoticeCategory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface NoticeRepository extends JpaRepository<Notice, Long> {
    Page<Notice> findByBranchSeqOrderByIsPinnedDescCreatedDateDesc(Long branchSeq, Pageable pageable);
    Page<Notice> findByBranchSeqAndIsActiveOrderByIsPinnedDescCreatedDateDesc(Long branchSeq, Boolean isActive, Pageable pageable);

    // Public board queries (across all branches, active only)
    @EntityGraph(attributePaths = {"branch"})
    Page<Notice> findByIsActiveTrueOrderByIsPinnedDescCreatedDateDesc(Pageable pageable);

    @EntityGraph(attributePaths = {"branch"})
    Page<Notice> findByIsActiveTrueAndCategoryOrderByIsPinnedDescCreatedDateDesc(NoticeCategory category, Pageable pageable);

    @EntityGraph(attributePaths = {"branch"})
    @Query("SELECT n FROM Notice n WHERE n.isActive = true AND n.title LIKE %:keyword% ORDER BY n.isPinned DESC, n.createdDate DESC")
    Page<Notice> findByIsActiveTrueAndTitleContainingOrderByIsPinnedDescCreatedDateDesc(@Param("keyword") String keyword, Pageable pageable);

    @EntityGraph(attributePaths = {"branch"})
    @Query("SELECT n FROM Notice n WHERE n.isActive = true AND n.category = :category AND n.title LIKE %:keyword% ORDER BY n.isPinned DESC, n.createdDate DESC")
    Page<Notice> findByIsActiveTrueAndCategoryAndTitleContainingOrderByIsPinnedDescCreatedDateDesc(@Param("category") NoticeCategory category, @Param("keyword") String keyword, Pageable pageable);
}
