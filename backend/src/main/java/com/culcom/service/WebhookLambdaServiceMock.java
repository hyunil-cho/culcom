package com.culcom.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Service;

@Slf4j
@Service
@Profile("test")
public class WebhookLambdaServiceMock implements WebhookLambdaService {

    @Override
    public String deploy() {
        log.info("[Mock] Lambda 배포");
        return "arn:aws:lambda:mock:000000000000:function:mock-webhook";
    }

    @Override
    public String getStatus() {
        log.info("[Mock] Lambda 상태 조회");
        return "Active";
    }

    @Override
    public void destroy() {
        log.info("[Mock] Lambda 삭제");
    }
}
