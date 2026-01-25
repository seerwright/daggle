"""Authentication service."""

from datetime import datetime, timezone

from sqlalchemy.ext.asyncio import AsyncSession

from src.api.schemas.auth import RegisterRequest
from src.common.security import hash_password, verify_password, create_access_token
from src.domain.models.user import User
from src.infrastructure.repositories.user import UserRepository


class AuthService:
    """Service for authentication operations."""

    def __init__(self, session: AsyncSession) -> None:
        self.session = session
        self.user_repo = UserRepository(session)

    async def register(self, data: RegisterRequest) -> User:
        """Register a new user."""
        # Check for existing email
        if await self.user_repo.email_exists(data.email):
            raise ValueError("Email already registered")

        # Check for existing username
        if await self.user_repo.username_exists(data.username):
            raise ValueError("Username already taken")

        # Create user
        user = User(
            email=data.email,
            username=data.username,
            hashed_password=hash_password(data.password),
            display_name=data.display_name,
        )
        return await self.user_repo.create(user)

    async def authenticate(self, email: str, password: str) -> User | None:
        """Authenticate a user by email and password."""
        user = await self.user_repo.get_by_email(email)
        if user is None:
            return None
        if not verify_password(password, user.hashed_password):
            return None
        if not user.is_active:
            return None

        # Update last login
        user.last_login = datetime.now(timezone.utc)
        await self.user_repo.update(user)

        return user

    def create_token(self, user: User) -> str:
        """Create an access token for a user."""
        return create_access_token(
            data={"sub": str(user.id), "email": user.email, "role": user.role.value}
        )
