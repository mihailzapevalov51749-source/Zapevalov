# ADR-008. Document Libraries as Tenant-Scoped Reusable Engine

## Статус

Accepted (design — implementation pending demo approval)

## Дата

2026-06-13

## Slug

`adr-document-libraries-tenant-scoped-engine`

## Связанные материалы

- Аудит 16.6 — Изоляция библиотек документов между tenant (P0)
- WI 16.6.1 — Проектирование целевой архитектуры Document Libraries
- `docs/architecture/YASNOPRO_SCOPE_TENANT_MODEL.md`
- `docs/architecture/YASNOPRO_ENTITY_IDENTITY_CONTRACT.md`

---

## 1. Контекст

Document Libraries — модуль корпоративного хранения документов в ЯсноПро. Сейчас он используется через пункт навигации `type=document_library`, но **не имеет собственного tenant ownership** на уровне модели данных.

Текущая цепочка:

```text
NavigationItem (portal_id)
    ↓ library_id (косвенная привязка)
DocumentLibrary (без tenant_id)
    ↓ library_id
LibraryDocument (без tenant_id)
    ↓ file_path
uploads/documents/{uuid}_{filename}  (общая папка, публичный download)
```

Фактически tenant определяется через `NavigationItem.portal_id`. Это противоречит платформенному принципу:

```text
ID + TYPE + TENANT_ID  →  первичные идентификаторы и ownership
title / name / label / filename  →  только отображение
```

Поля отображения **не должны** участвовать в tenant isolation, маршрутизации, удалении, фильтрации и проверке прав.

Аудит 16.6 зафиксировал **P0**: cross-tenant доступ к библиотекам, документам и файлам возможен через API и static download.

---

## 2. Проблема

| Проблема | Последствие |
|----------|-------------|
| `document_libraries` без `tenant_id` | Ownership только через navigation — хрупкая косвенная связь |
| `library_documents` без tenant context | Security check требует JOIN; нет defense-in-depth |
| `GET /document-libraries/` без tenant filter | Список всех библиотек всех tenant |
| `GET /files/documents/{file_name}` без auth | Скачивание по guessable UUID |
| `GET /document-libraries/documents/by-file/{file_key}` | Поиск документа по имени файла (ILIKE) |
| Файлы в `uploads/documents/` | Нет filesystem isolation; сложное удаление tenant |
| Frontend без Bearer token | API document-libraries не tenant-aware |
| Нет `stored_files` | Файлы object fields, comments, chat и libraries — разрозненные URL без единого реестра |

Document Libraries сейчас воспринимается как **navigation-owned CMS-страница**, а не как **platform engine**.

---

## 3. Архитектурное решение

### Решение

**Document Libraries — самостоятельный Tenant-Scoped Reusable Engine** платформы ЯсноПро.

Модуль предоставляет единый движок хранения документов и файлов для:

- корпоративных библиотек документов;
- вложений к объектам (Object Types);
- вложений к комментариям;
- вложений к сообщениям чата;
- документов процессов и проектов (future);
- согласований и версионирования (future).

### Что Document Libraries **не является**

| ❌ Не является | ✅ Является |
|---------------|------------|
| Object Type | Platform document engine |
| CMS-страницей | Tenant-scoped storage + metadata layer |
| Navigation-owned сущностью | Сущность с прямым `tenant_id` |
| Глобальным файловым хранилищем | Isolated per-tenant storage |

### Navigation

`NavigationItem` **не владеет** библиотекой. Navigation — **presentation layer**, ссылка:

```text
NavigationItem.library_id  →  DocumentLibrary.id
NavigationItem.portal_id     →  must match DocumentLibrary.tenant_id
```

Ownership через Navigation **запрещён** как источник истины.

### Архитектурные принципы

1. **Первичные идентификаторы:** `id`, `type`, `tenant_id`, `library_id`, `document_id`, `stored_file_id`.
2. **Вторичные (display-only):** `title`, `name`, `label`, `filename`, `description`.
3. **Ownership** — исключительно через `tenant_id`.
4. **Document Library ≠ Object Type.** Object Type может **ссылаться** на документ, но не владеет библиотекой.
5. **Navigation = presentation layer.** Не источник ownership.

### Целевая архитектурная схема

```text
Tenant (portals.id)
   ↓ tenant_id
DocumentLibrary
   ↓ library_id
LibraryDocument (folder: is_folder=true | file: is_folder=false)
   ↓ stored_file_id (nullable for folders / external URL docs)
StoredFile
   ↓ storage_key
uploads/tenants/{tenantId}/documents/{storedFileId}
```

Navigation (parallel, optional):

```text
NavigationItem ──reference──► DocumentLibrary
```

---

## 4. Модель данных

### DocumentLibrary

