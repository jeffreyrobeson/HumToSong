from pydantic import BaseModel, Field


class AdminLoginRequest(BaseModel):
    password: str


class ChangePasswordRequest(BaseModel):
    old_password: str
    new_password: str = Field(min_length=6)


class CreateProviderRequest(BaseModel):
    name: str
    base_url: str
    model: str
    api_key: str


class AddKeyRequest(BaseModel):
    api_key: str
