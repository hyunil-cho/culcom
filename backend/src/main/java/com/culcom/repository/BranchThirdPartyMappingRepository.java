package com.culcom.repository;

import com.culcom.entity.branch.BranchThirdPartyMapping;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface BranchThirdPartyMappingRepository extends JpaRepository<BranchThirdPartyMapping, Long> {
    List<BranchThirdPartyMapping> findByBranchSeq(Long branchSeq);
    Optional<BranchThirdPartyMapping> findByBranchSeqAndThirdPartyServiceSeq(Long branchSeq, Long thirdPartyServiceSeq);
}
