from app.shared.platform_keys import generate_platform_key, is_valid_platform_key, slugify_platform_key


def test_slugify_platform_key_transliterates_cyrillic() -> None:
    assert slugify_platform_key("ООО Ромашка") == "ooo_romashka"
    assert slugify_platform_key("Platform Template") == "platform_template"
    assert slugify_platform_key("Demo Компания") == "demo_kompaniya"


def test_generate_platform_key_avoids_collisions() -> None:
    first = generate_platform_key("ООО Ромашка", [])
    second = generate_platform_key("ООО Ромашка", [first])
    assert first == "ooo_romashka"
    assert second == "ooo_romashka_2"


def test_is_valid_platform_key() -> None:
    assert is_valid_platform_key("ooo_romashka") is True
    assert is_valid_platform_key("1bad") is False
