package com.culcom.repository;

import com.culcom.entity.complex.member.logs.MemberActivityLog;
import com.culcom.entity.enums.ActivityEventType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;

public interface MemberActivityLogRepository extends JpaRepository<MemberActivityLog, Long> {

    List<MemberActivityLog> findByMemberSeqOrderByCreatedDateDesc(Long memberSeq);

    List<MemberActivityLog> findByMemberSeqAndEventTypeOrderByCreatedDateDesc(Long memberSeq, String eventType);

    /**
     * 특정 지점에서 [from, to) 사이에 발생한 멤버십 자동 만료 로그.
     * 노트의 키워드(기간 만료/소진)로 자동 만료 여부를 식별한다.
     */
    @Query("SELECT log FROM MemberActivityLog log " +
           "JOIN FETCH log.member m " +
           "WHERE m.branch.seq = :branchSeq " +
           "  AND log.eventType = com.culcom.entity.enums.ActivityEventType.MEMBERSHIP_UPDATE " +
           "  AND log.eventDate >= :from " +
           "  AND log.eventDate < :to " +
           "  AND (log.note LIKE '%기간 만료%' OR log.note LIKE '%소진%') " +
           "ORDER BY log.eventDate DESC")
    List<MemberActivityLog> findAutoExpiredBetween(@Param("branchSeq") Long branchSeq,
                                                   @Param("from") LocalDateTime from,
                                                   @Param("to") LocalDateTime to);
}
