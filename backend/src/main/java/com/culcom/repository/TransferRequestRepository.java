package com.culcom.repository;

import com.culcom.entity.transfer.TransferRequest;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface TransferRequestRepository extends JpaRepository<TransferRequest, Long> {
    Optional<TransferRequest> findByToken(String token);
    Optional<TransferRequest> findByInviteToken(String inviteToken);
}
