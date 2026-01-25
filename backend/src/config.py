"""Application configuration from environment variables."""

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    # Application
    app_name: str = "Daggle API"
    debug: bool = False

    # Database
    database_url: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/daggle"

    # Auth (will be used in next branch)
    jwt_secret: str = "dev-secret-change-in-production"
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 15

    # CORS
    cors_origins: list[str] = ["http://localhost:4200"]

    # Logging
    log_level: str = "INFO"

    # File uploads
    upload_dir: str = "/tmp/daggle/uploads"

    # Storage backend: "local" or "s3"
    storage_backend: str = "local"

    # S3/MinIO settings (used when storage_backend = "s3")
    s3_endpoint_url: str | None = None  # e.g., "http://minio:9000" for MinIO
    s3_bucket: str = "daggle"
    s3_access_key: str = "minioadmin"
    s3_secret_key: str = "minioadmin"
    s3_region: str = "us-east-1"

    # Celery/Redis settings
    celery_broker_url: str = "redis://localhost:6379/0"
    celery_result_backend: str = "redis://localhost:6379/0"
    async_scoring_enabled: bool = False  # Set to True to enable async scoring

    # Admin bootstrap settings
    # Set these to create an initial admin user on startup
    admin_email: str | None = None  # e.g., "admin@example.com"
    admin_password: str | None = None  # Strong password required
    admin_username: str = "admin"
    admin_display_name: str = "System Administrator"

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


settings = Settings()