| Поле | Тип | Описание |
|------|-----|----------|
| `id` | int PK | |
| `tenant_id` | int FK → `portals.id` NOT NULL | **Primary ownership** |
| `title` | string | Display only |
| `description` | text | Display only |
| `created_at` | datetime | |
| `updated_at` | datetime | |
| `deleted_at` | datetime nullable | Soft delete |
| `deleted_by_user_id` | int FK nullable | |

**Indexes:** `(tenant_id)`, `(tenant_id, id)`, partial index on `deleted_at IS NULL`.

### LibraryDocument

| Поле | Тип | Описание |
|------|-----|----------|
| `id` | int PK | |
| `library_id` | int FK → `document_libraries.id` | |
| `tenant_id` | int FK → `portals.id` | **Optional denormalized — см. §4.1** |
| `parent_id` | int FK self nullable | Folder tree |
| `is_folder` | bool | `true` = folder |
| `title` | string | Display only |
| `document_type` | string | MIME/category hint (display + preview routing) |
| `stored_file_id` | uuid FK nullable | Binary content |
| `external_url` | string nullable | URL-only documents (future) |
| `created_by_user_id` | int FK nullable | |
| `deleted_at` | datetime nullable | Soft delete |

**Удаляется:** `file_path`, `original_filename` на document — переносятся в `StoredFile`.

### StoredFile

| Поле | Тип | Описание |
|------|-----|----------|
| `id` | uuid PK | Opaque file identity |
| `tenant_id` | int FK NOT NULL | |
| `storage_key` | string | `tenants/{tenantId}/documents/{id}` |
| `original_filename` | string | Display / Content-Disposition |
| `mime_type` | string | |
| `size_bytes` | bigint | |
| `sha256` | string nullable | Integrity / dedup (future) |
| `created_at` | datetime | |
| `deleted_at` | datetime nullable | Orphan grace period |

### 4.1. Denormalized `library_documents.tenant_id` — сравнение вариантов

#### Вариант A — наследование через JOIN

```text
Document  →  Library  →  Tenant
```

Каждый security check:

```sql
SELECT d.* FROM library_documents d
JOIN document_libraries l ON l.id = d.library_id
WHERE d.id = :doc_id AND l.tenant_id = :tenant_id
```

| Критерий | Оценка |
|----------|--------|
| **Производительность** | JOIN на каждый get/list/download. При индексе `(library_id)` + `(tenant_id)` на library — приемлемо для MVP. Search по tenant без JOIN дороже. |
| **Безопасность** | Single source of truth — меньше drift. Ошибка в коде без JOIN = потенциальный leak (нужен centralized repository guard). |
| **Сложность миграции** | **Низкая.** Только `document_libraries.tenant_id`. Documents не трогаем. |
| **Риск рассинхронизации** | **Отсутствует** — tenant только на library. |

#### Вариант B — denormalized `library_documents.tenant_id`

```text
Document.tenant_id + Document.library_id
```

Security check:

```sql
SELECT * FROM library_documents
WHERE id = :doc_id AND tenant_id = :tenant_id AND library_id = :library_id
```

| Критерий | Оценка |
|----------|--------|
| **Производительность** | **Лучше** для list/search/download — filter по `(tenant_id, library_id)` без JOIN. |
| **Безопасность** | **Defense-in-depth** — даже при bug в library lookup document не отдаётся cross-tenant. |
| **Сложность миграции** | **Средняя** — backfill всех documents из library; constraint + trigger на INSERT/UPDATE. |
| **Риск рассинхронизации** | **Есть** — move library между tenant (запрещён) или bug в move document. Mitigation: DB CHECK / trigger `doc.tenant_id = library.tenant_id`. |

#### Рекомендация

| Фаза | Решение |
|------|---------|
| **Этап 1 (ownership)** | **Вариант A** — только `document_libraries.tenant_id`. Centralized `assert_document_in_tenant()` через JOIN. |
| **Этап 1.5 (optional)** | **Вариант B** — добавить `library_documents.tenant_id` + CHECK constraint после стабилизации API. |
| **Move между libraries** | Разрешён только внутри одного tenant; denormalized field не меняется. |
| **Move между tenant** | **Запрещён** always. |

**Вердикт:** начать с **A**, спроектировать schema с nullable `tenant_id` на document для безболезненного включения **B** на этапе 1.5.

---

## 5. API-модель

Base path: `/tenants/{tenantId}/document-libraries`

Guards на каждом endpoint:

- `get_current_user`
- `require_tenant`
- `user_has_tenant_access(db, user, tenant_id)`

### Библиотеки

```text
GET    /tenants/{tenantId}/document-libraries
POST   /tenants/{tenantId}/document-libraries
GET    /tenants/{tenantId}/document-libraries/{libraryId}
PATCH  /tenants/{tenantId}/document-libraries/{libraryId}
DELETE /tenants/{tenantId}/document-libraries/{libraryId}   → soft delete
```

