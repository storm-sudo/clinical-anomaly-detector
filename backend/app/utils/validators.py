from __future__ import annotations

from fastapi import HTTPException, status

from app.utils.csv_parser import parse_csv_file


_MAX_SIZE_BYTES_DEFAULT = 50 * 1024 * 1024  # 50 MB
_FORMULA_PREFIXES = ("=", "+", "-", "@")


def validate_csv_content(content: bytes, max_size_mb: int = 50) -> None:
    """Validate uploaded CSV bytes.

    Raises HTTPException 400 if:
    - Content is empty
    - Content exceeds max size
    - Content cannot be parsed as CSV
    """
    if not content:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded file is empty",
        )

    max_bytes = max_size_mb * 1024 * 1024
    if len(content) > max_bytes:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File exceeds maximum allowed size of {max_size_mb} MB",
        )

    try:
        df = parse_csv_file(content)
        if df.empty:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Uploaded CSV file contains no data rows",
            )
        if df.shape[1] < 2:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="CSV must contain at least 2 columns",
            )
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid CSV file: {exc}",
        ) from exc


def sanitize_cell_value(value: str) -> str:
    """Remove CSV formula-injection prefixes (=, +, -, @) from the start of a string."""
    if not value:
        return value
    value = value.strip()
    while value and value[0] in _FORMULA_PREFIXES:
        value = value[1:].strip()
    return value
