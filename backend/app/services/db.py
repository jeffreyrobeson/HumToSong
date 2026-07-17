"""SQLite persistence layer for AI providers and their API keys."""

import sqlite3
import time
from pathlib import Path

DB_PATH = Path(__file__).resolve().parent.parent.parent / "data" / "config.db"

_SCHEMA = """
CREATE TABLE IF NOT EXISTS providers (
    id         TEXT PRIMARY KEY,
    name       TEXT NOT NULL,
    base_url   TEXT NOT NULL,
    model      TEXT NOT NULL,
    created_at REAL NOT NULL
);

CREATE TABLE IF NOT EXISTS keys (
    id          TEXT PRIMARY KEY,
    provider_id TEXT NOT NULL,
    api_key     TEXT NOT NULL,
    created_at  REAL NOT NULL,
    revoked_at  REAL,
    FOREIGN KEY (provider_id) REFERENCES providers(id)
);
CREATE INDEX IF NOT EXISTS idx_keys_provider ON keys(provider_id);

CREATE TABLE IF NOT EXISTS meta (
    key   TEXT PRIMARY KEY,
    value TEXT NOT NULL
);
"""

ADMIN_PWD_HASH_KEY = "admin_password_hash"
ADMIN_PWD_SALT_KEY = "admin_password_salt"


def _conn() -> sqlite3.Connection:
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def init_db() -> None:
    with _conn() as conn:
        conn.executescript(_SCHEMA)


def insert_provider(pid: str, name: str, base_url: str, model: str) -> None:
    with _conn() as conn:
        conn.execute(
            "INSERT INTO providers (id, name, base_url, model, created_at) VALUES (?, ?, ?, ?, ?)",
            (pid, name, base_url, model, time.time()),
        )


def list_providers(include_keys: bool = False) -> list[dict]:
    with _conn() as conn:
        rows = conn.execute("SELECT * FROM providers ORDER BY created_at").fetchall()
        result = []
        for r in rows:
            item = {
                "id": r["id"],
                "name": r["name"],
                "base_url": r["base_url"],
                "model": r["model"],
                "created_at": r["created_at"],
            }
            if include_keys:
                ks = conn.execute(
                    "SELECT * FROM keys WHERE provider_id = ? ORDER BY created_at",
                    (r["id"],),
                ).fetchall()
                item["keys"] = [
                    {
                        "id": k["id"],
                        "api_key": k["api_key"],
                        "created_at": k["created_at"],
                        "revoked_at": k["revoked_at"],
                    }
                    for k in ks
                ]
            result.append(item)
        return result


def get_provider(pid: str) -> dict | None:
    with _conn() as conn:
        r = conn.execute("SELECT * FROM providers WHERE id = ?", (pid,)).fetchone()
        return dict(r) if r else None


def delete_provider(pid: str) -> None:
    with _conn() as conn:
        conn.execute("DELETE FROM keys WHERE provider_id = ?", (pid,))
        conn.execute("DELETE FROM providers WHERE id = ?", (pid,))


def insert_key(key_id: str, provider_id: str, api_key: str) -> None:
    with _conn() as conn:
        conn.execute(
            "INSERT INTO keys (id, provider_id, api_key, created_at) VALUES (?, ?, ?, ?)",
            (key_id, provider_id, api_key, time.time()),
        )


def get_active_key(provider_id: str) -> dict | None:
    with _conn() as conn:
        r = conn.execute(
            "SELECT * FROM keys WHERE provider_id = ? AND revoked_at IS NULL "
            "ORDER BY created_at LIMIT 1",
            (provider_id,),
        ).fetchone()
        return dict(r) if r else None


def list_keys(provider_id: str) -> list[dict]:
    with _conn() as conn:
        rows = conn.execute(
            "SELECT * FROM keys WHERE provider_id = ? ORDER BY created_at",
            (provider_id,),
        ).fetchall()
        return [dict(r) for r in rows]


def revoke_key(key_id: str) -> None:
    with _conn() as conn:
        conn.execute(
            "UPDATE keys SET revoked_at = ? WHERE id = ? AND revoked_at IS NULL",
            (time.time(), key_id),
        )


def get_meta(key: str) -> str | None:
    with _conn() as conn:
        r = conn.execute("SELECT value FROM meta WHERE key = ?", (key,)).fetchone()
        return r[0] if r else None


def set_meta(key: str, value: str) -> None:
    with _conn() as conn:
        conn.execute(
            "INSERT INTO meta (key, value) VALUES (?, ?) "
            "ON CONFLICT(key) DO UPDATE SET value = excluded.value",
            (key, value),
        )


def get_admin_password_hash() -> tuple[str, str] | None:
    h = get_meta(ADMIN_PWD_HASH_KEY)
    s = get_meta(ADMIN_PWD_SALT_KEY)
    if h and s:
        return (h, s)
    return None


def set_admin_password_hash(pw_hash: str, salt: str) -> None:
    set_meta(ADMIN_PWD_HASH_KEY, pw_hash)
    set_meta(ADMIN_PWD_SALT_KEY, salt)