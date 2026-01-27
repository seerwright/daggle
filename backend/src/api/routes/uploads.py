"""Upload serving routes."""

import os
from pathlib import Path

from fastapi import APIRouter, HTTPException, status
from fastapi.responses import FileResponse

from src.config import settings

router = APIRouter(prefix="/uploads", tags=["Uploads"])


@router.get("/{path:path}")
async def serve_upload(path: str):
    """Serve uploaded files.

    This endpoint serves files from the uploads directory.
    """
    # Construct full path
    full_path = Path(settings.upload_dir) / path

    # Security: ensure path doesn't escape uploads directory
    try:
        full_path = full_path.resolve()
        upload_dir = Path(settings.upload_dir).resolve()
        if not str(full_path).startswith(str(upload_dir)):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied",
            )
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid path",
        )

    # Check file exists
    if not full_path.exists() or not full_path.is_file():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="File not found",
        )

    # Determine media type
    ext = full_path.suffix.lower()
    media_types = {
        ".png": "image/png",
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".webp": "image/webp",
        ".gif": "image/gif",
        ".csv": "text/csv",
    }
    media_type = media_types.get(ext, "application/octet-stream")

    return FileResponse(full_path, media_type=media_type)