### Документы и папки

```text
GET    /tenants/{tenantId}/document-libraries/{libraryId}/documents?parent_id=
POST   /tenants/{tenantId}/document-libraries/{libraryId}/folders
POST   /tenants/{tenantId}/document-libraries/{libraryId}/documents
PATCH  /tenants/{tenantId}/document-libraries/{libraryId}/documents/{documentId}
PATCH  /tenants/{tenantId}/document-libraries/{libraryId}/documents/{documentId}/move
DELETE /tenants/{tenantId}/document-libraries/{libraryId}/documents/{documentId}
```

### Upload / Download / Preview

```text
POST   /tenants/{tenantId}/document-libraries/{libraryId}/upload
GET    /tenants/{tenantId}/document-libraries/{libraryId}/documents/{documentId}/download
GET    /tenants/{tenantId}/document-libraries/{libraryId}/documents/{documentId}/preview
GET    /tenants/{tenantId}/document-libraries/{libraryId}/documents/search?q=
```

### Deprecated (удалить на этапе 5)

```text
/document-libraries/*
GET /files/documents/{file_name}          — для library files
GET /document-libraries/documents/by-file/{file_key}
```

Legacy endpoints могут временно proxy с deprecation header до завершения frontend migration.

---

## 6. Security Model

Полный контур для **каждой** операции:

```text
current_user (JWT, is_active)
        ↓
user_has_tenant_access(user, tenantId)
        ↓
library.tenant_id == tenantId
        ↓
document.library_id == libraryId
        ↓
stored_file.tenant_id == tenantId  (if binary)
```

| Операция | Дополнительно |
|----------|---------------|
| list / get | Filter `WHERE tenant_id = :tenantId` |
| create library | Set `tenant_id` from path, never from body |
| upload | Validate library ∈ tenant; virus scan hook (future) |
| download / preview | Stream via API; **запрещён** direct URL to storage |
| search | Scope limited to tenant libraries |
| delete | Soft delete default; hard purge by tenant delete job |

**Запрещено навсегда:**

- скачивание по `file_name`;
- скачивание по `file_path`;
- публичный static URL без auth.

---

## 7. Storage Model

### Целевая структура

```text
uploads/
  tenants/
    {tenantId}/
      documents/
        {storedFileId}          # no original filename in path
      attachments/              # phase 2: object/comment/chat unification
```

### Правила

- `storage_key` — opaque, internal only.
- Client never constructs file URL from filename.
- Upload writes to tenant path + creates `StoredFile` row in same transaction.
- Delete tenant → purge prefix `uploads/tenants/{tenantId}/`.

### Migration note

Текущие файлы: `uploads/documents/{uuid}_{originalName}`. Migration script (этап 3) — read-only catalog first, then copy/move with rollback plan.

---

## 8. Reuse Model

Document Libraries engine — **единый слой** для всех file-backed контуров.

| Контур | Связь с engine | Phase |
|--------|----------------|-------|
| **Корporate libraries** | `DocumentLibrary` → `LibraryDocument` → `StoredFile` | 1–4 |
| **Object Types (file fields)** | `RuntimeEntityValue` JSON refs → `StoredFile` | 3–4 |
| **Comments** | `CommentAttachment.stored_file_id` → `StoredFile` | 4+ |
| **Chat** | `ChatMessageAttachment.stored_file_id` → `StoredFile` | 4+ |
| **Processes / Projects** | `document_references` table → `LibraryDocument` or `StoredFile` | Future |
| **Versioning** | `DocumentVersion` → `StoredFile` | Future |

### Document References (future)

```text
document_references
  id
  tenant_id
  source_type      # object | process | project | comment
  source_id
  library_document_id | stored_file_id
  created_at
```

Object Type **не владеет** библиотекой — только держит reference.

---

## 9. План миграции

> **До демонстрации:** миграции БД, перемещение файлов и изменение существующих библиотек **не выполняются**. Только design + read-only audit.

### Этап 1 — Tenant ownership

- Migration: `document_libraries.tenant_id NOT NULL`
- Backfill из `navigation_items.portal_id` where `library_id` match
- **Orphan resolution** — manual policy (см. §10, orphan report)
- Centralized repository: `get_libraries_for_tenant(tenant_id)`
- Tests: tenant isolation unit + integration

**Оценка:** 2–3 dev-days

### Этап 2 — API isolation

- New router under `/tenants/{tenantId}/document-libraries`
- Auth + membership guards
- Deprecate legacy `/document-libraries/*`
- Update runtime search: `get_tenant_library_ids` → direct `tenant_id` query
- Remove `by-file/{file_key}` endpoint

**Оценка:** 3–4 dev-days

