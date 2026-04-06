package com.culcom.mapper;

import com.culcom.dto.complex.member.MemberActivityTimelineItem;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.List;

@Mapper
public interface MemberActivityMapper {

    List<MemberActivityTimelineItem> selectTimeline(
            @Param("memberSeq") Long memberSeq,
            @Param("offset") int offset,
            @Param("size") int size);

    int countTimeline(@Param("memberSeq") Long memberSeq);

    List<MemberActivityTimelineItem> selectStaffTimeline(
            @Param("staffSeq") Long staffSeq,
            @Param("offset") int offset,
            @Param("size") int size);

    int countStaffTimeline(@Param("staffSeq") Long staffSeq);
}
