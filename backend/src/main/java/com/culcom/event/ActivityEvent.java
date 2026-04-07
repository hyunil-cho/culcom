package com.culcom.event;

import com.culcom.entity.complex.member.ComplexMember;
import com.culcom.entity.complex.member.logs.AttendanceDetail;
import com.culcom.entity.complex.member.logs.ChangeDetail;
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

    private ActivityEvent(ComplexMember member, ActivityEventType eventType, LocalDateTime eventDate,
                          String note, ChangeDetail changeDetail, AttendanceDetail attendanceDetail) {
        this.member = member;
        this.eventType = eventType;
        this.eventDate = eventDate;
        this.note = note;
        this.changeDetail = changeDetail;
        this.attendanceDetail = attendanceDetail;
    }

    public static ActivityEvent of(ComplexMember member, ActivityEventType eventType, String note) {
        return new ActivityEvent(member, eventType, LocalDateTime.now(), note, null, null);
    }

    public static ActivityEvent withChange(ComplexMember member, ActivityEventType eventType,
                                           ActivityFieldType field, String oldValue, String newValue) {
        ChangeDetail detail = ChangeDetail.builder()
                .fieldName(field).oldValue(oldValue).newValue(newValue).build();
        return new ActivityEvent(member, eventType, LocalDateTime.now(), null, detail, null);
    }

    public static ActivityEvent withAttendance(ComplexMember member, AttendanceDetail attendanceDetail, String note) {
        return new ActivityEvent(member, ActivityEventType.ATTENDANCE, LocalDateTime.now(), note, null, attendanceDetail);
    }
}
