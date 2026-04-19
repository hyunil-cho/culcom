package com.culcom.event;

import com.culcom.entity.complex.member.ComplexMember;
import com.culcom.entity.complex.member.track.AttendanceDetail;
import com.culcom.entity.complex.member.track.ChangeDetail;
import com.culcom.entity.enums.ActivityEventType;
import com.culcom.entity.enums.ActivityFieldType;
import lombok.Getter;

import java.time.LocalDateTime;

@Getter
public class ActivityEvent {

    private final ComplexMember member;
    private final ActivityEventType eventType;
    private final LocalDateTime eventDate;
    private final String note;
    private final ChangeDetail changeDetail;
    private final AttendanceDetail attendanceDetail;
    private final Long memberMembershipSeq;

    private ActivityEvent(ComplexMember member, ActivityEventType eventType, LocalDateTime eventDate,
                          String note, ChangeDetail changeDetail, AttendanceDetail attendanceDetail,
                          Long memberMembershipSeq) {
        this.member = member;
        this.eventType = eventType;
        this.eventDate = eventDate;
        this.note = note;
        this.changeDetail = changeDetail;
        this.attendanceDetail = attendanceDetail;
        this.memberMembershipSeq = memberMembershipSeq;
    }

    public static ActivityEvent of(ComplexMember member, ActivityEventType eventType, String note) {
        return new ActivityEvent(member, eventType, LocalDateTime.now(), note, null, null, null);
    }

    public static ActivityEvent ofMembership(ComplexMember member, ActivityEventType eventType,
                                              Long memberMembershipSeq, String note) {
        return new ActivityEvent(member, eventType, LocalDateTime.now(), note, null, null, memberMembershipSeq);
    }

    public static ActivityEvent withChange(ComplexMember member, ActivityEventType eventType,
                                           ActivityFieldType field, String oldValue, String newValue) {
        ChangeDetail detail = ChangeDetail.builder()
                .fieldName(field).oldValue(oldValue).newValue(newValue).build();
        return new ActivityEvent(member, eventType, LocalDateTime.now(), null, detail, null, null);
    }

    public static ActivityEvent withMembershipChange(ComplexMember member, ActivityEventType eventType,
                                                     Long memberMembershipSeq,
                                                     ActivityFieldType field, String oldValue, String newValue) {
        ChangeDetail detail = ChangeDetail.builder()
                .fieldName(field).oldValue(oldValue).newValue(newValue).build();
        return new ActivityEvent(member, eventType, LocalDateTime.now(), null, detail, null, memberMembershipSeq);
    }

    public static ActivityEvent withAttendance(ComplexMember member, AttendanceDetail attendanceDetail, String note) {
        return new ActivityEvent(member, ActivityEventType.ATTENDANCE, LocalDateTime.now(), note, null, attendanceDetail, null);
    }
}
