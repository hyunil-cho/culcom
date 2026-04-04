package com.culcom.mapper;

import com.culcom.dto.webhook.WebhookLogResponse;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.List;

@Mapper
public interface WebhookLogQueryMapper {

    List<WebhookLogResponse> search(
            @Param("branchSeq") Long branchSeq,
            @Param("webhookSeq") Long webhookSeq,
            @Param("status") String status,
            @Param("offset") int offset,
            @Param("size") int size);

    int count(
            @Param("branchSeq") Long branchSeq,
            @Param("webhookSeq") Long webhookSeq,
            @Param("status") String status);
}
