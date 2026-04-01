package com.culcom.repository;

import com.culcom.entity.Notice;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface NoticeRepository extends JpaRepository<Notice, Long> {
    Page<Notice> findByBranchSeqOrderByIsPinnedDescCreatedDateDesc(Long branchSeq, Pageable pageable);
    Page<Notice> findByBranchSeqAndIsActiveOrderByIsPinnedDescCreatedDateDesc(Long branchSeq, Boolean isActive, Pageable pageable);
}
