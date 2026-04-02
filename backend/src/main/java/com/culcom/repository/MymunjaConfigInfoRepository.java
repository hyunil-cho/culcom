package com.culcom.repository;

import com.culcom.entity.MymunjaConfigInfo;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.Optional;

public interface MymunjaConfigInfoRepository extends JpaRepository<MymunjaConfigInfo, Long> {

    @Query("SELECT mci.callbackNumber FROM MymunjaConfigInfo mci " +
            "WHERE mci.mapping.branch.seq = :branchSeq " +
            "AND mci.callbackNumber IS NOT NULL AND mci.callbackNumber <> ''")
    List<String> findSenderNumbersByBranchSeq(Long branchSeq);

    Optional<MymunjaConfigInfo> findByMappingMappingSeq(Long mappingSeq);
}