# ADR-SEC-001. Security & Isolation Model

## Статус

**Accepted** — нормативное архитектурное решение платформы ЯсноПро

## Дата

2026-06-19

## Slug

`adr-sec-001-security-and-isolation-model`

## Связанные материалы

- ADR-REL-001 — Unified Release Package
- ADR-CP-001 — Control Plane Orchestration Model
- ADR-TPL-001 — Template Governance Model
- ADR-PROV-001 — Company Provisioning Model
- ADR-RT-001 — Per-Company Runtime Architecture
- ADR-UPD-001 — Company Update & Rollback Model
- ADR-RUN-001 — Runtime Materialization Model
- ADR-DEP-001 — Deployment Execution Model
- ADR-AUD-001 — Audit & Event Journal Model
- `01_ARCHITECTURE_RULES.mdc` — technical keys, tenant protection
- `platform-data-safety.mdc`
- `backend/app/db/company_runtime_middleware.py`
- `backend/app/db/runtime_routing_validation.py`
- `backend/app/modules/tenant_management/tenant_write_policy.py`

---

## 1. Контекст

Принятые ADR фиксируют per-company DB, per-company runtime (target), Control Plane orchestration, offer-gated updates, audit layers — но **не** единую модель безопасности и изоляции.

**As-is реализация:**

- PostgreSQL: `yasnopro_dev`, `yasnopro_template`, `yasnopro_company_{code}` (per-company);
- CLIENT interim: shared `runtime/client/` + Bridge JWT → per-company DB routing;
- `validate_bridge_runtime_routing` — catalog-backed portal/database match;
- `tenant_write_policy` — protected tenants, environment role guards;
- Platform admin vs tenant admin separation;
- Publication Guard на structure/config writes.

**Gaps (documented):** shared CLIENT runtime slot; operator manual DB access; incomplete digest gates.

ADR-SEC-001 фиксирует **нормативную модель** изоляции контуров и критерии нарушений.

### Главный ответ

ЯсноПро гарантирует изоляцию через **defense in depth**:

```text
Identity boundary → Tenant scope → Database boundary → Runtime slot
→ Deployment/Offer gate → Audit trail → Technical-key enforcement
```

Ни один слой не заменяет другой.

---

## 2. Решение (Decision)

**Security Model** — совокупность политик, механизмов контроля доступа и audit, обеспечивающих конфиденциальность, целостность и разделение ответственности между платформой, окружениями (DEV/TEMPLATE/CLIENT) и компаниями.

**Isolation** — архитектурное свойство, при котором ресурсы одного scope (tenant, company, environment, runtime slot) **недоступны** для read/write другого scope без явного authorized cross-scope mechanism.

---

## 3. Определение Security Model (Security Definition)

**Security Model** — это **нормативная система границ и контролей** ЯсноПро, определяющая кто (identity + role) может выполнять какие операции над какими объектами (technical id/key), в каком контуре (platform / environment / company), с обязательной фиксацией значимых действий в audit и запретом обхода governance gates (Offer, Deployment, Publication Guard).

---

## 4. Определение Isolation (Isolation Definition)

**Isolation** — это **гарантия разделения** данных, runtime, releases, deployments, journals и administrative authority между distinct scopes (DEV, Control Plane registry, TEMPLATE, each CLIENT company), реализуемая комбинацией отдельных БД, отдельных runtime slots (target), tenant-scoped API sessions, membership-bound roles и запретом cross-tenant identifiers в routing/protection.

---

## 5. Модель контуров (Boundary Model)

| Контур | Identity | Data plane | Control plane metadata |
|--------|----------|------------|------------------------|
| **DEV** | DEV tenant (`tenant_type=DEV`) | `yasnopro_dev` | CP registry (portal row) |
| **Control Plane** | `platform_users` / platform admin | CP DB tables (registry) | Orchestration, no tenant user content |
| **TEMPLATE** | TEMPLATE tenant (`tenant_type=TEMPLATE`) | `yasnopro_template` | CP registry + version pin |
| **Company (CLIENT)** | CLIENT tenant per company | `yasnopro_company_{code}` | `customer_companies` catalog |
| **Runtime (per slot)** | Env + company code | `runtime/{slot}/` | Deployment manifest linkage |
| **Release Package** | `package_key` (immutable) | Artifacts in releases/ | CP registry |
| **Audit** | scope + journal_kind | Journal/registry rows | Cross-cutting read policy |

