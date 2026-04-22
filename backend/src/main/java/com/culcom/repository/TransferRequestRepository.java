package com.culcom.repository;

import com.culcom.entity.enums.TransferStatus;
import com.culcom.entity.transfer.TransferRequest;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface TransferRequestRepository extends JpaRepository<TransferRequest, Long> {
    Optional<TransferRequest> findByToken(String token);
    Optional<TransferRequest> findByInviteToken(String inviteToken);

    /**
     * 지점 + 이름/전화번호(선택) + active 필터(선택) 조합 목록.
     * 이름/전화번호는 fromMember 또는 toCustomer 어느쪽과도 부분 매칭되면 반환한다.
     *
     * @param name       null/빈값이면 이름 필터 스킵
     * @param phone      null/빈값이면 전화 필터 스킵
     * @param activeOnly true → 생성/접수만, false → 전체 상태
     */
    /**
     * 지점 + 양수자(toCustomer) 이름/전화번호(선택) + active 필터(선택) + 단일 상태(선택) 조합 목록.
     * {@code status}가 지정되면 해당 상태만, 없으면 {@code activeOnly} 여부로 생성/접수만 / 전체.
     *
     * 양수자 정보는 양수자가 invite 폼을 제출한 이후(접수 이후)에만 세팅되므로,
     * name/phone이 있으면 생성(양수자 미접수) 상태 요청은 자동으로 제외된다.
     */
    @Query(value = "SELECT tr FROM TransferRequest tr " +
           "JOIN FETCH tr.memberMembership mm " +
           "JOIN FETCH mm.membership " +
           "JOIN FETCH tr.fromMember fm " +
           "LEFT JOIN tr.toCustomer tc " +
           "WHERE tr.branch.seq = :branchSeq " +
           "  AND mm.status = com.culcom.entity.enums.MembershipStatus.활성 " +
           "  AND (:includeReferenced = true OR tr.referenced = false) " +
           "  AND (:status IS NULL AND (:activeOnly = false OR tr.status IN (" +
           "         com.culcom.entity.enums.TransferStatus.생성, " +
           "         com.culcom.entity.enums.TransferStatus.접수)) " +
           "       OR :status IS NOT NULL AND tr.status = :status) " +
           "  AND (:name IS NULL OR :name = '' " +
           "       OR (tc IS NOT NULL AND LOWER(tc.name) LIKE LOWER(CONCAT('%', :name, '%')))) " +
           "  AND (:phone IS NULL OR :phone = '' " +
           "       OR (tc IS NOT NULL AND tc.phoneNumber LIKE CONCAT('%', :phone, '%')))",
           countQuery = "SELECT COUNT(tr) FROM TransferRequest tr " +
           "JOIN tr.memberMembership mm " +
           "LEFT JOIN tr.toCustomer tc " +
           "WHERE tr.branch.seq = :branchSeq " +
           "  AND mm.status = com.culcom.entity.enums.MembershipStatus.활성 " +
           "  AND (:includeReferenced = true OR tr.referenced = false) " +
           "  AND (:status IS NULL AND (:activeOnly = false OR tr.status IN (" +
           "         com.culcom.entity.enums.TransferStatus.생성, " +
           "         com.culcom.entity.enums.TransferStatus.접수)) " +
           "       OR :status IS NOT NULL AND tr.status = :status) " +
           "  AND (:name IS NULL OR :name = '' " +
           "       OR (tc IS NOT NULL AND LOWER(tc.name) LIKE LOWER(CONCAT('%', :name, '%')))) " +
           "  AND (:phone IS NULL OR :phone = '' " +
           "       OR (tc IS NOT NULL AND tc.phoneNumber LIKE CONCAT('%', :phone, '%')))")
    Page<TransferRequest> findFiltered(@Param("branchSeq") Long branchSeq,
                                       @Param("name") String name,
                                       @Param("phone") String phone,
                                       @Param("activeOnly") boolean activeOnly,
                                       @Param("status") TransferStatus status,
                                       @Param("includeReferenced") boolean includeReferenced,
                                       Pageable pageable);

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
