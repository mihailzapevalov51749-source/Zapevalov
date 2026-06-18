# ADR-010. Platform Identity Store

## Статус

Accepted

## Дата

2026-06-17

## Slug

`adr-010-platform-identity-store`

## Связанные документы

- [ADR-009 Platform Identity Layer](./ADR-009-platform-identity-layer.md) (Accepted)
- Step 18.12.5.11 — Platform Identity Design
- Step 18.12.5.12 — Platform Identity Store MVP
- Step 18.12.5.12.1 — Credential Model Audit

---

## Context

[ADR-009](./ADR-009-platform-identity-layer.md) принял разделение **Platform Identity Layer** и **Tenant Identity Layer** и зафиксировал инвариант: Platform Owner не создаётся в `users` клиентских БД.

Для реализации ADR-009 требуется persistence-модель **Platform Identity Store** в Control Plane database.

### Текущее состояние (transitional)

Platform identity дублируется в:

```text
users (tenant_id=NULL, CP only)
platform_settings.platform_owner_user_id
platform_users
```

Механизм авторизации:

```text
get_current_user() → JWT.sub → users.id
```

Это работает для CP password login, но не является целевым Source of Truth и не масштабируется на Session Bridge без owner в client `users`.

### Результаты проектирования

- **Step 18.12.5.12** — MVP Store: три сущности; `PlatformOwnerBinding` / `PlatformUserBinding` не выделяются; Session/Ticket не персистятся в MVP.
- **Step 18.12.5.12.1** — Credential Model Audit: связь `PlatformIdentity` → `PlatformCredential` должна быть **1:N**, не 1:1, чтобы не создать тупик для SSO, Passkey и MFA.

---

## Decision

### MVP состав Platform Identity Store

В Control Plane DB вводятся **только три** персистентные сущности:

```text
PlatformIdentity
PlatformRoleBinding
PlatformCredential
```

### 1. PlatformIdentity

Каноническая platform-level идентичность.

| Аспект | Определение |
|--------|-------------|
| **Назначение** | Единый субъект platform layer (owner, admin, operator, …) |
| **Технический ключ** | `platform_identity_id` (PK, UUID) |
| **Стабильный ключ** | `email` (normalized, unique) — технический, не display |
| **Metadata** | `full_name`, `phone`, `avatar_url`, … — display only, не идентификаторы |
| **Lifecycle** | `active` → `suspended` → `archived` |
| **SoT** | Control Plane DB |

### 2. PlatformRoleBinding

Единый механизм platform roles. **Не использовать** отдельные сущности `PlatformOwnerBinding` и `PlatformUserBinding`.

| Аспект | Определение |
|--------|-------------|
| **Назначение** | Назначение platform roles на identity |
| **Технический ключ** | `id` (PK); unique `(platform_identity_id, platform_role)` |
| **platform_role** | `platform_owner` \| `platform_admin` \| `platform_operator` \| `platform_support` (расширяемо) |
| **status** | `active` \| `suspended` \| `revoked` |
| **Инвариант** | Ровно **одна** active binding с `platform_role=platform_owner` в SoT |
| **SoT** | Control Plane DB |

Заменяет: `platform_users`, отдельные owner/user binding tables, legacy `users.role` для platform access (постепенно).

### 3. PlatformCredential

Модель аутентификации platform identities. Cardinality:

```text
PlatformIdentity
    1 ─── N
PlatformCredential
```

Даже если MVP реализует только password:

```text
credential_kind = password
provider_key    = local
```

| Аспект | Определение |
|--------|-------------|
| **Назначение** | Способ входа или фактор аутентификации (password, federated, passkey, MFA) |
| **Технический ключ** | `credential_id` (PK) |
| **FK** | `platform_identity_id` |
| **credential_kind** | `password` \| `federated` \| `passkey` \| `mfa_totp` \| `mfa_webauthn` |
| **provider_key** | `local` \| `microsoft` \| `google` \| `oidc` \| `saml` (technical) |
| **external_subject_id** | Стабильный id от IdP (`sub`, `oid`, `NameID`) — для federated |
| **issuer_key** | Ссылка на конфиг IdP (generic OIDC/SAML) |
| **secret_material** | `password_hash` и др. (kind-specific) |
| **status** | `active` \| `disabled` \| `revoked` |
| **Инварианты** | ≤1 active `credential_kind=password` per identity; unique federated `(provider_key, issuer_key, external_subject_id)` |
| **SoT** | Control Plane DB |

Client и Template БД **не содержат** `PlatformCredential`.

### Что НЕ входит в MVP Store

| Сущность | Решение |
|----------|---------|
| `PlatformSession` | Не в MVP; CP JWT stateless; revocation — Future Work |
| `PlatformEntryTicket` | Не в MVP; stateless signed JWT для Session Bridge |
| `PlatformOwnerBinding` | Не используется; роль `platform_owner` в `PlatformRoleBinding` |
| `PlatformUserBinding` | Не используется; роли в `PlatformRoleBinding` |

### Source of Truth

```text
Control Plane DB
  сейчас:  yasnopro_dev
  будущее: platform_core (логическое имя, та же роль)
```

| Данные | SoT |
|--------|-----|
| Platform Owner | `PlatformIdentity` + `PlatformRoleBinding(platform_owner)` |
| Platform Users / roles | `PlatformIdentity` + `PlatformRoleBinding` |
| CP credentials | `PlatformCredential` (1:N) |
| Platform profile (name, timezone, …) | `platform_settings` — отдельно; link через `platform_owner_identity_id` |

Client/template DB: **нет** platform identity tables; **нет** Platform Owner в `users`.

### Platform Owner (инварианты)

Platform Owner:

