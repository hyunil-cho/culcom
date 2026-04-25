package com.culcom.repository;

import com.culcom.entity.customer.Customer;
import com.culcom.entity.enums.CustomerStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface CustomerRepository extends JpaRepository<Customer, Long> {

    Page<Customer> findByBranchSeq(Long branchSeq, Pageable pageable);

    Optional<Customer> findByKakaoId(Long kakaoId);

    boolean existsByPhoneNumber(String phoneNumber);
}
