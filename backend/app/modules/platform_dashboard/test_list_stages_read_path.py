from unittest.mock import patch

import pytest

from app.db.session import SessionLocal
from app.modules.platform_dashboard.service import list_stages
from app.modules.platform_dashboard.yasii_sync import yasii_track_is_loaded


@pytest.fixture
def db():
    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()


def test_list_stages_skips_analyzer_when_track_loaded(db):
    if not yasii_track_is_loaded(db):
        pytest.skip("YASII track not seeded in test DB")

    with patch(
        "app.modules.platform_dashboard.yasii_sync._run_yasii_analyzer_pass",
    ) as analyzer_pass:
        response = list_stages(db)
        analyzer_pass.assert_not_called()

    assert response.items
