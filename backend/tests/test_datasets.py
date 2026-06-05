from __future__ import annotations

import io
import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.dataset import Dataset

pytestmark = pytest.mark.asyncio

async def test_upload_dataset_success(client: AsyncClient, auth_headers: dict, db: AsyncSession):
    csv_content = (
        "subject_id,visit,weight,temperature\n"
        "SUB-101,1,75.4,36.5\n"
        "SUB-101,2,76.1,36.7\n"
        "SUB-102,1,80.0,36.4\n"
    )
    
    file_payload = {
        "file": ("test_upload.csv", csv_content.encode("utf-8"), "text/csv")
    }
    
    data_payload = {
        "name": "Seeded Test Dataset",
        "trial_name": "Test Trial",
        "trial_phase": "Phase I",
        "data_type": "auto",
        "timepoint_column": "visit",
        "subject_id_column": "subject_id"
    }

    response = await client.post(
        "/api/datasets",
        headers=auth_headers,
        files=file_payload,
        data=data_payload
    )
    
    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "Seeded Test Dataset"
    assert data["row_count"] == 3
    assert data["column_count"] == 4
    assert "weight" in data["columns"]
    
    # Check DB
    db_res = await db.execute(select(Dataset).where(Dataset.id == data["id"]))
    db_ds = db_res.scalar_one_or_none()
    assert db_ds is not None
    assert db_ds.row_count == 3

async def test_list_datasets(client: AsyncClient, auth_headers: dict):
    response = await client.get("/api/datasets", headers=auth_headers)
    assert response.status_code == 200
    assert isinstance(response.json(), list)

async def test_upload_invalid_csv(client: AsyncClient, auth_headers: dict):
    # Empty file
    file_payload = {
        "file": ("empty.csv", b"", "text/csv")
    }
    data_payload = {"name": "Empty"}

    response = await client.post(
        "/api/datasets",
        headers=auth_headers,
        files=file_payload,
        data=data_payload
    )
    assert response.status_code == 400
    assert "Uploaded file is empty" in response.json()["detail"]
