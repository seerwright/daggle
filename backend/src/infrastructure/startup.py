"""Application startup tasks."""

import logging

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.common.security import hash_password
from src.config import settings
from src.domain.models.user import User, UserRole

logger = logging.getLogger(__name__)


async def bootstrap_admin_user(session: AsyncSession) -> None:
    """Create or update the initial admin user from configuration.

    This function:
    - Checks if ADMIN_EMAIL and ADMIN_PASSWORD are configured
    - If the user doesn't exist, creates them as admin
    - If the user exists but isn't admin, promotes them to admin
    - Logs all actions for visibility

    Environment variables:
    - ADMIN_EMAIL: Email for the admin user (required to bootstrap)
    - ADMIN_PASSWORD: Password for the admin user (required to bootstrap)
    - ADMIN_USERNAME: Username for the admin user (default: "admin")
    - ADMIN_DISPLAY_NAME: Display name (default: "System Administrator")
    """
    # Check if admin bootstrap is configured
    if not settings.admin_email or not settings.admin_password:
        logger.debug("Admin bootstrap not configured (ADMIN_EMAIL/ADMIN_PASSWORD not set)")
        return

    email = settings.admin_email.lower().strip()
    password = settings.admin_password
    username = settings.admin_username
    display_name = settings.admin_display_name

    # Validate password strength (basic check)
    if len(password) < 8:
        logger.warning("Admin password too short (min 8 characters), skipping bootstrap")
        return

    # Check if user already exists
    stmt = select(User).where(User.email == email)
    result = await session.execute(stmt)
    existing_user = result.scalar_one_or_none()

    if existing_user:
        # User exists - check if they're already admin
        if existing_user.role == UserRole.ADMIN:
            logger.debug(f"Admin user already exists: {email}")
        else:
            # Promote to admin
            existing_user.role = UserRole.ADMIN
            await session.commit()
            logger.info(f"Promoted existing user to admin: {email}")
    else:
        # Create new admin user
        # Check if username is taken
        stmt = select(User).where(User.username == username)
        result = await session.execute(stmt)
        if result.scalar_one_or_none():
            # Username taken, append email prefix
            username = email.split("@")[0]
            logger.info(f"Username 'admin' taken, using: {username}")

        admin_user = User(
            email=email,
            username=username,
            hashed_password=hash_password(password),
            display_name=display_name,
            role=UserRole.ADMIN,
            is_active=True,
        )
        session.add(admin_user)
        await session.commit()
        logger.info(f"Created admin user: {email} (username: {username})")


async def run_startup_tasks(session: AsyncSession) -> None:
    """Run all application startup tasks.

    This is called when the application starts and should handle
    any initialization that requires database access.
    """
    await bootstrap_admin_user(session)