**Не являются компаниями:** DEV, TEMPLATE, Control Plane, DEMO (отдельный contour).

---

## 6. Модель изоляции (Isolation Model)

### 6.1. Environment Isolation

| | |
|--|--|
| **Изолируется** | DEV / TEMPLATE / DEMO / CLIENT logical environments |
| **Как** | `tenant_type`, `environment_role`, separate DBs, write policy |
| **Нарушение** | CLIENT write in DEV; bootstrap company from DEV DB |

### 6.2. Tenant Isolation

| | |
|--|--|
| **Изолируется** | Each CLIENT `portal_id` / `company_code` |
| **Как** | Company DB session scoped to one tenant; API tenant context |
| **Нарушение** | Cross-tenant read/write without membership |

### 6.3. Database Isolation

| | |
|--|--|
| **Изолируется** | Row data per `yasnopro_company_*` |
| **Как** | Separate PostgreSQL database per company; connection routing |
| **Нарушение** | Query company B DB while authenticated as company A |

**Обязательные БД:**

| DB | Scope |
|----|-------|
| `yasnopro_dev` | DEV only |
| `yasnopro_template` | TEMPLATE only |
| `yasnopro_company_{code}` | One CLIENT company |
| CP registry DB | Platform metadata (not tenant business content) |

### 6.4. Runtime Isolation (target + interim)

| | |
|--|--|
| **Изолируется** | Code artifacts, mounts, processes per slot |
| **Как (target)** | `runtime/company/{code}/` per company |
| **Как (interim)** | Shared `runtime/client/` + JWT DB routing only |
| **Нарушение** | Company A process serves company B data without routing; shared mounts cross-leak |

### 6.5. Deployment Isolation

| | |
|--|--|
| **Изолируется** | Apply scope per `target_tenant_id` |
| **Как** | One deployment row per target; offer accept required |
| **Нарушение** | Apply package to company without offer; cross-company batch mutate |

### 6.6. Audit Isolation

| | |
|--|--|
| **Изолируется** | Journal visibility by scope |
| **Как** | `scope=platform` vs `scope=tenant`; read ACL |
| **Нарушение** | Company admin reads platform-only security events of other companies |

### 6.7. Identity Isolation

| | |
|--|--|
| **Изолируется** | Platform users vs tenant users vs memberships |
| **Как** | Separate tables; `tenant_user_memberships` per company |
| **Нарушение** | Tenant session grants platform admin powers |

### 6.8. Release / Artifact Isolation

| | |
|--|--|
| **Изолируется** | Immutable package per version; per-slot `release-NNN` |
| **Как** | No cross-write between slots; digest linkage |
| **Нарушение** | Mutate another company's `releases/` tree |

---

## 7. Доступ владельца платформы (Platform Owner Access Model)

Platform owner / platform admin (Control Plane).

| Категория | Разрешено | Запрещено | Зависит от режима |
|-----------|-----------|-----------|-------------------|
| **Архитектура** | Read design, ADR, registry | — | — |
| **Метаданные** | Companies catalog, versions, deployments, offers | — | — |
| **Конфигурация (platform)** | Platform settings, policies | Tenant structure without governance | — |
| **TEMPLATE structure** | Read; publish via governance | Ad-hoc edit bypassing package | — |
| **Пользовательские данные компаний** | **Не по умолчанию** | Bulk read business records | **Support mode** (future, audited) |
| **Контент компаний** | **Не по умолчанию** | Documents, object records | Forensic/support (audited) |
| **Журналы компаний** | Platform-scope events; not full tenant journal by default | Cross-tenant user activity surveillance | Support (audited) |

