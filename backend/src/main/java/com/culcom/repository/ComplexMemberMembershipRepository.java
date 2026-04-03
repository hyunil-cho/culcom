package com.culcom.repository;

import com.culcom.entity.ComplexMemberMembership;
import com.culcom.entity.enums.MembershipStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface ComplexMemberMembershipRepository extends JpaRepository<ComplexMemberMembership, Long> {
    List<ComplexMemberMembership> findByMemberSeq(Long memberSeq);

    @Query("SELECT mm FROM ComplexMemberMembership mm " +
           "WHERE mm.member.seq = :memberSeq AND mm.status = :status " +
           "ORDER BY mm.expiryDate DESC")
    List<ComplexMemberMembership> findByMemberSeqAndStatus(
            @Param("memberSeq") Long memberSeq, @Param("status") MembershipStatus status);

    @Query("SELECT mm FROM ComplexMemberMembership mm " +
           "WHERE mm.member.seq IN :memberSeqs AND mm.status = :status")
    List<ComplexMemberMembership> findByMemberSeqsAndStatus(
            @Param("memberSeqs") List<Long> memberSeqs, @Param("status") MembershipStatus status);
}
