"""Authentication schemas."""

from pydantic import BaseModel, EmailStr, Field

from src.domain.models.user import UserRole


class RegisterRequest(BaseModel):
    """Request schema for user registration."""

    email: EmailStr
    username: str = Field(min_length=3, max_length=100, pattern=r"^[a-zA-Z0-9_-]+$")
    password: str = Field(min_length=8, max_length=100)
    display_name: str = Field(min_length=1, max_length=255)


class LoginRequest(BaseModel):
    """Request schema for user login."""

    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    """Response schema for authentication tokens."""

    access_token: str
    token_type: str = "bearer"


class UserResponse(BaseModel):
    """Response schema for user data."""

    id: int
    email: str
    username: str
    display_name: str
    role: UserRole
    is_active: bool

    class Config:
        from_attributes = True
