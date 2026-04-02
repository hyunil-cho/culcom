package com.culcom.service;

/**
 * 웹훅 Lambda 함수 배포/관리 인터페이스.
 * 단일 Lambda 함수가 /webhook/{id} 라우트를 처리한다.
 * 웹훅 설정은 DB에서 id로 조회하므로, Lambda 배포는 최초 1회만 수행한다.
 */
public interface WebhookLambdaService {

    /**
     * Lambda 함수 + API Gateway 라우트를 배포한다 (최초 1회).
     * 이미 존재하면 코드를 업데이트한다.
     * @return Lambda 함수의 ARN
     */
    String deploy();

    /**
     * Lambda 함수의 현재 상태를 조회한다.
     * @return 상태 문자열 (예: "Active", "Pending", "NotFound")
     */
    String getStatus();

    /**
     * Lambda 함수를 삭제한다.
     */
    void destroy();
}
