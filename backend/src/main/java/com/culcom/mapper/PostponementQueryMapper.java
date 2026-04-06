package com.culcom.mapper;

import com.culcom.dto.complex.postponement.PostponementResponse;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.List;

@Mapper
public interface PostponementQueryMapper {

    List<PostponementResponse> search(
            @Param("branchSeq") Long branchSeq,
            @Param("status") String status,
            @Param("keyword") String keyword,
            @Param("offset") int offset,
            @Param("size") int size);

    int count(
            @Param("branchSeq") Long branchSeq,
            @Param("status") String status,
            @Param("keyword") String keyword);

    List<PostponementResponse> findByMemberSeq(@Param("memberSeq") Long memberSeq);
}
