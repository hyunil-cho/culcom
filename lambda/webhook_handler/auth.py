"""
웹훅 인증 플러그인.
auth_type별 검증 로직을 독립 함수로 분리하고, 레지스트리로 디스패치한다.

각 플러그인 함수 시그니처:
    (event, raw_body, auth_config: dict) -> str | None
    - 성공 시 None, 실패 시 에러 메시지 반환

auth_config 예시 (auth_type별):
    NONE:          {}
    API_KEY:       {"header_name": "x-api-key", "key": "abc123"}
    QUERY_PARAM:   {"param_name": "api_key", "key": "abc123"}
    HMAC_SHA256:   {"secret": "app_secret_here", "header_name": "X-Hub-Signature-256"}
    BASIC:         {"username": "user", "password": "pass"}
"""

import base64
import hashlib
import hmac


def _verify_none(event, raw_body, config):
    return None


def _verify_api_key(event, raw_body, config):
    header_name = config.get("header_name", "x-api-key").lower()
    expected_key = config.get("key", "")

    headers = event.get("headers", {})
    actual_key = headers.get(header_name, "")

    if not expected_key or actual_key != expected_key:
        return "Invalid API key"
    return None


def _verify_query_param(event, raw_body, config):
    param_name = config.get("param_name", "api_key")
    expected_key = config.get("key", "")

    qs = event.get("queryStringParameters", {}) or {}
    actual_key = qs.get(param_name, "")

    if not expected_key or actual_key != expected_key:
        return "Invalid API key (query)"
    return None


def _verify_hmac_sha256(event, raw_body, config):
    secret = config.get("secret", "")
    header_name = config.get("header_name", "X-Hub-Signature-256").lower()

    if not secret:
        return "HMAC secret not configured"

    headers = event.get("headers", {})
    signature_header = headers.get(header_name, "")

    if not signature_header:
        return "Missing signature header"

    body_bytes = (raw_body or "").encode("utf-8")
    computed = "sha256=" + hmac.new(
        secret.encode("utf-8"),
        body_bytes,
        hashlib.sha256,
    ).hexdigest()

    if not hmac.compare_digest(computed, signature_header):
        return "Invalid HMAC signature"
    return None


def _verify_basic(event, raw_body, config):
    expected_user = config.get("username", "")
    expected_pass = config.get("password", "")

    headers = event.get("headers", {})
    auth_header = headers.get("authorization", "")

    if not auth_header.startswith("Basic "):
        return "Missing Basic auth header"

    try:
        decoded = base64.b64decode(auth_header[6:]).decode("utf-8")
        user, password = decoded.split(":", 1)
    except Exception:
        return "Malformed Basic auth header"

    if user != expected_user or password != expected_pass:
        return "Invalid credentials"
    return None


_AUTH_PLUGINS = {
    "NONE": _verify_none,
    "API_KEY": _verify_api_key,
    "QUERY_PARAM": _verify_query_param,
    "HMAC_SHA256": _verify_hmac_sha256,
    "BASIC": _verify_basic,
}


def check_auth(event, raw_body, auth_type, auth_config):
    """auth_type에 맞는 플러그인으로 인증 검증. 실패 시 에러 메시지, 성공 시 None."""
    if not auth_type or auth_type == "NONE":
        return None

    plugin = _AUTH_PLUGINS.get(auth_type)
    if plugin is None:
        return f"Unknown auth type: {auth_type}"

    return plugin(event, raw_body, auth_config)


def handle_handshake(event, auth_type, auth_config):
    """
    Meta 등 GET handshake 처리.
    hub.mode=subscribe 요청이면 verify_token 검증 후 hub.challenge 에코.
    해당하지 않으면 None 반환.
    """
    qs = event.get("queryStringParameters") or {}

    if qs.get("hub.mode") != "subscribe":
        return None

    verify_token = auth_config.get("verify_token", "")
    if not verify_token or qs.get("hub.verify_token") != verify_token:
        return {"statusCode": 403, "body": "Invalid verify token"}

    return {
        "statusCode": 200,
        "headers": {"Content-Type": "text/plain"},
        "body": qs.get("hub.challenge", ""),
    }
