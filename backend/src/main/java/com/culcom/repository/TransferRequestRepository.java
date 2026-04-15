package com.culcom.repository;

import com.culcom.entity.transfer.TransferRequest;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface TransferRequestRepository extends JpaRepository<TransferRequest, Long> {
    Optional<TransferRequest> findByToken(String token);
    Optional<TransferRequest> findByInviteToken(String inviteToken);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("delete from TransferRequest tr where tr.toCustomer.seq = :customerSeq")
    void deleteByToCustomerSeq(@Param("customerSeq") Long customerSeq);

    @Query("SELECT tr FROM TransferRequest tr " +
           "JOIN FETCH tr.memberMembership mm " +
           "JOIN FETCH mm.membership " +
           "JOIN FETCH tr.fromMember " +
           "WHERE tr.toCustomer.seq = :customerSeq " +
           "  AND tr.status = com.culcom.entity.enums.TransferStatus.접수")
    Optional<TransferRequest> findPendingByToCustomerSeq(@Param("customerSeq") Long customerSeq);

    @Query("SELECT tr FROM TransferRequest tr " +
           "JOIN FETCH tr.memberMembership mm " +
           "JOIN FETCH mm.membership " +
           "JOIN FETCH tr.fromMember " +
           "JOIN tr.toCustomer c " +
           "WHERE c.name = :name AND c.phoneNumber = :phone " +
           "  AND tr.status = com.culcom.entity.enums.TransferStatus.접수")
    Optional<TransferRequest> findPendingByToCustomerNameAndPhone(
            @Param("name") String name, @Param("phone") String phone);
}
