package com.culcom.service;

import com.culcom.dto.complex.member.OutstandingItemResponse;
import com.culcom.entity.complex.member.ComplexMemberMembership;
import com.culcom.entity.complex.member.MembershipPayment;
import com.culcom.repository.ComplexMemberMembershipRepository;
import com.culcom.util.PriceUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.Comparator;
import java.util.List;
import java.util.Objects;

/**
 * 미수금(outstanding) 조회 서비스.
 * 가격이 String이라 DB 단에서 sum/diff를 못 하므로 in-memory 계산.
 * 지점당 멤버십 수가 수천 단위까지는 충분히 빠름.
 */
@Service
@RequiredArgsConstructor
public class OutstandingService {

    public enum SortKey {
        OUTSTANDING_DESC,   // 미수금 큰 순
        DAYS_DESC,          // 마지막 납부일 오래된 순
        NAME                // 회원명 가나다
    }

    private final ComplexMemberMembershipRepository memberMembershipRepository;

    @Transactional(readOnly = true)
    public Page<OutstandingItemResponse> list(Long branchSeq, String keyword, SortKey sort, Pageable pageable) {
        List<ComplexMemberMembership> all = memberMembershipRepository.findAllForOutstanding(branchSeq);
        LocalDateTime now = LocalDateTime.now();

        String kw = keyword == null ? "" : keyword.trim().toLowerCase();

        List<OutstandingItemResponse> filtered = all.stream()
                .map(mm -> toItem(mm, now))
                .filter(it -> it.getOutstanding() != null && it.getOutstanding() > 0)
                .filter(it -> {
                    if (kw.isEmpty()) return true;
                    return (it.getMemberName() != null && it.getMemberName().toLowerCase().contains(kw))
                            || (it.getPhoneNumber() != null && it.getPhoneNumber().contains(kw));
                })
                .sorted(comparator(sort))
                .toList();

        int from = (int) Math.min(pageable.getOffset(), filtered.size());
        int to = Math.min(from + pageable.getPageSize(), filtered.size());
        return new PageImpl<>(filtered.subList(from, to), pageable, filtered.size());
    }

    private OutstandingItemResponse toItem(ComplexMemberMembership mm, LocalDateTime now) {
        Long price = PriceUtils.parse(mm.getPrice());
        long paid = mm.getPayments() == null ? 0L
                : mm.getPayments().stream().mapToLong(p -> p.getAmount() == null ? 0L : p.getAmount()).sum();
        Long outstanding = price != null ? (price - paid) : null;

        LocalDateTime lastPaidDate = mm.getPayments() == null ? null
                : mm.getPayments().stream()
                    .map(MembershipPayment::getPaidDate)
                    .filter(Objects::nonNull)
                    .max(LocalDateTime::compareTo).orElse(null);
        LocalDateTime referenceDate = lastPaidDate != null ? lastPaidDate : mm.getCreatedDate();
        Long days = referenceDate != null ? Duration.between(referenceDate, now).toDays() : null;

        String status;
        if (price == null) status = "미정";
        else if (paid <= 0) status = "미납";
        else if (paid < price) status = "부분납부";
        else if (paid == price) status = "완납";
        else status = "초과";

        return OutstandingItemResponse.builder()
                .memberSeq(mm.getMember().getSeq())
                .memberName(mm.getMember().getName())
                .phoneNumber(mm.getMember().getPhoneNumber())
                .memberMembershipSeq(mm.getSeq())
                .membershipName(mm.getMembership().getName())
                .price(price)
                .paidAmount(paid)
                .outstanding(outstanding)
                .lastPaidDate(lastPaidDate)
                .daysSinceLastPaid(days)
                .paymentStatus(status)
                .build();
    }

    private Comparator<OutstandingItemResponse> comparator(SortKey sort) {
        return switch (sort == null ? SortKey.OUTSTANDING_DESC : sort) {
            case OUTSTANDING_DESC -> Comparator.comparing(
                    OutstandingItemResponse::getOutstanding, Comparator.nullsLast(Comparator.reverseOrder()));
            case DAYS_DESC -> Comparator.comparing(
                    OutstandingItemResponse::getDaysSinceLastPaid, Comparator.nullsLast(Comparator.reverseOrder()));
            case NAME -> Comparator.comparing(
                    OutstandingItemResponse::getMemberName, Comparator.nullsLast(Comparator.naturalOrder()));
        };
    }

}
