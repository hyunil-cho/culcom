package com.culcom.service;

import com.culcom.entity.complex.member.ComplexMember;
import com.culcom.entity.complex.member.ComplexMemberMembership;
import com.culcom.entity.enums.ActivityEventType;
import com.culcom.entity.enums.RequestStatus;
import com.culcom.event.ActivityEvent;
import org.springframework.context.ApplicationEventPublisher;

/**
 * 환불/연기 등 요청 상태 변경 시 공통 이벤트 발행 로직.
 */
public final class RequestStatusEventHelper {

    private RequestStatusEventHelper() {}

    public static void publishStatusChangeEvent(
            ApplicationEventPublisher publisher,
            ComplexMember member,
            ComplexMemberMembership membership,
            RequestStatus status,
            String rejectReason,
            ActivityEventType approveType,
            ActivityEventType rejectType,
            String notePrefix) {
        if (member == null) return;

        ActivityEventType eventType = status == RequestStatus.승인 ? approveType : rejectType;
        String note = notePrefix;
        if (status == RequestStatus.반려 && rejectReason != null) {
            note += " (사유: " + rejectReason + ")";
        }
        Long mmSeq = membership != null ? membership.getSeq() : null;
        publisher.publishEvent(ActivityEvent.ofMembership(member, eventType, mmSeq, note));
    }
}
