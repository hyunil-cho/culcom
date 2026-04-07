package com.culcom.repository;

import com.culcom.entity.complex.member.ComplexMemberMembership;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

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
}
