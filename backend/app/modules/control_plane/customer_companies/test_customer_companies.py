from unittest.mock import MagicMock

import pytest
from pydantic import ValidationError

from app.modules.control_plane.customer_companies.constants import (
    CustomerCompanyStatus,
    DEFAULT_CUSTOMER_COMPANY_USERS_LIMIT,
)
from app.modules.control_plane.customer_companies.customer_company_service import (
    CustomerCompanyProvisioningPlan,
    provision_customer_company,
)
from app.modules.control_plane.customer_companies.schemas import (
    CustomerCompanyCreate,
    CustomerCompanyUpdate,
)
from app.modules.control_plane.customer_companies.service import (
    create_customer_company,
    update_customer_company,
)


def test_customer_company_create_defaults():
    payload = CustomerCompanyCreate(name="ООО Ромашка")
    assert payload.status == CustomerCompanyStatus.ACTIVE
    assert payload.users_limit == DEFAULT_CUSTOMER_COMPANY_USERS_LIMIT
    assert payload.primary_portal_id is None


def test_customer_company_create_requires_name():
    with pytest.raises(ValidationError):
        CustomerCompanyCreate(name="")


def test_customer_company_create_users_limit_minimum():
    with pytest.raises(ValidationError):
        CustomerCompanyCreate(name="ООО Вектор", users_limit=0)


def test_create_customer_company_validates_portal():
    db = MagicMock()
    db.get.return_value = None
    payload = CustomerCompanyCreate(name="ООО Альфа", primary_portal_id=99)

    with pytest.raises(ValueError, match="портал не найден"):
        create_customer_company(db, payload=payload)


def test_create_customer_company_success():
    db = MagicMock()
    db.get.return_value = MagicMock()

    payload = CustomerCompanyCreate(
        name="ООО Альфа",
        status=CustomerCompanyStatus.TRIAL,
        users_limit=25,
    )
    company = create_customer_company(db, payload=payload)

    assert company.name == "ООО Альфа"
    assert company.status == CustomerCompanyStatus.TRIAL.value
    assert company.users_limit == 25
    db.add.assert_called_once()
    db.commit.assert_called_once()


def test_update_customer_company_partial_patch():
    db = MagicMock()
    company = MagicMock()
    company.name = "ООО Ромашка"
    company.status = CustomerCompanyStatus.ACTIVE.value
    company.users_limit = 10

    payload = CustomerCompanyUpdate(name="ООО Ромашка (обновлено)", users_limit=50)

    result = update_customer_company(db, company=company, payload=payload)

    assert result is company
    assert company.name == "ООО Ромашка (обновлено)"
    assert company.users_limit == 50
    db.commit.assert_called_once()


def test_provision_customer_company_not_implemented():
    db = MagicMock()
    plan = CustomerCompanyProvisioningPlan(company_name="ООО Тест", users_limit=10)

    with pytest.raises(NotImplementedError):
        provision_customer_company(db, plan=plan)
