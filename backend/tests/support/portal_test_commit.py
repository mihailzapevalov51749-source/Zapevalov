"""Commit helpers that register publication/module test portals for autouse teardown."""

from __future__ import annotations

from sqlalchemy.orm import Session

from tests.support.committed_test_registry import commit_test_data


def commit_portal_test_session(
    db: Session,
    *,
    portal_id: int | None = None,
    portal_ids: list[int] | None = None,
    release_id: int | None = None,
    release_ids: list[int] | None = None,
    user_id: int | None = None,
    user_ids: list[int] | None = None,
    publication_ids: list[int] | None = None,
) -> None:
    """Persist DB state and register ids for post-test hard purge."""
    merged_portal_ids: list[int] = []
    if portal_id is not None:
        merged_portal_ids.append(int(portal_id))
    if portal_ids:
        merged_portal_ids.extend(int(value) for value in portal_ids)

    merged_release_ids: list[int] = []
    if release_id is not None:
        merged_release_ids.append(int(release_id))
    if release_ids:
        merged_release_ids.extend(int(value) for value in release_ids)

    merged_user_ids: list[int] = []
    if user_id is not None:
        merged_user_ids.append(int(user_id))
    if user_ids:
        merged_user_ids.extend(int(value) for value in user_ids)

    commit_test_data(
        db,
        portal_ids=merged_portal_ids or None,
        release_ids=merged_release_ids or None,
        user_ids=merged_user_ids or None,
        publication_ids=publication_ids,
    )
    db.commit()