### Этап 3 — Storage isolation

- Table `stored_files`
- Upload/download через engine
- File migration script (copy, verify, dual-read period)
- Block public document download for library files

**Оценка:** 5–7 dev-days

### Этап 4 — Frontend isolation

- Tenant-prefixed API client + Bearer auth
- Download/preview через backend endpoints
- Race protection (request generation / tenant switch) — по аналогии с Workspace Tabs, Navigation Tree
- Remove hardcoded `file_path` URLs

**Оценка:** 3–4 dev-days

### Этап 5 — Legacy cleanup

- Drop deprecated endpoints
- Remove `uploads/documents/` legacy files
- Optional: `library_documents.tenant_id` denormalization
- Unify comment/chat/object attachments on `StoredFile`

**Оценка:** 2–3 dev-days

**Итого:** ~15–21 dev-days (без future references/versioning).

---

## 10. Риски

| Риск | Severity | Mitigation |
|------|----------|------------|
| **Orphan libraries** (нет navigation) | **High** | Read-only audit до backfill; manual assignment policy |
| Cross-tenant file access during migration | **Critical** | Feature flag; block legacy download first |
| 82% libraries orphan в DEV DB | **High** | Не полагаться только на navigation backfill |
| Library id=1 с 2 docs без tenant | **Medium** | Manual review queue |
| Broken deep-links | Medium | Preserve URL shape `/portal/{tenantId}/library/{libraryId}` |
| Bootstrap clone не копирует documents | Medium | Extend `_clone_document_libraries` |
| Dual storage period disk usage | Low | Migration window + cleanup job |
| Denormalized tenant_id drift | Low | Defer to phase 1.5; DB constraint |

### Orphan Libraries Report (read-only, 2026-06-13)

Snapshot текущей DEV БД **без изменений данных**:

| Метрика | Значение |
|---------|----------|
| Всего библиотек | 11 |
| Всего документов | 18 |
| Mapped (1 portal через navigation) | 2 |
| **Orphan (нет navigation)** | **9 (82%)** |
| Cross-portal conflict | 0 |

**Mapped:**

| library_id | portal_id | doc_count |
|------------|-----------|-----------|
| 8 | 1 | 16 |
| 18 | 21 | 0 |

**Orphans (требуют manual policy перед NOT NULL backfill):**

| library_id | doc_count | Примечание |
|------------|-----------|------------|
| 1 | 2 | Единственный orphan с документами |
| 2, 3, 4, 5, 6, 7, 9, 15 | 0 | Пустые legacy libraries |

**Вывод для backfill:** автоматический backfill через navigation покроет только **18%** библиотек. Orphan policy обязательна до этапа 1.

**Recommended orphan policy:**

1. Libraries с docs + без navigation → assign to DEV tenant или manual review.
2. Empty orphans → soft-mark `deleted_at` или assign to platform DEV tenant.
3. Запретить создание library без `tenant_id` в новом API.

---

## 11. Подготовка к демонстрации

### Не выполнять до approval

- ❌ Миграции БД
- ❌ Перемещение файлов
- ❌ Удаление документов / библиотек
- ❌ Изменение существующих записей

### Выполнено (design phase)

- ✅ ADR зафиксирован
- ✅ Orphan report (read-only)
- ✅ План миграции + оценка трудозатрат
- ✅ Сравнение denormalized `tenant_id` (§4.1)
- ✅ Перечень рисков

### Перед demo

1. Утвердить ADR с product/architecture owner.
2. Утвердить orphan policy для 9 libraries.
3. Согласовать порядок этапов (рекомендация: 1 → 2 → 3 → 4 → 5).
4. **Не демонстрировать** multi-tenant document libraries до этапа 2.
5. Optional hotfix bridge: временный auth + tenant filter на legacy API (не заменяет ADR).

---

## Последствия

### Positive

- Document Libraries становится переиспользуемым platform engine.
- Tenant isolation на уровне данных, API и storage.
- Единый `StoredFile` — foundation для objects, comments, chat, versioning.
- Navigation decoupled from ownership.

### Negative / Trade-offs

- Migration effort ~15–21 dev-days.
- Orphan cleanup требует manual decision.
- Dual API period увеличивает complexity short-term.

### Compliance

- Согласовано с `YASNOPRO_SCOPE_TENANT_MODEL` (tenant = boundary of trust).
- Согласовано с platform pattern `tenant_id` FK → `portals.id` (`RuntimeEntity`, Designer).

---

## Решение принято

Document Libraries проектируется и реализуется как **Tenant-Scoped Reusable Engine** с прямым `tenant_id` ownership, tenant-scoped API, isolated storage и Navigation как presentation reference layer.

Implementation начинается **после утверждения ADR и demo approval**, с этапа 1 (tenant ownership + orphan policy).
