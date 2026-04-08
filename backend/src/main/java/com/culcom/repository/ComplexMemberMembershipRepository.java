package com.culcom.repository;

import com.culcom.entity.complex.member.ComplexMemberMembership;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;

public interface ComplexMemberMembershipRepository extends JpaRepository<ComplexMemberMembership, Long> {
    List<ComplexMemberMembership> findByMemberSeqAndInternalFalse(Long memberSeq);

    List<ComplexMemberMembership> findByMemberSeqAndInternalTrue(Long memberSeq);

    @Query("SELECT mm FROM ComplexMemberMembership mm " +
           "WHERE mm.member.seq IN :memberSeqs AND mm.status = com.culcom.entity.enums.MembershipStatus.활성")
    List<ComplexMemberMembership> findActiveByMemberSeqIn(@Param("memberSeqs") List<Long> memberSeqs);

    @Query("SELECT mm FROM ComplexMemberMembership mm " +
           "JOIN FETCH mm.membership " +
           "WHERE mm.member.seq IN :memberSeqs")
    List<ComplexMemberMembership> findWithMembershipByMemberSeqIn(@Param("memberSeqs") List<Long> memberSeqs);

    @Query("SELECT COUNT(mm) > 0 FROM ComplexMemberMembership mm " +
           "WHERE mm.member.seq = :memberSeq AND mm.status = com.culcom.entity.enums.MembershipStatus.활성")
    boolean existsActiveByMemberSeq(@Param("memberSeq") Long memberSeq);

    @Query("SELECT COUNT(mm) > 0 FROM ComplexMemberMembership mm " +
           "WHERE mm.member.seq = :memberSeq AND mm.status = com.culcom.entity.enums.MembershipStatus.활성 AND mm.seq <> :excludeMmSeq")
    boolean existsActiveByMemberSeqExcluding(@Param("memberSeq") Long memberSeq,
                                             @Param("excludeMmSeq") Long excludeMmSeq);

    @Query("SELECT DISTINCT mm FROM ComplexMemberMembership mm " +
           "JOIN FETCH mm.member m " +
           "JOIN FETCH mm.membership " +
           "LEFT JOIN FETCH mm.payments " +
           "WHERE m.branch.seq = :branchSeq AND mm.internal = false")
    List<ComplexMemberMembership> findAllForOutstanding(@Param("branchSeq") Long branchSeq);

    /**
     * 만료 임박: 활성 상태이며 만료일이 today 와 today+windowDays 사이.
     * 정렬은 호출부에서 처리.
     */
    @Query("SELECT mm FROM ComplexMemberMembership mm " +
           "JOIN FETCH mm.member m " +
           "JOIN FETCH mm.membership " +
           "WHERE m.branch.seq = :branchSeq " +
           "  AND mm.internal = false " +
           "  AND mm.status = com.culcom.entity.enums.MembershipStatus.활성 " +
           "  AND mm.expiryDate >= :today " +
           "  AND mm.expiryDate <= :until")
    List<ComplexMemberMembership> findExpiringSoon(@Param("branchSeq") Long branchSeq,
                                                   @Param("today") LocalDate today,
                                                   @Param("until") LocalDate until);

    /**
     * 이미 만료: 활성 상태로 남아있지만 만료일이 지난 것. since~today 범위 내.
     */
    @Query("SELECT mm FROM ComplexMemberMembership mm " +
           "JOIN FETCH mm.member m " +
           "JOIN FETCH mm.membership " +
           "WHERE m.branch.seq = :branchSeq " +
           "  AND mm.internal = false " +
           "  AND mm.status = com.culcom.entity.enums.MembershipStatus.활성 " +
           "  AND mm.expiryDate < :today " +
           "  AND mm.expiryDate >= :since")
    List<ComplexMemberMembership> findRecentlyExpired(@Param("branchSeq") Long branchSeq,
                                                      @Param("today") LocalDate today,
                                                      @Param("since") LocalDate since);

    /**
     * 잔여 횟수 임박: 활성/만료 전이며 (totalCount - usedCount) <= threshold.
     */
    @Query("SELECT mm FROM ComplexMemberMembership mm " +
           "JOIN FETCH mm.member m " +
           "JOIN FETCH mm.membership " +
           "WHERE m.branch.seq = :branchSeq " +
           "  AND mm.internal = false " +
           "  AND mm.status = com.culcom.entity.enums.MembershipStatus.활성 " +
           "  AND mm.expiryDate >= :today " +
           "  AND (mm.totalCount - mm.usedCount) <= :threshold " +
           "  AND (mm.totalCount - mm.usedCount) >= 0")
    List<ComplexMemberMembership> findLowRemaining(@Param("branchSeq") Long branchSeq,
                                                   @Param("today") LocalDate today,
                                                   @Param("threshold") int threshold);
}
