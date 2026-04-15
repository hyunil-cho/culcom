package com.culcom.repository;

import com.culcom.entity.complex.member.MembershipPayment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface MembershipPaymentRepository extends JpaRepository<MembershipPayment, Long> {

    List<MembershipPayment> findByMemberMembershipSeqOrderByPaidDateAscSeqAsc(Long mmSeq);

    @Query("SELECT COALESCE(SUM(p.amount), 0) FROM MembershipPayment p WHERE p.memberMembership.seq = :mmSeq")
    Long sumAmountByMemberMembershipSeq(@Param("mmSeq") Long mmSeq);

    @Query("SELECT p FROM MembershipPayment p " +
           "JOIN FETCH p.memberMembership mm " +
           "JOIN FETCH mm.member " +
           "JOIN FETCH mm.membership " +
           "WHERE mm.member.seq = :memberSeq " +
           "ORDER BY p.paidDate DESC, p.seq DESC")
    List<MembershipPayment> findByMemberSeq(@Param("memberSeq") Long memberSeq);

    @Query("SELECT p FROM MembershipPayment p " +
           "JOIN p.memberMembership mm " +
           "WHERE mm.member.seq IN :memberSeqs " +
           "AND p.kind = com.culcom.entity.enums.PaymentKind.DEPOSIT " +
           "ORDER BY p.paidDate ASC, p.seq ASC")
    List<MembershipPayment> findDepositsByMemberSeqs(@Param("memberSeqs") List<Long> memberSeqs);
}
