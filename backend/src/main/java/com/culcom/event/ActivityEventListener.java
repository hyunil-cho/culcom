package com.culcom.event;

import com.culcom.entity.complex.member.logs.MemberActivityLog;
import com.culcom.repository.MemberActivityLogRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

@Component
@RequiredArgsConstructor
public class ActivityEventListener {

    private final MemberActivityLogRepository activityLogRepository;

    @TransactionalEventListener(phase = TransactionPhase.BEFORE_COMMIT)
    public void handle(ActivityEvent event) {
        activityLogRepository.save(MemberActivityLog.builder()
                .member(event.getMember())
                .eventType(event.getEventType())
                .eventDate(event.getEventDate())
                .note(event.getNote())
                .changeDetail(event.getChangeDetail())
                .attendanceDetail(event.getAttendanceDetail())
                .memberMembershipSeq(event.getMemberMembershipSeq())
                .build());
    }
}
