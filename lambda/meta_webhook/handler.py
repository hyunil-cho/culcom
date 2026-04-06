"""
Meta Lead Ads 전용 웹훅 핸들러.

Meta에서 leadgen 이벤트가 오면:
1. HMAC-SHA256 서명 검증
2. Graph API로 리드 상세정보 조회 (이름, 전화번호, 광고명 등)
3. customers 테이블에 INSERT
4. webhook_logs에 원본 + 파싱 데이터 저장

환경변수:
  DB_HOST, DB_PORT, DB_NAME, DB_USERNAME, DB_PASSWORD
  META_APP_SECRET       — HMAC 서명 검증용
  META_VERIFY_TOKEN     — 구독 확인(handshake)용
  META_ACCESS_TOKEN     — Graph API 호출용
  BRANCH_SEQ            — 고객이 소속될 지점 seq
"""

import base64
import hashlib
import hmac
import json
import logging
import os
from datetime import datetime
from urllib.request import Request, urlopen
from urllib.error import URLError

logger = logging.getLogger()
logger.setLevel(logging.INFO)

import pymysql

_connection = None

GRAPH_API_URL = "https://graph.facebook.com/v21.0"


# ── DB ──

def get_connection():
    global _connection
    if _connection is not None:
        try:
            _connection.ping(reconnect=True)
            return _connection
        except Exception:
            _connection = None

    _connection = pymysql.connect(
        host=os.environ["DB_HOST"],
        port=int(os.environ.get("DB_PORT", "3306")),
        user=os.environ["DB_USERNAME"],
        password=os.environ["DB_PASSWORD"],
        database=os.environ["DB_NAME"],
        charset="utf8mb4",
        cursorclass=pymysql.cursors.DictCursor,
        connect_timeout=10,
    )
    return _connection


# ── 핸들러 ──

def handler(event, context):
    method = (event.get("requestContext", {})
              .get("http", {}).get("method", "POST"))
    raw_body = event.get("body", "")
    remote_ip = (event.get("requestContext", {})
                 .get("http", {}).get("sourceIp", ""))

    # GET: Meta 구독 확인 (handshake)
    if method == "GET":
        return _handle_handshake(event)

    # POST: 서명 검증
    if not _verify_signature(event, raw_body):
        _save_log(None, raw_body, None, None, 401, "FAILED",
                  "HMAC 서명 검증 실패", remote_ip)
        return _response(401, {"error": "invalid signature"})

    try:
        body = json.loads(
            base64.b64decode(raw_body).decode("utf-8")
            if event.get("isBase64Encoded") else raw_body
        )
    except Exception:
        _save_log(None, raw_body, None, None, 400, "FAILED",
                  "JSON 파싱 실패", remote_ip)
        return _response(400, {"error": "invalid json"})

    if body.get("object") != "page":
        _save_log(None, raw_body, None, None, 200, "SKIPPED",
                  f"object={body.get('object')}, page 아님", remote_ip)
        return _response(200, {"success": True})

    # entry → changes → leadgen 이벤트 처리
    access_token = os.environ["META_ACCESS_TOKEN"]
    branch_seq = int(os.environ["BRANCH_SEQ"])
    processed = 0

    for entry in body.get("entry", []):
        for change in entry.get("changes", []):
            if change.get("field") != "leadgen":
                continue

            leadgen_id = change.get("value", {}).get("leadgen_id")
            if not leadgen_id:
                continue

            try:
                lead = _fetch_lead(leadgen_id, access_token)
                if lead is None:
                    _save_log(None, raw_body, {"leadgen_id": leadgen_id}, None,
                              502, "FAILED",
                              f"Graph API 조회 실패: {leadgen_id}", remote_ip)
                    continue

                customer_data = _extract_customer(lead)
                if not customer_data.get("name"):
                    _save_log(None, raw_body, lead, None, 400, "FAILED",
                              "리드에 이름 없음", remote_ip)
                    continue

                customer_seq = _insert_customer(branch_seq, customer_data)
                _save_log(customer_seq, raw_body, lead, customer_data,
                          200, "SUCCESS", None, remote_ip)
                processed += 1
                logger.info("Customer inserted: seq=%s, name=%s",
                            customer_seq, customer_data.get("name"))

            except Exception as e:
                logger.exception("Lead 처리 실패: %s", leadgen_id)
                _save_log(None, raw_body, {"leadgen_id": leadgen_id}, None,
                          500, "FAILED", str(e)[:500], remote_ip)

    return _response(200, {"success": True, "processed": processed})