**Принцип:** platform admin управляет **lifecycle и registry**, не является default super-user внутри company business data.

---

## 8. Доступ администратора компании (Company Access Model)

Tenant administrator / TENANT_SUPERADMIN within **one** company.

| Разрешено | Запрещено |
|-----------|-----------|
| Users, roles, settings **своей** компании | Other companies' data |
| Accept/skip **своих** offers | Apply package without offer |
| Tenant journal **своего** tenant | Control Plane operations |
| Company business content | DEV/TEMPLATE environments |
| Designer structure (guarded) | Platform-wide registry |

Authority bound to **membership** + `portal_id`, not display name.

---

## 9. Runtime Security Model (ADR-RUN-001)

| Slot | Isolation rule |
|------|----------------|
| `runtime/template/` | TEMPLATE processes + `yasnopro_template` only |
| `runtime/company/{code}/` | One company; `DATABASE_URL` → `yasnopro_company_{code}` |
| `runtime/client/` (interim) | **Shared process** — must use Bridge JWT + `validate_bridge_runtime_routing` |

**Mandatory:**

- Env vars point mounts to **slot-local** paths (target per company).
- No `current/` junction switch cross-company without deployment authority.
- Verify before activate (integrity).

**Violation:** manual promote on company slot without deployment audit; shared uploads mount across companies.

---

## 10. Database Security Model (ADR-RT-001, ADR-PROV-001)

| Rule | Detail |
|------|--------|
| **One company → one DB** | `yasnopro_company_{code}` |
| **Provisioning** | `WITH TEMPLATE` only from `yasnopro_template` |
| **Routing** | JWT `database_name` must match catalog `customer_companies.database_name` |
| **Protection** | `is_protected`, `environment_role` — not `name` |
| **No shared CLIENT DB** for new companies (target) | Per-company DB mandatory |

**Violation:** connection string to wrong DB; orphan DB without catalog; hard-delete protected tenant.

---

## 11. Deployment Security Model (ADR-DEP-001, ADR-UPD-001)

| Rule | Detail |
|------|--------|
| **TEMPLATE publish** | Platform reviewer only |
| **Company apply** | After **Accept Offer** only |
| **Scope** | `target_tenant_id` single company |
| **Package** | Must be `published` and published to TEMPLATE first |
| **No silent mass apply** | Per-company offer required |

**Violation:** `apply_tenant_update` without available offer; deployment without `target_tenant_id`; operator CLI mutate company without audit.

---

## 12. Audit Security Model (ADR-AUD-001)

| Journal | Read | Write |
|---------|------|-------|
| Platform Event Journal | Platform admin / registry reader | Platform services |
| Tenant Event Journal | Tenant admin (own tenant) | Tenant-scoped services |
| DEV Development Journal | DEV + platform admin | DEV scripts/agents |

**Violation:** tenant reads other tenant journal; delete production audit; forge event without actor.

Security events (`security_login_failed`, guard violations) → platform journal, immutable.

---

## 13. Security Violations (нормативный перечень)

| Code | Violation |
|------|-----------|
| **SV-01** | Cross-tenant read (data) |
| **SV-02** | Cross-tenant write |
| **SV-03** | Cross-database connection routing mismatch |
| **SV-04** | Runtime serves wrong `portal_id` / DB |
| **SV-05** | Bypass Offer gate (company update) |
| **SV-06** | Bypass Deployment registry (silent apply) |
| **SV-07** | Bypass Publication Guard (structure/config) |
| **SV-08** | Bypass audit (significant state change unlogged) |
| **SV-09** | Direct runtime filesystem edit without authority |
| **SV-10** | Direct SQL on company/template DB bypassing service layer |
| **SV-11** | Protected tenant delete/archive/hard-delete |
| **SV-12** | Identification/protection by display `name`/`title` |
| **SV-13** | Platform user accesses tenant API as arbitrary company without bridge policy |
| **SV-14** | Shared mount/uploads cross-leak |
| **SV-15** | Immutable release tree in-place mutation |

---

## 14. Допустимые исключения (Controlled Exceptions)

