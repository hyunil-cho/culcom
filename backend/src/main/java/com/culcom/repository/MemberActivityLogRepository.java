package com.culcom.repository;

import com.culcom.entity.complex.member.logs.MemberActivityLog;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface MemberActivityLogRepository extends JpaRepository<MemberActivityLog, Long> {

    List<MemberActivityLog> findByMemberSeqOrderByCreatedDateDesc(Long memberSeq);

    List<MemberActivityLog> findByMemberSeqAndEventTypeOrderByCreatedDateDesc(Long memberSeq, String eventType);
}
