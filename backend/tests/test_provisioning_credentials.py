from app.modules.users.provisioning_credentials import generate_provisioning_password


def test_generate_provisioning_password_has_three_groups() -> None:
    password = generate_provisioning_password()
    assert len(password.split("-")) == 3
