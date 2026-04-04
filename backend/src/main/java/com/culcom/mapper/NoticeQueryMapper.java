package com.culcom.mapper;

import com.culcom.dto.notice.NoticeListResponse;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.List;

@Mapper
public interface NoticeQueryMapper {

    /** 관리자용 공지 검색 (branchSeq 기준) */
    List<NoticeListResponse> search(
            @Param("branchSeq") Long branchSeq,
            @Param("category") String category,
            @Param("keyword") String keyword,
            @Param("offset") int offset,
            @Param("size") int size);

    int count(
            @Param("branchSeq") Long branchSeq,
            @Param("category") String category,
            @Param("keyword") String keyword);

    /** 공개 게시판용 공지 검색 (isActive=true, branchSeq 없음) */
    List<NoticeListResponse> searchPublic(
            @Param("category") String category,
            @Param("keyword") String keyword,
            @Param("offset") int offset,
            @Param("size") int size);

    int countPublic(
            @Param("category") String category,
            @Param("keyword") String keyword);
}
