from __future__ import annotations



from fastapi import HTTPException, status



PAGE_STATUS_DRAFT = "draft"

PAGE_STATUS_PUBLISHED = "published"

PAGE_STATUS_HIDDEN = "hidden"



OFFICE_RUNTIME_STATUSES = frozenset({PAGE_STATUS_PUBLISHED})





def normalize_page_status(value: str | None) -> str:

    normalized = str(value or PAGE_STATUS_DRAFT).strip().lower()

    if normalized in {PAGE_STATUS_DRAFT, PAGE_STATUS_PUBLISHED, PAGE_STATUS_HIDDEN}:

        return normalized

    return PAGE_STATUS_DRAFT





def is_page_visible_in_office_navigation(page_status: str | None) -> bool:

    return normalize_page_status(page_status) == PAGE_STATUS_PUBLISHED





def is_page_accessible_in_office_runtime(page_status: str | None) -> bool:

    return normalize_page_status(page_status) in OFFICE_RUNTIME_STATUSES





def assert_page_office_runtime_access(page_status: str | None) -> None:

    if is_page_accessible_in_office_runtime(page_status):

        return

    raise HTTPException(

        status_code=status.HTTP_403_FORBIDDEN,

        detail="Страница недоступна в Office",

    )


