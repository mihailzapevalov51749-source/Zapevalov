from app.shared.public_slug import is_valid_public_slug, slugify_public_slug


def test_slugify_public_slug_examples():
    assert slugify_public_slug("Розетка") == "rozetka"
    assert slugify_public_slug("Розетка СПБ") == "rozetka-spb"
    assert slugify_public_slug("Моя Компания") == "moya-kompaniya"


def test_is_valid_public_slug():
    assert is_valid_public_slug("rozetka")
    assert is_valid_public_slug("rozetka-spb")
    assert is_valid_public_slug("rzk")
    assert not is_valid_public_slug("login")
    assert not is_valid_public_slug("bad slug")
