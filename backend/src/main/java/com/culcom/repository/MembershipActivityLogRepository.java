package com.culcom.repository;

import com.culcom.entity.complex.member.MembershipActivityLog;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface MembershipActivityLogRepository extends JpaRepository<MembershipActivityLog, Long> {

    List<MembershipActivityLog> findByMemberSeqOrderByCreatedDateDesc(Long memberSeq);

    List<MembershipActivityLog> findByStaffSeqOrderByCreatedDateDesc(Long staffSeq);

    List<MembershipActivityLog> findByMembershipSeqOrderByCreatedDateDesc(Long membershipSeq);
}
