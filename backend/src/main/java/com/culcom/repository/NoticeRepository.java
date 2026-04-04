package com.culcom.repository;

import com.culcom.entity.notice.Notice;
import com.culcom.entity.enums.NoticeCategory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface NoticeRepository extends JpaRepository<Notice, Long> {

    // Admin: branch-scoped queries with filter and search
    @EntityGraph(attributePaths = {"branch"})
    Page<Notice> findByBranchSeqOrderByIsPinnedDescCreatedDateDesc(Long branchSeq, Pageable pageable);

    @EntityGraph(attributePaths = {"branch"})
    Page<Notice> findByBranchSeqAndCategoryOrderByIsPinnedDescCreatedDateDesc(Long branchSeq, NoticeCategory category, Pageable pageable);

    @EntityGraph(attributePaths = {"branch"})
    @Query("SELECT n FROM Notice n WHERE n.branch.seq = :branchSeq AND n.title LIKE %:keyword% ORDER BY n.isPinned DESC, n.createdDate DESC")
    Page<Notice> findByBranchSeqAndTitleContaining(@Param("branchSeq") Long branchSeq, @Param("keyword") String keyword, Pageable pageable);

    @EntityGraph(attributePaths = {"branch"})
    @Query("SELECT n FROM Notice n WHERE n.branch.seq = :branchSeq AND n.category = :category AND n.title LIKE %:keyword% ORDER BY n.isPinned DESC, n.createdDate DESC")
    Page<Notice> findByBranchSeqAndCategoryAndTitleContaining(@Param("branchSeq") Long branchSeq, @Param("category") NoticeCategory category, @Param("keyword") String keyword, Pageable pageable);

    // View count increment
    @Modifying
    @Query("UPDATE Notice n SET n.viewCount = n.viewCount + 1 WHERE n.seq = :seq")
    void incrementViewCount(@Param("seq") Long seq);

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

    Page<Notice> findByBranchSeqAndIsActiveOrderByIsPinnedDescCreatedDateDesc(Long branchSeq, Boolean isActive, Pageable pageable);
}
