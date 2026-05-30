"""Text match ranking for runtime search (exact → startsWith → contains)."""


def normalize_search_text(value: object) -> str:
    if value is None:
        return ""
    return str(value).strip().casefold()


def compute_text_match_rank(title: object, query: object) -> int:
    """
    Return rank bucket:
      1 = exact match
      2 = starts with query
      3 = contains query
      999 = no match
    """
    normalized_title = normalize_search_text(title)
    normalized_query = normalize_search_text(query)

    if not normalized_query:
        return 999

    if not normalized_title:
        return 999

    if normalized_title == normalized_query:
        return 1

    if normalized_title.startswith(normalized_query):
        return 2

    if normalized_query in normalized_title:
        return 3

    return 999


def json_value_to_search_text(value_json: object) -> str:
    if value_json is None:
        return ""
    if isinstance(value_json, str):
        return value_json.strip()
    if isinstance(value_json, (int, float, bool)):
        return str(value_json)
    return str(value_json).strip()