| Mode | Условия | Audit |
|------|---------|-------|
| **Platform Recovery** | Operator + break-glass policy | Mandatory platform journal |
| **Migration** | Approved WI + maintenance window | Deployment + journal |
| **Forensic Audit** | Legal/compliance authorization | Read-only, logged access |
| **Support Mode** (future) | Time-bound, ticket-linked, company consent policy | Full audit trail |
| **Emergency Access** | Dual control / explicit flag | Mandatory security events |

**Default:** exceptions **запрещены** без explicit policy WI. No standing backdoor.

---

## 15. Architectural Invariants

1. **Company A cannot read/write Company B** tenant data.
2. **Each CLIENT company has dedicated DB** (`yasnopro_company_{code}`).
3. **Deployment to company requires Accept Offer** (except provision baseline).
4. **TEMPLATE publish requires platform governance** — not company admin.
5. **Runtime must not read foreign company DB** (routing validation).
6. **Journals scoped** — no cross-tenant journal read by default.
7. **Technical keys only** for routing, protection, deployment target.
8. **Protected tenants** (DEV, TEMPLATE, DEMO) cannot be destroyed by cleanup scripts.
9. **CP orchestrates** — companies do not self-apply platform packages.
10. **Significant security events** → platform audit (append-only).
11. **Display names never authorization keys.**
12. **Interim shared CLIENT runtime** must not weaken DB isolation (JWT validation mandatory).

---

## 16. Restrictions (system-wide)

| # | Запрет |
|---|--------|
| 1 | Cross-tenant data access |
| 2 | Company update without offer accept |
| 3 | Template mutate bypassing Release Package publish |
| 4 | Use `name`/`title` as id for delete/routing/protection |
| 5 | Hard-delete protected tenants without flags + confirm |
| 6 | Delete production audit records |
| 7 | Shared uploads between companies (target) |
| 8 | Operator promote without deployment authority (target) |
| 9 | Tenant admin CP privileges |
| 10 | Platform admin default read of all business records |
| 11 | Provisioning bootstrap from non-TEMPLATE source |
| 12 | In-place edit immutable `release-NNN` |

---

## 17. As-is vs Target

| Control | As-is | Target |
|---------|-------|--------|
| Per-company DB | ✓ | ✓ |
| JWT DB routing validation | ✓ | ✓ |
| Per-company runtime slot | ✗ (shared client) | ✓ |
| Per-company mounts | partial | ✓ |
| Offer gate | ✓ (registry) | ✓ + full apply |
| Digest/runtime gate | ✗ | ✓ |
| Support mode | ✗ | policy WI |

---

## 18. Фазы внедрения

| Phase | Scope |
|------|-------|
| Phase 0 | ADR-SEC-001 accepted |
| Phase 1 | Per-company runtime + mounts (ADR-RT-001) |
| Phase 2 | Deployment digest gate |
| Phase 3 | Support mode policy (if needed) |
| Phase 4 | Automated isolation regression tests |

---

## 19. Документы, требующие обновления

| Документ |
|----------|
| All ADR-REL … ADR-AUD |
| `docs/architecture/platform/tenant-environment-strategy.md` |
| `docs/architecture/platform/control-plane-architecture.md` |
| `.cursor/rules/01_ARCHITECTURE_RULES.mdc` |
| `.cursor/rules/platform-data-safety.mdc` |
| `scripts/runtime/README.md` |
| `docs/architecture/README.md` |

---

## 20. Риски

| Risk | Mitigation |
|------|------------|
| Shared CLIENT runtime | Per-company slots Phase 1 |
| Operator manual bypass | Audit + orchestrator |
| Catalog/DB drift | Orphan detection |
| Bridge JWT compromise | Short-lived tokens, validation |
| Support mode abuse | Dual control policy |

---

## 21. Критерии принятия ADR

- [x] Security and Isolation definitions
- [x] Boundary and isolation models
- [x] Platform owner and company access models
- [x] Runtime, DB, deployment, audit security
- [x] Security violations catalog
- [x] Invariants and restrictions
