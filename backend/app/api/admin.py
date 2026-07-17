"""管理后台 + 供应商列表路由.

- 公开: POST /api/admin/login (校验密码, 下发签名 cookie) , GET /api/providers (脱敏列表) 
- 管理 (需 cookie) : POST/DELETE /api/admin/providers (增删供应商含 key) , 
  POST /api/admin/providers/{pid}/keys, DELETE /api/admin/keys/{kid}
"""

from fastapi import APIRouter, Depends, HTTPException, Response, status

from app.models.admin import AddKeyRequest, AdminLoginRequest, ChangePasswordRequest, CreateProviderRequest
from app.services import admin, db

router = APIRouter()


@router.post("/admin/login")
async def admin_login(req: AdminLoginRequest, response: Response) -> dict:
    token = admin.login(req.password)
    if not token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="wrong password")
    response.set_cookie(
        key=admin.COOKIE_NAME,
        value=token,
        httponly=True,
        samesite="lax",
        max_age=admin.SESSION_TTL,
        path="/",
    )
    return {"ok": True}


@router.post("/admin/logout")
async def admin_logout(response: Response) -> dict:
    response.delete_cookie(key=admin.COOKIE_NAME, path="/")
    return {"ok": True}


@router.post("/admin/change-password", dependencies=[Depends(admin.require_admin)])
async def change_password(req: ChangePasswordRequest) -> dict:
    """修改管理密码: 验证旧密码后再更新."""
    # 用 admin 里已有的 _check_password 验证旧密码
    if not admin._check_password(req.old_password):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="wrong old password")
    admin.set_admin_password(req.new_password)
    return {"ok": True}


@router.get("/admin/check")
async def admin_check(_: None = Depends(admin.require_admin)) -> dict:
    return {"ok": True}


# --- 供应商: 公开脱敏列表 ----------------------------------------------------

@router.get("/providers")
async def list_providers() -> list[dict]:
    """普通用户调: 返回全部供应商配置 (不含 api_key) ."""
    return db.list_providers(include_keys=False)


# --- 供应商: 管理端增删 ------------------------------------------------------

@router.post("/admin/providers", dependencies=[Depends(admin.require_admin)])
async def create_provider(req: CreateProviderRequest) -> dict:
    pid = admin.new_id("p")
    db.insert_provider(pid, req.name, req.base_url, req.model)
    db.insert_key(admin.new_id("k"), pid, req.api_key)
    return {"id": pid}


@router.delete("/admin/providers/{pid}", dependencies=[Depends(admin.require_admin)])
async def delete_provider(pid: str) -> dict:
    if not db.get_provider(pid):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="provider not found")
    db.delete_provider(pid)
    return {"ok": True}


@router.post("/admin/providers/{pid}/keys", dependencies=[Depends(admin.require_admin)])
async def add_key(pid: str, req: AddKeyRequest) -> dict:
    if not db.get_provider(pid):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="provider not found")
    key_id = admin.new_id("k")
    db.insert_key(key_id, pid, req.api_key)
    return {"id": key_id}


@router.delete("/admin/keys/{kid}", dependencies=[Depends(admin.require_admin)])
async def revoke_key(kid: str) -> dict:
    db.revoke_key(kid)
    return {"ok": True}
