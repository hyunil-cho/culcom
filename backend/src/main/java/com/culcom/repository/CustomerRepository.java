package com.culcom.repository;

import com.culcom.entity.Customer;
import com.culcom.entity.enums.CustomerStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface CustomerRepository extends JpaRepository<Customer, Long> {

    Page<Customer> findByBranchSeq(Long branchSeq, Pageable pageable);

    Page<Customer> findByBranchSeqAndStatusIn(Long branchSeq, java.util.List<CustomerStatus> statuses, Pageable pageable);

    @Query("SELECT c FROM Customer c WHERE c.branch.seq = :branchSeq AND c.name LIKE %:keyword%")
    Page<Customer> findByBranchSeqAndNameContaining(@Param("branchSeq") Long branchSeq, @Param("keyword") String keyword, Pageable pageable);

    @Query("SELECT c FROM Customer c WHERE c.branch.seq = :branchSeq AND c.phoneNumber LIKE %:keyword%")
    Page<Customer> findByBranchSeqAndPhoneNumberContaining(@Param("branchSeq") Long branchSeq, @Param("keyword") String keyword, Pageable pageable);

    long countByBranchSeq(Long branchSeq);

    @Query("SELECT COUNT(c) FROM Customer c WHERE c.branch.seq = :branchSeq AND FUNCTION('DATE', c.createdDate) = CURRENT_DATE")
    long countTodayByBranchSeq(@Param("branchSeq") Long branchSeq);
}