- существует **только** в Platform Identity Layer (CP DB);
- **не создаётся** в `users` клиентских и шаблонных БД;
- **не является** Tenant User;
- **не является** Company Owner;
- **не является** Superadmin компании;
- доступ в компанию — через **Session Bridge** (Phase 4), без membership и без tenant roles.

### Transitional compatibility (Phase 2 implementation)

На период миграции допускается dual-read / dual-write в CP DB only:

```text
platform_identities.platform_identity_id
  ↔ platform_settings.platform_owner_identity_id (new)
  ↔ platform_settings.platform_owner_user_id → users.id (legacy, deprecated)
  ↔ platform_users (legacy, deprecated)
```

### Готовность к следующим фазам

| Фаза | Готовность MVP Store |
|------|----------------------|
| **Phase 3 — Principal Layer** | ✅ `platform_identity_id` + `platform_role` → `PlatformOwnerPrincipal` / `PlatformUserPrincipal` |
| **Phase 4 — Session Bridge** | ✅ Ticket mint по `platform_identity_id`; client без `users` lookup |
| **Phase 5 — Auth Migration** | ✅ Transitional dual-write; постепенная замена `get_current_user()` |

---

## Consequences

### Положительные

- Минимальный, но полный Store для ADR-009 на CP
- Единая таблица ролей вместо owner/user bindings
- Credential 1:N — готовность к SSO, Passkey, MFA без breaking schema
- Один Platform Owner при N компаниях (O(1) identity, не O(N) copies)
- Session Bridge не требует owner в client `users`
- Чёткое разделение identity / roles / credentials

### Отрицательные

- Миграция с legacy `users` + `platform_settings` + `platform_users`
- Dual-write на переходном периоде
- Нет server-side session revocation в MVP
- Дополнительная сложность credential model vs naive 1:1 (оправдана аудитом 18.12.5.12.1)

---

## Alternatives Considered

### Вариант A — Full model (6 entities)

`PlatformIdentity`, `PlatformOwnerBinding`, `PlatformUserBinding`, `PlatformCredential`, `PlatformSession`, `PlatformEntryTicket`

| | |
|--|--|
| Преимущества | Максимальная явность |
| Недостатки | Overkill для MVP |
| **Решение** | **Отклонено** |

### Вариант B — Minimal (`PlatformIdentity` + `PlatformRoleBinding` only)

| | |
|--|--|
| Преимущества | Минимум таблиц |
| Недостатки | Credentials в identity row; тупик для SSO |
| **Решение** | **Отклонено** |

### Вариант C — Accepted MVP (`PlatformIdentity` + `PlatformRoleBinding` + `PlatformCredential` 1:N)

| | |
|--|--|
| Преимущества | Баланс простоты и долгосрочной эволюции; ADR-009 compliant |
| Недостатки | Требует миграции legacy |
| **Решение** | **Принято** |

### Credential cardinality (дополнение к C)

| Вариант | Решение |
|---------|---------|
| `PlatformIdentity` 1:1 `PlatformCredential` | **Отклонено** (Step 18.12.5.12.1) |
| `PlatformIdentity` 1:N `PlatformCredential` | **Принято** |

---

## Migration Notes

| Phase | Содержание |
|-------|------------|
| **Phase 2** | Создать 3 таблицы в CP DB; migrate owner/admin из legacy; dual-read/write |
| **Phase 3** | `get_current_principal()`; JWT `sub=platform_identity_id` |
| **Phase 4** | Session Bridge; entry ticket stateless JWT |
| **Phase 5** | Deprecate CP `users` для platform login; remove dual-write |

Правила миграции:

- Не создавать Platform Owner в `yasnopro_client.users` / `yasnopro_template.users`
- Password MVP: одна `PlatformCredential` row per identity (`kind=password`, `provider_key=local`)
- Singleton owner: enforce на `PlatformRoleBinding`

---

## Future Work

- `PlatformSession` — server-side revocation, MFA step-up sessions
- Entry ticket `jti` replay cache
- Asymmetric trust keys (RS256) для Session Bridge
- Federated credentials: Microsoft, Google, OIDC, SAML
- Passkey (`credential_kind=passkey`, N per identity)
- MFA enrollments (`mfa_totp`, `mfa_webauthn`)
- Split `PlatformMfaEnrollment` при сложных MFA policies (опционально)
- Rename CP DB → `platform_core`
- `actor_principal_type` / `actor_principal_id` в platform audit

---

## Architecture Compliance

### ADR-009 — покрытие

| Требование ADR-009 | ADR-010 |
|--------------------|---------|
| Platform Identity Layer отдельно от Tenant | ✅ 3 entities в CP DB |
| Owner не в client `users` | ✅ SoT только CP |
| Owner ≠ Tenant User / Company Owner / Superadmin | ✅ RoleBinding + инварианты |
| `get_current_principal()` target | ✅ `platform_identity_id` |
| Session Bridge без users/memberships | ✅ Store на CP; client без identity tables |
| Technical keys only | ✅ `platform_identity_id`, `email`, `platform_role`, `credential_kind`, `provider_key` |

### ADR-009 — остаётся на будущие фазы

| Требование | Фаза |
|------------|------|
| `get_current_principal()` implementation | Phase 3 |
| Session Bridge / Entry Ticket | Phase 4 |
| Legacy auth deprecation | Phase 5 |
| `access_scope` enforcement | Phase 4+ |
| Platform audit без `users.id` | Phase 3+ |

---

## Final Decision

ЯсноПро принимает **Platform Identity Store MVP** из трёх сущностей в **Control Plane DB**:

```text
PlatformIdentity
PlatformRoleBinding
PlatformCredential (1:N)
```

как обязательную основу реализации [ADR-009](./ADR-009-platform-identity-layer.md).
