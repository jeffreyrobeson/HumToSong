"""管理后台鉴权: 用签名 cookie 标记「管理员已登录」.

- 不引入 JWT 库, 用 hmac 对 (payload, exp) 做 HMAC-SHA256 签名, base64url 拼成 cookie 值.
- 登录时校验 ADMIN_PASSWORD, 签发 cookie；登出时让浏览器删 cookie.
- FastAPI 依赖 require_admin 用于保护管理类端点.
"""

import hmac
import secrets
import time
from base64 import urlsafe_b64decode, urlsafe_b64encode
from hashlib import pbkdf2_hmac, sha256

from fastapi import Cookie, HTTPException, status

from app.config import settings
from app.services import db

COOKIE_NAME = "lll_admin"
SESSION_TTL = 60 * 60 * 8  # 8 小时
PWD_ITER = 100_000  # pbkdf2 迭代次数


def _b64(b: bytes) -> str:
    return urlsafe_b64encode(b).rstrip(b"=").decode()


def _hash_password(password: str, salt: bytes) -> str:
    """PBKDF2-HMAC-SHA256, 返回 base64url."""
    return _b64(pbkdf2_hmac("sha256", password.encode(), salt, PWD_ITER))


def seed_admin_password_from_env() -> None:
    """迁移: DB 还没存管理密码, 但 .env 有明文 ADMIN_PASSWORD 时, 把后者哈希灌进 DB.
    之后以 DB 为准, 网页改密码只改 DB, 不动 .env."""
    if db.get_admin_password_hash():
        return
    if not settings.admin_password:
        return
    salt = secrets.token_bytes(16)
    db.set_admin_password_hash(_hash_password(settings.admin_password, salt), _b64(salt))


def _check_password(password: str) -> bool:
    """与 DB 里的哈希比对 (常量时间) .DB 没有时 fallback 到 .env 兼容."""
    stored = db.get_admin_password_hash()
    if stored:
        pw_hash, salt_b64 = stored
        try:
            salt = urlsafe_b64decode(salt_b64 + "==")
        except Exception:
            return False
        return hmac.compare_digest(_hash_password(password, salt), pw_hash)
    # DB 未设置: 兼容只配了 .env 的部署
    if settings.admin_password:
        return hmac.compare_digest(password, settings.admin_password)
    return False


def set_admin_password(new_password: str) -> None:
    """网页改密码: 生成新 salt, 写哈希到 DB."""
    salt = secrets.token_bytes(16)
    db.set_admin_password_hash(_hash_password(new_password, salt), _b64(salt))


def sign_session(expires_at: float) -> str:
    payload = f"{expires_at}".encode()
    sig = hmac.new(settings.admin_session_secret.encode(), payload, sha256).digest()
    return f"{_b64(payload)}.{_b64(sig)}"


def verify_session(token: str | None) -> bool:
    if not token or "." not in token:
        return False
    payload_b64, sig_b64 = token.rsplit(".", 1)
    try:
        payload = urlsafe_b64decode(payload_b64 + "==")
        sig = urlsafe_b64decode(sig_b64 + "==")
    except Exception:
        return False
    expected = hmac.new(settings.admin_session_secret.encode(), payload, sha256).digest()
    if not hmac.compare_digest(sig, expected):
        return False
    try:
        expires_at = float(payload.decode())
    except Exception:
        return False
    return expires_at > time.time()


def login(password: str) -> str | None:
    """密码对则返回 cookie 值, 否则 None."""
    if not _check_password(password):
        return None
    return sign_session(time.time() + SESSION_TTL)


async def require_admin(token: str | None = Cookie(default=None, alias=COOKIE_NAME)) -> None:
    """FastAPI 依赖: 保护管理端点."""
    if not verify_session(token):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="admin auth required")


def new_id(prefix: str = "p") -> str:
    return f"{prefix}_{secrets.token_urlsafe(9)}"
