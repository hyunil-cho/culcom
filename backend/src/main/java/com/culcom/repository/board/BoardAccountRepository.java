package com.culcom.repository.board;

import com.culcom.entity.board.BoardAccount;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface BoardAccountRepository extends JpaRepository<BoardAccount, Long> {

    Optional<BoardAccount> findByEmail(String email);

    boolean existsByEmail(String email);

    boolean existsByPhoneNumber(String phoneNumber);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("delete from BoardAccount b where b.customer.seq = :customerSeq")
    void deleteByCustomerSeq(@Param("customerSeq") Long customerSeq);
}
