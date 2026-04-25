package com.culcom.entity.enums;

/**
 * 공개 단축 링크의 종류.
 *
 * 4종 모두 발급 시점에 회원과 추가 메타데이터(환불 시 멤버십+금액, 양도 시 TransferRequest)를
 * public_links 테이블에 저장하고, /public/s/{code} 경로에서 resolve 시
 * kind 별로 분기하여 적절한 공개 페이지를 렌더한다.
 */
public enum PublicLinkKind {
    멤버십,
    연기,
    환불,
    양도
}
