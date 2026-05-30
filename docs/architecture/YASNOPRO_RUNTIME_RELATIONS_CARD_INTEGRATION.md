# Runtime Relations — Object Entity Card Integration

## Source of truth

| Layer | Artifact |
|-------|----------|
| Definitions | `designer_relation_definitions` → publish → `catalog.relations[]` |
| Instances | `runtime_relation_instances` |
| Identity | `runtime_entity:{uuid}` |
| Read API | `/runtime/relations/tenants/{tenantId}/entities/{entityId}` |

**Not used:** `universal_table_rows.parent_id`, UT `EntityCardRelatedRows`, `tableApi`.

## Strategy (PR-C2/C3)

1. `listRuntimeEntityRelations` loads instances for the open entity.
2. Each instance is mapped to a **related entity** (peer id + object type key).
3. Labels come from published `catalog.relations` (`name` / `reverse_name` by direction).
4. Related entities are enriched via `getRuntimeEntity` (concurrency limit 4).
5. UI groups by `relation_key` + direction.
6. Click opens the same Object Entity Card via `useObjectEntityCard.openCard(entityId, { objectTypeKey })`.

## Frontend modules

```
frontend/src/api/runtimeRelationsApi.js
frontend/src/modules/objectEntities/hooks/useObjectEntityRelations.js
frontend/src/modules/objectEntities/services/mapRelationInstancesToGroups.js
frontend/src/modules/objectEntities/components/ObjectEntityRelatedEntities.jsx
```

Card tab: `presentation.card.tabs[]` → `id: "relations"` (merged into layout defaults for legacy configs).

## Limitations

| Topic | Status |
|-------|--------|
| Read-only | No create/delete in PR-C2/C3 |
| Enrichment | N+1 `getRuntimeEntity` (no summary endpoint) |
| Cross-object type open | Row disabled; `openCard` can load other types later |
| Parent shortcut | PR-C5 |
| Relation field values | No platform lookup/relation field types yet |
| Permissions | Tenant scope only |
| Graph traversal | Single hop only |

## Future

- PR-C4: create/delete relation UI (`POST` / `DELETE` runtime relations API).
- PR-C5: parent entity in hero (`settings_json.semantic_role = "parent"`).
- Optional backend: `GET .../entities/{id}/relations/summary`.
