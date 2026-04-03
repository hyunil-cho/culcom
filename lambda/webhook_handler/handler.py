"""
웹훅 Lambda 핸들러.
API Gateway 라우트: ANY /webhook/{id}
경로의 {id}로 webhook_configs 테이블에서 설정을 조회한 뒤,
설정에 따라 요청을 파싱하고 customers 테이블에 INSERT한다.

환경변수 (DB 접속정보만):
  DB_HOST, DB_PORT, DB_NAME, DB_USERNAME, DB_PASSWORD
"""

import base64
import json
import logging
import os
from datetime import datetime
from urllib.parse import parse_qs

import pymysql

from auth import check_auth, handle_handshake

logger = logging.getLogger()
logger.setLevel(logging.INFO)

_connection = None

_FIELD_TO_COLUMN = {
    "name": "name",
    "phoneNumber": "phone_number",
    "comment": "comment",
    "commercialName": "commercial_name",
    "adSource": "ad_source",
}


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


def handler(event, context):
    """API Gateway HTTP API (v2) 이벤트 핸들러."""
    raw_body = event.get("body", "")
    remote_ip = (event.get("requestContext", {})
                 .get("http", {})
                 .get("sourceIp", ""))
    method = (event.get("requestContext", {})
              .get("http", {}).get("method", "POST"))

    webhook_id = (event.get("pathParameters") or {}).get("id")
    if not webhook_id:
        return _error_response(400, "webhook id is required")

    try:
        config = _load_config(webhook_id)
        if config is None:
            return _error_response(404, "webhook not found")

        if not config["is_active"]:
            return _error_response(403, "webhook is disabled")

        config_seq = config["seq"]
        branch_seq = config["branch_seq"]
        source_name = config["source_name"]
        auth_type = config.get("auth_type") or "NONE"
        auth_config = json.loads(config.get("auth_config") or "{}")
        field_mapping = json.loads(config["field_mapping"] or "{}")
        resp_status = config["response_status_code"] or 200
        resp_content_type = config["response_content_type"] or "application/json"
        resp_body = config["response_body_template"] or '{"success": true}'

        # GET handshake (Meta 등 구독 검증)
        if method == "GET":
            handshake_response = handle_handshake(event, auth_type, auth_config)
            if handshake_response is not None:
                return handshake_response

        # 인증 검증
        auth_error = check_auth(event, raw_body, auth_type, auth_config)
        if auth_error:
            _save_log(config_seq, branch_seq, source_name, None, raw_body,
                      None, None, "FAILED", auth_error, remote_ip)
            return _error_response(401, "Unauthorized")

        # 요청 파싱
        source_params = _parse_request(event, raw_body, config)
        logger.info("Webhook %s - parsed params: %s", webhook_id, source_params)

        # 필드 매핑
        customer_data = {}
        for customer_field, source_param in field_mapping.items():
            value = _extract_value(source_params, source_param)
            if value is not None:
                customer_data[customer_field] = value

        if not customer_data.get("name"):
            _save_log(config_seq, branch_seq, source_name, None, raw_body,
                      source_params, customer_data,
                      "FAILED", "필수 필드 누락: name", remote_ip)
            return _response(400, resp_content_type,
                             json.dumps({"error": "missing required field: name"}))

        # Customer INSERT
        customer_seq = _insert_customer(branch_seq, customer_data)
        logger.info("Customer inserted: seq=%s", customer_seq)

        _save_log(config_seq, branch_seq, source_name, customer_seq, raw_body,
                  source_params, customer_data, "SUCCESS", None, remote_ip)

        return _response(resp_status, resp_content_type, resp_body)

    except Exception as e:
        logger.exception("Webhook processing failed")
        _save_log(None, None, "", None, raw_body,
                  None, None, "FAILED", str(e)[:500], remote_ip)
        return _error_response(500, "internal server error")


def _load_config(webhook_id):
    conn = get_connection()
    with conn.cursor() as cursor:
        cursor.execute(
            "SELECT * FROM webhook_configs WHERE seq = %s", (webhook_id,))
        return cursor.fetchone()


def _parse_request(event, raw_body, config):
    """HTTP 메서드와 Content-Type에 따라 파라미터를 dict로 추출."""
    method = (event.get("requestContext", {})
              .get("http", {}).get("method", "POST"))

    if method == "GET":
        return event.get("queryStringParameters", {}) or {}

    if event.get("isBase64Encoded") and raw_body:
        raw_body = base64.b64decode(raw_body).decode("utf-8")

    content_type = config.get("request_content_type") or "application/json"

    if "application/json" in content_type:
        return json.loads(raw_body) if raw_body else {}

    if "x-www-form-urlencoded" in content_type:
        parsed = parse_qs(raw_body or "")
        return {k: v[0] for k, v in parsed.items()}

    return {}


def _extract_value(source_params, source_param):
    """
    소스 파라미터에서 값을 추출.
    dot notation 지원: "user.name" -> source_params["user"]["name"]
    """
    if not source_param or not source_params:
        return None

    value = source_params
    for key in source_param.split("."):
        if isinstance(value, dict):
            value = value.get(key)
        else:
            return None
        if value is None:
            return None

    return str(value) if value is not None else None


def _insert_customer(branch_seq, customer_data):
    """customers 테이블에 INSERT하고 생성된 seq를 반환."""
    conn = get_connection()

    columns = ["branch_seq", "createdDate"]
    values = [branch_seq, datetime.now().strftime("%Y-%m-%d %H:%M:%S")]

    for field, value in customer_data.items():
        db_col = _FIELD_TO_COLUMN.get(field)
        if db_col and value:
            columns.append(db_col)
            values.append(value)

    col_names = ", ".join(columns)
    placeholders = ", ".join(["%s"] * len(values))
    sql = f"INSERT INTO customers ({col_names}) VALUES ({placeholders})"

    with conn.cursor() as cursor:
        cursor.execute(sql, values)
    conn.commit()

    with conn.cursor() as cursor:
        cursor.execute("SELECT LAST_INSERT_ID() AS seq")
        return cursor.fetchone()["seq"]


def _save_log(config_seq, branch_seq, source_name, customer_seq,
              raw_request, parsed_params, mapped_data,
              status, error_message, remote_ip):
    """webhook_logs 테이블에 수신 이력 기록."""
    try:
        conn = get_connection()
        sql = """
            INSERT INTO webhook_logs
            (webhook_config_seq, branch_seq, source_name, customer_seq,
             raw_request, parsed_params, mapped_data,
             status, error_message, remote_ip, createdDate)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """
        with conn.cursor() as cursor:
            cursor.execute(sql, (
                config_seq, branch_seq, source_name, customer_seq,
                (raw_request or "")[:5000],
                json.dumps(parsed_params, ensure_ascii=False)[:5000] if parsed_params else None,
                json.dumps(mapped_data, ensure_ascii=False)[:2000] if mapped_data else None,
                status,
                (error_message or "")[:500] if error_message else None,
                remote_ip,
                datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            ))
        conn.commit()
    except Exception:
        logger.exception("Failed to save webhook log")


def _error_response(status_code, message):
    return _response(status_code, "application/json",
                     json.dumps({"error": message}))


def _response(status_code, content_type, body):
    return {
        "statusCode": status_code,
        "headers": {"Content-Type": content_type},
        "body": body,
    }
