from enum import Enum


class CustomerCompanyStatus(str, Enum):
    ACTIVE = "active"
    INACTIVE = "inactive"
    TRIAL = "trial"
    BLOCKED = "blocked"


DEFAULT_CUSTOMER_COMPANY_USERS_LIMIT = 10
