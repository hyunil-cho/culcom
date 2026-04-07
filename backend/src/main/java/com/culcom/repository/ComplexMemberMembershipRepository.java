package com.culcom.repository;

import com.culcom.entity.complex.member.ComplexMemberMembership;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface ComplexMemberMembershipRepository extends JpaRepository<ComplexMemberMembership, Long> {
    List<ComplexMemberMembership> findByMemberSeqAndInternalFalse(Long memberSeq);

    @Query("SELECT mm FROM ComplexMemberMembership mm " +
           "WHERE mm.member.seq IN :memberSeqs AND mm.isActive = true")
    List<ComplexMemberMembership> findActiveByMemberSeqIn(@Param("memberSeqs") List<Long> memberSeqs);

    @Query("SELECT mm FROM ComplexMemberMembership mm " +
           "JOIN FETCH mm.membership " +
           "WHERE mm.member.seq IN :memberSeqs")
    List<ComplexMemberMembership> findWithMembershipByMemberSeqIn(@Param("memberSeqs") List<Long> memberSeqs);

    @Query("SELECT COUNT(mm) > 0 FROM ComplexMemberMembership mm " +
           "WHERE mm.member.seq = :memberSeq AND mm.isActive = true")
    boolean existsActiveByMemberSeq(@Param("memberSeq") Long memberSeq);

    @Query("SELECT COUNT(mm) > 0 FROM ComplexMemberMembership mm " +
           "WHERE mm.member.seq = :memberSeq AND mm.isActive = true AND mm.seq <> :excludeMmSeq")
    boolean existsActiveByMemberSeqExcluding(@Param("memberSeq") Long memberSeq,
                                             @Param("excludeMmSeq") Long excludeMmSeq);
}
