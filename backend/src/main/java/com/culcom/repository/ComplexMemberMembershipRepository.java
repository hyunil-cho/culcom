package com.culcom.repository;

import com.culcom.entity.complex.member.ComplexMemberMembership;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface ComplexMemberMembershipRepository extends JpaRepository<ComplexMemberMembership, Long> {
    List<ComplexMemberMembership> findByMemberSeq(Long memberSeq);
    List<ComplexMemberMembership> findByMemberSeqAndInternalFalse(Long memberSeq);

    @Query("SELECT mm FROM ComplexMemberMembership mm " +
           "WHERE mm.member.seq = :memberSeq AND mm.isActive = true " +
           "ORDER BY mm.startDate DESC")
    List<ComplexMemberMembership> findActiveByMemberSeq(@Param("memberSeq") Long memberSeq);

    @Query("SELECT mm FROM ComplexMemberMembership mm " +
           "WHERE mm.member.seq IN :memberSeqs AND mm.isActive = true")
    List<ComplexMemberMembership> findActiveByMemberSeqs(@Param("memberSeqs") List<Long> memberSeqs);

    @Query("SELECT mm FROM ComplexMemberMembership mm " +
           "JOIN FETCH mm.membership " +
           "WHERE mm.member.seq IN :memberSeqs")
    List<ComplexMemberMembership> findByMemberSeqIn(@Param("memberSeqs") List<Long> memberSeqs);
}
