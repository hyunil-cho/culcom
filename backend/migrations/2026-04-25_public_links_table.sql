-- =============================================================================
-- Migration: 2026-04-25
--   public_links 테이블 신규 추가
--
--   목적: SMS 자동 링크 파서 한계(URL ~200자 이상 불안정)를 회피하기 위한
--         단축 코드(8자) 발급·보관 테이블. 4종 공개 링크
--         (멤버십 조회 / 연기 요청 / 환불 요청 / 양도) 모두 이 테이블을 경유한다.
--
--   설계 메모
--     - kind 별로 nullable 컬럼이 다름:
--         · 멤버십, 연기 — member_seq 만 사용
--         · 환불        — member_seq + member_membership_seq + refund_amount
--         · 양도        — member_seq + transfer_request_seq (FK)
--     - expires_at 은 발급 시점 + 7일을 서버에서 명시 set
--     - code 는 8자 영숫자 [A-Za-z0-9] (62^8 ≈ 218조)
--
-- 대상 DBMS : MySQL (stg / prod)
-- 로컬 H2 (ddl-auto: create) 에는 자동 반영되므로 별도 실행 불필요
-- =============================================================================

CREATE TABLE public_links (
    seq                       BIGINT      NOT NULL AUTO_INCREMENT,
    code                      VARCHAR(16) NOT NULL,
    kind                      VARCHAR(20) NOT NULL,
    member_seq                BIGINT      NOT NULL,
    member_membership_seq     BIGINT      NULL,
    refund_amount             INT         NULL,
    transfer_request_seq      BIGINT      NULL,
    expires_at                DATETIME(6) NOT NULL,
    created_date              DATETIME(6) NOT NULL,
    last_update_date          DATETIME(6) NULL,
    PRIMARY KEY (seq),
    CONSTRAINT uk_public_links_code UNIQUE (code),
    CONSTRAINT fk_public_links_member
        FOREIGN KEY (member_seq) REFERENCES complex_members (seq),
    CONSTRAINT fk_public_links_member_membership
        FOREIGN KEY (member_membership_seq) REFERENCES complex_member_memberships (seq),
    CONSTRAINT fk_public_links_transfer_request
        FOREIGN KEY (transfer_request_seq) REFERENCES transfer_requests (seq)
);

-- ─────────────────────────────────────────────────────────────────────────────
-- ROLLBACK
--   DROP TABLE public_links;
-- ─────────────────────────────────────────────────────────────────────────────
