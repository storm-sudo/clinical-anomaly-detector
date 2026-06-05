from __future__ import annotations

import asyncio
import logging
import os
from pathlib import Path
from typing import Optional

logger = logging.getLogger(__name__)


class StorageService:
    """Abstraction over AWS S3 and local filesystem storage."""

    def __init__(self, settings) -> None:
        self.use_local = settings.USE_LOCAL_STORAGE
        self.local_dir = Path(settings.local_upload_dir)
        self.bucket = settings.AWS_S3_BUCKET_NAME

        if not self.use_local:
            import boto3
            self.s3 = boto3.client(
                "s3",
                region_name=settings.AWS_REGION,
                aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
                aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
            )
        else:
            self.local_dir.mkdir(parents=True, exist_ok=True)

    # ── Public API ────────────────────────────────────────────────────────────

    async def upload_file(
        self,
        content: bytes,
        key: str,
        content_type: str = "text/csv",
    ) -> tuple[str, str]:
        """Upload bytes and return (storage_key, url)."""
        if self.use_local:
            return await self._local_upload(content, key)
        return await self._s3_upload(content, key, content_type)

    async def download_file(self, key: str) -> bytes:
        """Download and return file bytes."""
        if self.use_local:
            return await self._local_download(key)
        return await self._s3_download(key)

    async def delete_file(self, key: str) -> None:
        """Delete a file from storage."""
        if self.use_local:
            await self._local_delete(key)
        else:
            await self._s3_delete(key)

    async def get_presigned_upload_url(self, key: str, expires_in: int = 900) -> str:
        """Return a presigned upload URL (or internal API path for local mode)."""
        if self.use_local:
            return f"/api/uploads/{key}"
        loop = asyncio.get_event_loop()
        url = await loop.run_in_executor(
            None,
            lambda: self.s3.generate_presigned_url(
                "put_object",
                Params={"Bucket": self.bucket, "Key": key},
                ExpiresIn=expires_in,
            ),
        )
        return url

    # ── Local helpers ─────────────────────────────────────────────────────────

    async def _local_upload(self, content: bytes, key: str) -> tuple[str, str]:
        dest = self.local_dir / key
        dest.parent.mkdir(parents=True, exist_ok=True)
        loop = asyncio.get_event_loop()
        await loop.run_in_executor(None, dest.write_bytes, content)
        url = f"/uploads/{key}"
        return key, url

    async def _local_download(self, key: str) -> bytes:
        path = self.local_dir / key
        if not path.exists():
            raise FileNotFoundError(f"Local file not found: {key}")
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(None, path.read_bytes)

    async def _local_delete(self, key: str) -> None:
        path = self.local_dir / key
        if path.exists():
            loop = asyncio.get_event_loop()
            await loop.run_in_executor(None, path.unlink)

    # ── S3 helpers ────────────────────────────────────────────────────────────

    async def _s3_upload(self, content: bytes, key: str, content_type: str) -> tuple[str, str]:
        import io
        loop = asyncio.get_event_loop()
        await loop.run_in_executor(
            None,
            lambda: self.s3.upload_fileobj(
                io.BytesIO(content),
                self.bucket,
                key,
                ExtraArgs={"ContentType": content_type},
            ),
        )
        url = f"https://{self.bucket}.s3.amazonaws.com/{key}"
        return key, url

    async def _s3_download(self, key: str) -> bytes:
        import io
        loop = asyncio.get_event_loop()
        buf = io.BytesIO()

        def _do_download():
            self.s3.download_fileobj(self.bucket, key, buf)

        await loop.run_in_executor(None, _do_download)
        return buf.getvalue()

    async def _s3_delete(self, key: str) -> None:
        loop = asyncio.get_event_loop()
        await loop.run_in_executor(
            None,
            lambda: self.s3.delete_object(Bucket=self.bucket, Key=key),
        )
