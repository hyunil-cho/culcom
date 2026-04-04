package com.culcom.mapper;

import com.culcom.dto.complex.classes.ComplexClassResponse;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.List;

@Mapper
public interface ComplexClassQueryMapper {

    List<ComplexClassResponse> search(
            @Param("branchSeq") Long branchSeq,
            @Param("keyword") String keyword,
            @Param("offset") int offset,
            @Param("size") int size);

    int count(
            @Param("branchSeq") Long branchSeq,
            @Param("keyword") String keyword);
}
