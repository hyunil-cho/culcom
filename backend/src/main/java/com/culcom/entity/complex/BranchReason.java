package com.culcom.entity.complex;

import com.culcom.entity.branch.Branch;

/**
 * ComplexRefundReason, ComplexPostponementReason 등
 * branch + reason 구조를 공유하는 사유 엔티티 인터페이스.
 */
public interface BranchReason {
    Long getSeq();
    String getReason();
    void setBranch(Branch branch);
    java.time.LocalDateTime getCreatedDate();
}
