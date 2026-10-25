import asyncio
from datetime import date

import pytest

from backend.app.services import data_service


def test_source_failure_is_not_replaced_with_synthetic_rows(monkeypatch):
    async def unavailable(*args, **kwargs):
        raise RuntimeError("network unavailable")

    monkeypatch.setattr(data_service, "fetch_elexon_data", unavailable)

    with pytest.raises(data_service.DataUnavailableError):
        asyncio.run(data_service.build_rows(date(2026, 1, 15), date(2026, 1, 15), "23:59"))