# ── Meta 인증 ──

def _handle_handshake(event):
    qs = event.get("queryStringParameters") or {}
    if qs.get("hub.mode") != "subscribe":
        return _response(400, {"error": "not a subscription request"})

    verify_token = os.environ.get("META_VERIFY_TOKEN", "")
    if qs.get("hub.verify_token") != verify_token:
        return _response(403, {"error": "invalid verify token"})

    return {
        "statusCode": 200,
        "headers": {"Content-Type": "text/plain"},
        "body": qs.get("hub.challenge", ""),
    }


def _verify_signature(event, raw_body):
    secret = os.environ.get("META_APP_SECRET", "")
    if not secret:
        return False

    headers = event.get("headers", {})
    signature = headers.get("x-hub-signature-256", "")
    if not signature:
        return False

    body_bytes = (raw_body or "").encode("utf-8")
    expected = "sha256=" + hmac.new(
        secret.encode("utf-8"), body_bytes, hashlib.sha256
    ).hexdigest()

    return hmac.compare_digest(expected, signature)


# ── Graph API ──

def _fetch_lead(leadgen_id, access_token):
    """Graph API로 리드 상세정보 조회."""
    url = (f"{GRAPH_API_URL}/{leadgen_id}"
           f"?access_token={access_token}"
           f"&fields=id,created_time,ad_id,ad_name,adgroup_name,"
           f"campaign_name,form_id,field_data")
    try:
        req = Request(url)
        with urlopen(req, timeout=10) as resp:
            return json.loads(resp.read().decode("utf-8"))
    except URLError as e:
        logger.error("Graph API 호출 실패: %s", e)
        return None


def _extract_customer(lead):
    """Graph API 응답에서 고객 데이터 추출."""
    fields = {}
    for item in lead.get("field_data", []):
        field_name = item.get("name", "")
        values = item.get("values", [])
        if values:
            fields[field_name] = values[0]

    return {
        "name": fields.get("full_name") or fields.get("이름") or "",
        "phoneNumber": fields.get("phone_number") or fields.get("전화번호") or "",
        "commercialName": lead.get("ad_name") or "",
        "adSource": lead.get("campaign_name") or lead.get("adgroup_name") or "",
    }


# ── DB 저장 ──

def _insert_customer(branch_seq, data):
    conn = get_connection()
    now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    sql = """
        INSERT INTO customers (branch_seq, name, phone_number,
                               commercial_name, ad_source, status, createdDate)
        VALUES (%s, %s, %s, %s, %s, '신규', %s)
    """
    with conn.cursor() as cur:
        cur.execute(sql, (
            branch_seq,
            data.get("name", ""),
            data.get("phoneNumber", ""),
            data.get("commercialName") or None,
            data.get("adSource") or None,
            now,
        ))
    conn.commit()

    with conn.cursor() as cur:
        cur.execute("SELECT LAST_INSERT_ID() AS seq")
        return cur.fetchone()["seq"]


def _save_log(customer_seq, raw_request, parsed_data, mapped_data,
              http_status, status, error_message, remote_ip):
    try:
        conn = get_connection()
        branch_seq = int(os.environ.get("BRANCH_SEQ", "0"))
        now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

        sql = """
            INSERT INTO webhook_logs
            (webhook_config_seq, branch_seq, source_name, customer_seq,
             raw_request, parsed_params, mapped_data,
             http_status_code, status, error_message, remote_ip, createdDate)
            VALUES (NULL, %s, 'meta_lead_ads', %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """
        with conn.cursor() as cur:
            cur.execute(sql, (
                branch_seq,
                customer_seq,
                (raw_request or "")[:5000],
                json.dumps(parsed_data, ensure_ascii=False)[:5000] if parsed_data else None,
                json.dumps(mapped_data, ensure_ascii=False)[:2000] if mapped_data else None,
                http_status,
                status,
                (error_message or "")[:500] if error_message else None,
                remote_ip,
                now,
            ))
        conn.commit()
    except Exception:
        logger.exception("로그 저장 실패")


def _response(status_code, body):
    return {
        "statusCode": status_code,
        "headers": {"Content-Type": "application/json"},
        "body": json.dumps(body),
    }