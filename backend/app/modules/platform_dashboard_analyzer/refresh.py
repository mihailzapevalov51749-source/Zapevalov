import json

from datetime import datetime



from sqlalchemy.orm import Session



from app.modules.platform_dashboard.constants import (

    PlatformActivityType,

    PlatformTaskPriority,

    PlatformTaskStatus,

)

from app.modules.platform_dashboard.datetime_utils import serialize_utc_datetime, utc_now

from app.modules.platform_dashboard.models import (

    PlatformActivity,

    PlatformComponent,

    PlatformImplementationStage,

    PlatformTask,

)

from app.modules.platform_dashboard.service import dump_json_list, ensure_dashboard_meta, parse_json_list

from app.modules.platform_dashboard_analyzer.analyzer import analyze_components, analyze_stages

from app.modules.platform_dashboard_analyzer.backend_scan import scan_backend

from app.modules.platform_dashboard_analyzer.doc_reader import read_architecture_docs

from app.modules.platform_dashboard_analyzer.fingerprint import compute_analyzer_fingerprint

from app.modules.platform_dashboard_analyzer.frontend_scan import scan_frontend

from app.modules.platform_dashboard_analyzer.paths import get_backend_dir, get_frontend_dir, get_repo_root

from app.modules.platform_dashboard_analyzer.types import RefreshResult, ScanContext
from app.modules.platform_dashboard.yasii_catalog import YASII_IMPLEMENTATION_STAGE_SLUG
from app.modules.platform_dashboard.yasii_sync import sync_yasii_track

from app.modules.users.models import User  # noqa: F401 — register ORM before QualityIssue mapper

from app.modules.quality_issues.constants import QualityIssueStatus

from app.modules.quality_issues.models import QualityIssue





def build_scan_context(repo_root=None) -> ScanContext:

    root = repo_root or get_repo_root()

    return ScanContext(

        repo_root=root,

        backend=scan_backend(get_backend_dir(root)),

        frontend=scan_frontend(get_frontend_dir(root)),

        docs=read_architecture_docs(root),

    )





def _resolve_initiated_by_name(user) -> str | None:

    if user is None:

        return None



    full_name = getattr(user, "full_name", None)

    if full_name and str(full_name).strip():

        return str(full_name).strip()



    email = getattr(user, "email", None)

    if email and str(email).strip():

        return str(email).strip()



    return None





def _format_dashboard_refresh_result(

    *,

    components_count: int,

    stages_count: int,

    quality_issues_open: int,

    overall_readiness_before: int | None,

    overall_readiness_after: int | None,

    changed_work_items: list[str],

    initiated_by_name: str | None,

) -> str:

    lines = [

        f"Компонентов: {components_count}",

        f"Этапов: {stages_count}",

        f"Проблем качества: {quality_issues_open}",

    ]

    if overall_readiness_before is not None or overall_readiness_after is not None:

        lines.append(

            f"Общая готовность: {overall_readiness_before if overall_readiness_before is not None else '—'}%"

            f" → {overall_readiness_after if overall_readiness_after is not None else '—'}%"

        )

    if changed_work_items:

        lines.append("Изменённые work items:")

        lines.extend(f"- {item}" for item in changed_work_items)


RELATION_FIELD_TYPE_HISTORY_SLUG = "relation-field-type-roadmap-history-20260604"
RELATION_FIELD_TYPE_CHANGELOG_SLUG = "relation-field-type-changelog-20260604"

PAGE_PUBLICATION_PLACES_HISTORY_SLUG = "page-publication-places-history-20260604"
PAGE_PUBLICATION_PLACES_CHANGELOG_SLUG = "page-publication-places-changelog-20260604"

_PAGE_PUBLICATION_PLACES_HISTORY_DESCRIPTION = (
    "Исправлена логика раздела «Места публикации»: "
    "дерево публикации сохраняется независимо от статуса страницы, "
    "а для hidden/draft отображается статус публикации без удаления маршрута."
)

PAGE_VISIBILITY_SINGLE_SOURCE_HISTORY_SLUG = "page-visibility-single-source-history-20260604"
PAGE_VISIBILITY_SINGLE_SOURCE_CHANGELOG_SLUG = "page-visibility-single-source-changelog-20260604"
PAGE_STATUS_NORMALIZATION_HISTORY_SLUG = "page-status-normalization-history-20260605"
PAGE_STATUS_NORMALIZATION_CHANGELOG_SLUG = "page-status-normalization-changelog-20260605"

_PAGE_VISIBILITY_SINGLE_SOURCE_HISTORY_DESCRIPTION = (
    "Устранён второй источник истины для видимости страниц: "
    "для page navigation items видимость определяется только pages.status. "
    "Значок глаза переключает published/hidden, edit mode меню показывает скрытые пункты."
)

_PAGE_VISIBILITY_SINGLE_SOURCE_CHANGELOG_DESCRIPTION = (
    "Устранён второй источник истины для видимости страниц. "
    "Для страниц единственным механизмом управления публикацией и отображением стал pages.status. "
    "navigation_items.is_visible используется только для непейджевых элементов навигации."
)

_PAGE_STATUS_NORMALIZATION_DESCRIPTION = (
    "Проведена нормализация статусов существующих страниц под новый контракт публикации. "
    "Статусы pages.status приведены к фактическим местам публикации: published, hidden, draft. "
    "Для page navigation items устранён старый конфликт с navigation_items.is_visible."
)

_PAGE_PUBLICATION_PLACES_CHANGELOG_DESCRIPTION = (
    'Исправлена логика раздела "Места публикации". '
    "Дерево публикации сохраняется независимо от статуса страницы. "
    "Для hidden и draft страниц отображается статус публикации без удаления маршрута публикации."
)
RELATION_FIELD_TYPE_SELF_RELATION_SLUG = "relation-field-type-self-relation-20260604"
RELATION_FIELD_TYPE_TASK_SUBTASK_SPEC_SLUG = (
    "relation-field-type-task-subtask-spec-20260604"
)
RELATION_FIELD_TYPE_TASK_SUBTASK_DOMAIN_SLUG = (
    "relation-field-type-task-subtask-domain-20260604"
)
RELATION_FIELD_TYPE_PARENT_SECTION_SLUG = (
    "relation-field-type-parent-section-20260604"
)
RELATION_FIELD_TYPE_SUBTASKS_RELATION_ENGINE_SLUG = (
    "relation-field-type-subtasks-relation-engine-20260604"
)
RELATION_FIELD_TYPE_SUBTASKS_RELATIONS_TAB_UX_SLUG = (
    "relation-field-type-subtasks-relations-tab-ux-20260604"
)
RELATION_FIELD_TYPE_QUICK_CREATE_FORM_SLUG = (
    "relation-field-type-quick-create-form-20260604"
)
RELATION_FIELD_TYPE_OBJECT_TABLE_TREE_VIEW_SLUG = (
    "relation-field-type-object-table-tree-view-20260604"
)

_RELATION_FIELD_TYPE_HISTORY_DESCRIPTION = (
    'Для компонента "Тип поля Связи" детализирована дорожная карта развития '
    "relation engine и перехода Parent Record на Relation Engine."
)

_RELATION_FIELD_TYPE_CHANGELOG_DESCRIPTION = (
    'Компонент "Тип поля Связи" обновлён. '
    "Добавлены детализированные шаги реализации relation engine."
)

_RELATION_FIELD_TYPE_SELF_RELATION_DESCRIPTION = (
    'Этап "Тип поля Связи": завершена поддержка self-relation '
    "(Object A → Object A) через Relation Engine без отдельного движка."
)

_RELATION_FIELD_TYPE_TASK_SUBTASK_SPEC_DESCRIPTION = (
    'Подготовлена каноническая спецификация task_subtask (ADR): '
    "relation_key task_subtask, source=Parent, target=Child, one_to_many, "
    "SoT runtime_relation_instances. Реализация — следующие этапы Dashboard."
)

_RELATION_FIELD_TYPE_TASK_SUBTASK_DOMAIN_DESCRIPTION = (
    'Этап "Тип поля Связи": доменные ограничения task_subtask в Relation Engine — '
    "один родитель, запрет самоссылки и защита от циклов (только profile task_subtask)."
)

_RELATION_FIELD_TYPE_PARENT_SECTION_DESCRIPTION = (
    'Этап "Тип поля Связи": Parent Section карточки объекта переведена на Relation Engine — '
    "incoming hierarchy relation (child=target), Title Field родителя, без parent_row_id."
)

_RELATION_FIELD_TYPE_SUBTASKS_RELATION_ENGINE_DESCRIPTION = (
    'Этап "Тип поля Связи": подзадачи через Relation Engine — дочерние элементы во вкладке '
    "«Связанные записи», создание и привязка без терминов Relation Engine; "
    "SoT runtime_relation_instances."
)

_RELATION_FIELD_TYPE_SUBTASKS_RELATIONS_TAB_UX_DESCRIPTION = (
    'Корректировка UX подзадач: убран отдельный блок «Подзадачи» из тела карточки; '
    "дочерние задачи отображаются во вкладке «Связанные записи» с кнопкой «+ Подзадачу»."
)

_RELATION_FIELD_TYPE_QUICK_CREATE_FORM_DESCRIPTION = (
    'Платформенная быстрая форма создания записи: свойство поля quick_create в Studio, '
    "PlatformQuickCreateForm через Platform Modal для обычного create и подзадач."
)

_RELATION_FIELD_TYPE_OBJECT_TABLE_TREE_VIEW_DESCRIPTION = (
    'MVP Tree Mode для Object Table: вложенные строки по hierarchy relation, '
    "SoT runtime_relation_instances (batch list by relation_key), expand/collapse и "
    "отступ только в колонке Title Field; без parent_row_id."
)

OFFICE_USER_TABLE_VIEWS_COLUMN_ORDER_HISTORY_SLUG = (
    "office-user-table-views-column-order-history-20260605"
)
OFFICE_USER_TABLE_VIEWS_COLUMN_ORDER_CHANGELOG_SLUG = (
    "office-user-table-views-column-order-changelog-20260605"
)

_OFFICE_USER_TABLE_VIEWS_COLUMN_ORDER_HISTORY_DESCRIPTION = (
    "Office: пользовательские табличные представления хранят порядок колонок "
    "в runtime_office_user_table_views.settings_json.columns; UI ↑/↓ меняет порядок "
    "без привязки к Studio schema; состояние «Все» сохраняет канонический порядок."
)

_OFFICE_USER_TABLE_VIEWS_COLUMN_ORDER_CHANGELOG_DESCRIPTION = (
    "Office User Views: исправлено перемещение и сохранение порядка колонок. "
    "Backend API /runtime/office-user-views; порядок в settings.columns и "
    "presentation.table.columnOrder; изоляция по owner_user_id."
)

OFFICE_USER_TABLE_VIEWS_DEFAULT_HISTORY_SLUG = (
    "office-user-table-views-default-history-20260605"
)
OFFICE_USER_TABLE_VIEWS_DEFAULT_CHANGELOG_SLUG = (
    "office-user-table-views-default-changelog-20260605"
)

_OFFICE_USER_TABLE_VIEWS_DEFAULT_HISTORY_DESCRIPTION = (
    "Office User Views: ⭐ как представление по умолчанию — default_view_key/id "
    "из API, автозапуск таблицы на default view, переключение default между "
    "пользовательскими представлениями без скрытия списка."
)

_OFFICE_USER_TABLE_VIEWS_DEFAULT_CHANGELOG_DESCRIPTION = (
    "Office User Views: исправлена логика представления по умолчанию (⭐). "
    "При входе открывается default user view; переключение default через PATCH; "
    "active view и default view разделены."
)

OFFICE_USER_TABLE_VIEWS_TAB_KEY_FIX_HISTORY_SLUG = (
    "office-user-table-views-tab-key-fix-history-20260605"
)
OFFICE_USER_TABLE_VIEWS_TAB_KEY_FIX_CHANGELOG_SLUG = (
    "office-user-table-views-tab-key-fix-changelog-20260605"
)

_OFFICE_USER_TABLE_VIEWS_TAB_KEY_FIX_HISTORY_DESCRIPTION = (
    "Office User Views: разделены object tab key (default_table) и representation "
    "view key; refresh открывает default user view, tab key не блокирует auto-default."
)

_OFFICE_USER_TABLE_VIEWS_TAB_KEY_FIX_CHANGELOG_DESCRIPTION = (
    "Office User Views: исправлен конфликт default_table (вкладка объекта) с "
    "представлением по умолчанию — после refresh открывается default user view."
)

OFFICE_USER_TABLE_VIEWS_COLUMN_VISIBILITY_HISTORY_SLUG = (
    "office-user-table-views-column-visibility-history-20260605"
)
OFFICE_USER_TABLE_VIEWS_COLUMN_VISIBILITY_CHANGELOG_SLUG = (
    "office-user-table-views-column-visibility-changelog-20260605"
)

_OFFICE_USER_TABLE_VIEWS_COLUMN_VISIBILITY_HISTORY_DESCRIPTION = (
    "Office User Views: скрытие колонок (visible=false) применяется в runtime-таблице "
    "и сохраняется в settings_json.columns; состояние «Все» не затрагивается."
)

_OFFICE_USER_TABLE_VIEWS_COLUMN_VISIBILITY_CHANGELOG_DESCRIPTION = (
    "Office User Views: исправлено применение скрытия колонок — settings.columns "
    "visible=false исключает колонки из таблицы после сохранения и refresh."
)

OFFICE_USER_VIEW_UNSAVED_GUARD_MODAL_HISTORY_SLUG = (
    "office-user-view-unsaved-guard-modal-history-20260605"
)
OFFICE_USER_VIEW_UNSAVED_GUARD_MODAL_CHANGELOG_SLUG = (
    "office-user-view-unsaved-guard-modal-changelog-20260605"
)

_OFFICE_USER_VIEW_UNSAVED_GUARD_MODAL_HISTORY_DESCRIPTION = (
    "Office User Views: модалка несохранённых изменений на PlatformModal — "
    "drag/resize/persist, профессиональный layout и три действия в footer."
)

_OFFICE_USER_VIEW_UNSAVED_GUARD_MODAL_CHANGELOG_DESCRIPTION = (
    "Office: модалка подтверждения изменений представления переведена на "
    "PlatformModal (office-user-view-unsaved-changes-modal)."
)

OBJECT_ENGINE_RECORD_NUMBER_HISTORY_SLUG = (
    "object-engine-record-number-history-20260605"
)
OBJECT_ENGINE_RECORD_NUMBER_CHANGELOG_SLUG = (
    "object-engine-record-number-changelog-20260605"
)

_OBJECT_ENGINE_RECORD_NUMBER_HISTORY_DESCRIPTION = (
    "Object Engine: постоянный record_number в runtime_entities и динамическая "
    "позиция строки в Object Table View (buildRowNumbers)."
)

_OBJECT_ENGINE_RECORD_NUMBER_CHANGELOG_DESCRIPTION = (
    "Object Table View: колонка № (record_number) + бейдж позиции у Title Field; "
    "уникальность номера внутри Object Type."
)

OBJECT_ENGINE_RECORD_NUMBER_FIX_HISTORY_SLUG = (
    "object-engine-record-number-migration-fix-20260605"
)
OBJECT_ENGINE_RECORD_NUMBER_FIX_CHANGELOG_SLUG = (
    "object-engine-record-number-migration-fix-changelog-20260605"
)

_OBJECT_ENGINE_RECORD_NUMBER_FIX_HISTORY_DESCRIPTION = (
    "Object Engine: применена миграция record_number, устранён Network Error "
    "в Object Table View; позиция [N] внутри Title Field."
)

_OBJECT_ENGINE_RECORD_NUMBER_FIX_CHANGELOG_DESCRIPTION = (
    "Исправление: alembic 20260605_0016 (record_number) + бейдж [позиция] в Title Field."
)

OBJECT_ENGINE_HIERARCHY_DELETE_HISTORY_SLUG = (
    "object-engine-hierarchy-delete-history-20260605"
)
OBJECT_ENGINE_HIERARCHY_DELETE_CHANGELOG_SLUG = (
    "object-engine-hierarchy-delete-changelog-20260605"
)

_OBJECT_ENGINE_HIERARCHY_DELETE_HISTORY_DESCRIPTION = (
    "Object Engine: безопасное удаление runtime entity с выбором сценария "
    "при наличии подзадач (Relation Engine, soft delete)."
)

_OBJECT_ENGINE_HIERARCHY_DELETE_CHANGELOG_DESCRIPTION = (
    "Object Table: delete-preview + POST /delete (unlink_children / with_descendants); "
    "PlatformModal подтверждение; без parent_row_id и hard delete."
)

OBJECT_ENGINE_ROW_MENU_HISTORY_SLUG = "object-engine-row-menu-history-20260605"
OBJECT_ENGINE_ROW_MENU_CHANGELOG_SLUG = "object-engine-row-menu-changelog-20260605"

_OBJECT_ENGINE_ROW_MENU_HISTORY_DESCRIPTION = (
    "View Engine: ViewEngineRowMenu (⋮ по hover) в Title Field — "
    "Подзадача через Quick Create + task_subtask, Удалить через onBeginDeleteEntity."
)

_OBJECT_ENGINE_ROW_MENU_CHANGELOG_DESCRIPTION = (
    "Object Table: строковое меню ⋮ в ViewEngineTitleFieldChrome; "
    "rowActions в rendererContext; Relation Engine для подзадач."
)

OBJECT_ENGINE_HIERARCHY_LABELS_HISTORY_SLUG = (
    "object-engine-hierarchy-labels-history-20260605"
)
OBJECT_ENGINE_HIERARCHY_LABELS_CHANGELOG_SLUG = (
    "object-engine-hierarchy-labels-changelog-20260605"
)

_OBJECT_ENGINE_HIERARCHY_LABELS_HISTORY_DESCRIPTION = (
    "Studio + Object Table: терминология иерархической связи в settings_json "
    "(hierarchy_labels), автоподстановка форм, динамические подписи в меню строки "
    "и модалке удаления."
)

_OBJECT_ENGINE_HIERARCHY_LABELS_CHANGELOG_DESCRIPTION = (
    "Связи: блок «Терминология иерархии» (is_hierarchy + hierarchy_labels); "
    "delete-preview возвращает hierarchy_labels; UI без хардкода «Подзадача»."
)

OBJECT_ENGINE_HIERARCHY_LABELS_PUBLISH_STATE_FIX_SLUG = (
    "object-engine-hierarchy-labels-publish-state-fix-20260605"
)

_OBJECT_ENGINE_HIERARCHY_LABELS_PUBLISH_STATE_FIX_DESCRIPTION = (
    "Исправление: изменение hierarchy_labels в RelationsTab помечает Object Type "
    "как неопубликованный (touch updated_at + onSchemaChanged)."
)

OBJECT_ENGINE_TABLE_BULK_SELECTION_HISTORY_SLUG = (
    "object-engine-table-bulk-selection-history-20260605"
)
OBJECT_ENGINE_TABLE_BULK_SELECTION_CHANGELOG_SLUG = (
    "object-engine-table-bulk-selection-changelog-20260605"
)

_OBJECT_ENGINE_TABLE_BULK_SELECTION_HISTORY_DESCRIPTION = (
    "Object Table: массовое выделение строк через чекбоксы (видимые строки, "
    "indeterminate header, панель массовых действий)."
)

_OBJECT_ENGINE_TABLE_BULK_SELECTION_CHANGELOG_DESCRIPTION = (
    "useObjectTableSelection + ObjectTableBulkActionsBar; интерактивные чекбоксы "
    "ViewEngineTable; основа для будущего массового удаления."
)

OBJECT_ENGINE_TABLE_BULK_DELETE_HISTORY_SLUG = (
    "object-engine-table-bulk-delete-history-20260605"
)
OBJECT_ENGINE_TABLE_BULK_DELETE_CHANGELOG_SLUG = (
    "object-engine-table-bulk-delete-changelog-20260605"
)

_OBJECT_ENGINE_TABLE_BULK_DELETE_HISTORY_DESCRIPTION = (
    "Object Table: массовое удаление выбранных записей через существующие "
    "модалки unlink_children / with_descendants и delete-preview."
)

_OBJECT_ENGINE_TABLE_BULK_DELETE_CHANGELOG_DESCRIPTION = (
    "useObjectEntitiesBulkDelete + aggregateBulkDeletePreview; переиспользованы "
    "ObjectEntityDeleteConfirmModal / ObjectEntityDeleteScenarioModal."
)

OBJECT_ENGINE_TABLE_BULK_DELETE_LABELS_SLUG = (
    "object-engine-table-bulk-delete-labels-20260605"
)

_OBJECT_ENGINE_TABLE_BULK_DELETE_LABELS_DESCRIPTION = (
    "Массовая модалка удаления Object Table: hierarchy_labels через "
    "buildBulkDeleteLabels, компактные бейджи статистики."
)

OBJECT_ENGINE_TABLE_REPRESENTATION_CHIP_STYLE_SLUG = (
    "object-engine-table-representation-chip-style-20260605"
)

_OBJECT_ENGINE_TABLE_REPRESENTATION_CHIP_STYLE_DESCRIPTION = (
    "Object Table: пользовательские представления в одном ряду с «Все» "
    "и быстрыми фильтрами через view-engine-toolbar__quick-filter-btn."
)

OBJECT_ENGINE_TABLE_REPRESENTATION_LAYOUT_FIX_SLUG = (
    "object-engine-table-representation-layout-fix-20260605"
)

_OBJECT_ENGINE_TABLE_REPRESENTATION_LAYOUT_FIX_DESCRIPTION = (
    "Object Table: пользовательские представления справа (toolbar__right), "
    "типографика quick-filter-btn как у «Все»; слева только Фильтры и быстрые фильтры."
)

OBJECT_ENGINE_TABLE_TOOLBAR_HEIGHT_SLUG = (
    "object-engine-table-toolbar-height-20260605"
)

_OBJECT_ENGINE_TABLE_TOOLBAR_HEIGHT_DESCRIPTION = (
    "Object Table toolbar: единая высота кнопок через "
    "--view-engine-toolbar-control-height (28px, эталон «Фильтры»)."
)

OBJECT_ENGINE_TABLE_FILTERS_MODAL_SLUG = (
    "object-engine-table-filters-modal-20260605"
)

_OBJECT_ENGINE_TABLE_FILTERS_MODAL_DESCRIPTION = (
    "Object Table: PlatformModal фильтрации (панель условий, сохранённый фильтр, "
    "Сбросить/Применить, компактный layout 800px, без UT legacy-полей)."
)

OBJECT_ENGINE_TABLE_FILTERS_TYPED_EDITORS_SLUG = (
    "object-engine-table-filters-typed-editors-20260605"
)

_OBJECT_ENGINE_TABLE_FILTERS_TYPED_EDITORS_DESCRIPTION = (
    "Object Table Filters Phase 1: скрыт __table_row_number в dropdown, "
    "оставлен «№ записи»; fieldType в опциях; типизированные редакторы значений "
    "(text/number/date/datetime/user/choice/boolean) через платформенные компоненты."
)

OBJECT_ENGINE_TABLE_FILTERS_OPERATORS_SLUG = (
    "object-engine-table-filters-operators-20260605"
)

_OBJECT_ENGINE_TABLE_FILTERS_OPERATORS_DESCRIPTION = (
    "Object Table Filters — Phase 2 (Operators): динамические операторы по типу поля, "
    "runtime filters JSON (eq/neq/contains/gt/gte/lt/lte/before/after/in/not_in/"
    "is_empty/is_not_empty), поддержка в runtime query repository."
)

OBJECT_ENGINE_TABLE_FILTERS_OPERATORS_STABILIZATION_HISTORY_SLUG = (
    "object-engine-table-filters-operators-stabilization-history-20260605"
)

OBJECT_ENGINE_TABLE_FILTERS_OPERATORS_STABILIZATION_CHANGELOG_SLUG = (
    "object-engine-table-filters-operators-stabilization-changelog-20260605"
)

_OBJECT_ENGINE_TABLE_FILTERS_OPERATORS_STABILIZATION_DESCRIPTION = (
    "Object Table Filters — Backend Operators Stabilization: исправлен HTTP 500 "
    "при фильтрации custom fields (user/choice/number/date/text); "
    "_jsonb_text() (#>> '{}') только для текстовых операторов и is_empty; "
    "eq/neq/in/not_in/gt/gte/lt/lte/before/after через JSONB cast без текстового извлечения."
)

OBJECT_ENGINE_TABLE_FILTERS_PHASE3_HISTORY_SLUG = (
    "object-engine-table-filters-phase3-history-20260605"
)

OBJECT_ENGINE_TABLE_FILTERS_PHASE3_CHANGELOG_SLUG = (
    "object-engine-table-filters-phase3-changelog-20260605"
)

_OBJECT_ENGINE_TABLE_FILTERS_PHASE3_DESCRIPTION = (
    "Object Table Filters — Phase 3: сохранённые фильтры (CRUD), быстрые фильтры "
    "с чекбоксом, фильтр по умолчанию, модалка aligned with Universal Tables, "
    "счётчик «Фильтры (N)» по merged conditions."
)

OBJECT_ENGINE_TABLE_QUICK_FILTERS_OVERFLOW_HISTORY_SLUG = (
    "object-engine-table-quick-filters-overflow-history-20260605"
)

OBJECT_ENGINE_TABLE_QUICK_FILTERS_OVERFLOW_CHANGELOG_SLUG = (
    "object-engine-table-quick-filters-overflow-changelog-20260605"
)

_OBJECT_ENGINE_TABLE_QUICK_FILTERS_OVERFLOW_DESCRIPTION = (
    "Перенос быстрых фильтров в overflow панели фильтрации: меню «...» рядом с «Все» "
    "только для скрытых быстрых фильтров; создание через модалку «Фильтры» "
    "(чекбокс «Быстрый фильтр»); удалён пункт «Создать быстрый фильтр»."
)

OBJECT_ENGINE_TABLE_QUICK_FILTERS_LAYERING_HISTORY_SLUG = (
    "object-engine-table-quick-filters-layering-history-20260605"
)

OBJECT_ENGINE_TABLE_QUICK_FILTERS_LAYERING_CHANGELOG_SLUG = (
    "object-engine-table-quick-filters-layering-changelog-20260605"
)

_OBJECT_ENGINE_TABLE_QUICK_FILTERS_LAYERING_DESCRIPTION = (
    "Object Table — слои фильтрации: условия представления (filterConditions) "
    "и быстрый фильтр (activeQuickFilterId + savedFilters.isQuick) разделены; "
    "runtime merge = view.conditions AND quickFilter.conditions; быстрый фильтр "
    "не перезаписывает условия представления при сохранении."
)

OBJECT_ENGINE_TABLE_SAVED_FILTERS_UNIFICATION_HISTORY_SLUG = (
    "object-engine-table-saved-filters-unification-history-20260605"
)

OBJECT_ENGINE_TABLE_SAVED_FILTERS_UNIFICATION_CHANGELOG_SLUG = (
    "object-engine-table-saved-filters-unification-changelog-20260605"
)

_OBJECT_ENGINE_TABLE_SAVED_FILTERS_UNIFICATION_DESCRIPTION = (
    "Унификация быстрых и сохранённых фильтров: quick filter = savedFilters "
    "с isQuick=true; каталог savedFilters не делает представление dirty; "
    "patchSavedFiltersCatalog; список «Сохранённые» включает все savedFilters."
)

OBJECT_ENGINE_TABLE_TITLE_FIELD_VISIBILITY_HISTORY_SLUG = (
    "object-engine-table-title-field-visibility-history-20260605"
)

OBJECT_ENGINE_TABLE_TITLE_FIELD_VISIBILITY_CHANGELOG_SLUG = (
    "object-engine-table-title-field-visibility-changelog-20260605"
)

_OBJECT_ENGINE_TABLE_TITLE_FIELD_VISIBILITY_DESCRIPTION = (
    "Object Table — глаз у Title Field: floating panel «Поля таблицы» для "
    "быстрого управления видимостью колонок; единый state hiddenFieldKeys / "
    "toggleFieldVisibility (useObjectViewSession); dirty guard и сохранение "
    "представления без дублирования UT storage."
)


def _ensure_page_visibility_single_source_dashboard_notes(
    db: Session,
    *,
    initiated_by_user_id: int | None,
    initiated_by_name: str | None,
) -> tuple[int, list[str]]:
    stage = (
        db.query(PlatformImplementationStage)
        .filter(PlatformImplementationStage.slug == "designer-foundation")
        .one_or_none()
    )
    related_stage_id = stage.id if stage is not None else None
    added = 0
    journal_lines: list[str] = []

    if _add_activity(
        db,
        slug=PAGE_VISIBILITY_SINGLE_SOURCE_HISTORY_SLUG,
        title="Единый источник истины видимости страниц",
        description=_PAGE_VISIBILITY_SINGLE_SOURCE_HISTORY_DESCRIPTION,
        result=_PAGE_VISIBILITY_SINGLE_SOURCE_CHANGELOG_DESCRIPTION,
        activity_type=PlatformActivityType.MILESTONE.value,
        related_stage_id=related_stage_id,
        initiated_by_user_id=initiated_by_user_id,
        initiated_by_name=initiated_by_name,
    ):
        added += 1

    if _add_activity(
        db,
        slug=PAGE_VISIBILITY_SINGLE_SOURCE_CHANGELOG_SLUG,
        title="Журнал изменений: видимость страниц",
        description=_PAGE_VISIBILITY_SINGLE_SOURCE_CHANGELOG_DESCRIPTION,
        result=_PAGE_VISIBILITY_SINGLE_SOURCE_CHANGELOG_DESCRIPTION,
        activity_type=PlatformActivityType.MILESTONE.value,
        related_stage_id=related_stage_id,
        initiated_by_user_id=initiated_by_user_id,
        initiated_by_name=initiated_by_name,
    ):
        added += 1
        journal_lines.append(_PAGE_VISIBILITY_SINGLE_SOURCE_CHANGELOG_DESCRIPTION)

    return added, journal_lines


def _ensure_page_publication_places_dashboard_notes(
    db: Session,
    *,
    initiated_by_user_id: int | None,
    initiated_by_name: str | None,
) -> tuple[int, list[str]]:
    stage = (
        db.query(PlatformImplementationStage)
        .filter(PlatformImplementationStage.slug == "designer-foundation")
        .one_or_none()
    )
    related_stage_id = stage.id if stage is not None else None
    added = 0
    journal_lines: list[str] = []

    if _add_activity(
        db,
        slug=PAGE_PUBLICATION_PLACES_HISTORY_SLUG,
        title="Места публикации страниц",
        description=_PAGE_PUBLICATION_PLACES_HISTORY_DESCRIPTION,
        result=(
            "Реестр страниц показывает фактические места публикации; "
            "hidden/draft скрыты из Studio, Office и Workspace меню."
        ),
        activity_type=PlatformActivityType.MILESTONE.value,
        related_stage_id=related_stage_id,
        initiated_by_user_id=initiated_by_user_id,
        initiated_by_name=initiated_by_name,
    ):
        added += 1

    if _add_activity(
        db,
        slug=PAGE_PUBLICATION_PLACES_CHANGELOG_SLUG,
        title='Журнал изменений: места публикации страниц',
        description=_PAGE_PUBLICATION_PLACES_CHANGELOG_DESCRIPTION,
        result=_PAGE_PUBLICATION_PLACES_CHANGELOG_DESCRIPTION,
        activity_type=PlatformActivityType.MILESTONE.value,
        related_stage_id=related_stage_id,
        initiated_by_user_id=initiated_by_user_id,
        initiated_by_name=initiated_by_name,
    ):
        added += 1
        journal_lines.append(_PAGE_PUBLICATION_PLACES_CHANGELOG_DESCRIPTION)

    return added, journal_lines


def _ensure_page_status_normalization_dashboard_notes(
    db: Session,
    *,
    initiated_by_user_id: int | None,
    initiated_by_name: str | None,
) -> tuple[int, list[str]]:
    stage = (
        db.query(PlatformImplementationStage)
        .filter(PlatformImplementationStage.slug == "designer-foundation")
        .one_or_none()
    )
    related_stage_id = stage.id if stage is not None else None
    added = 0
    journal_lines: list[str] = []

    if _add_activity(
        db,
        slug=PAGE_STATUS_NORMALIZATION_HISTORY_SLUG,
        title="Нормализация статусов существующих страниц",
        description=_PAGE_STATUS_NORMALIZATION_DESCRIPTION,
        result=_PAGE_STATUS_NORMALIZATION_DESCRIPTION,
        activity_type=PlatformActivityType.MILESTONE.value,
        related_stage_id=related_stage_id,
        initiated_by_user_id=initiated_by_user_id,
        initiated_by_name=initiated_by_name,
    ):
        added += 1

    if _add_activity(
        db,
        slug=PAGE_STATUS_NORMALIZATION_CHANGELOG_SLUG,
        title="Журнал изменений: нормализация статусов страниц",
        description=_PAGE_STATUS_NORMALIZATION_DESCRIPTION,
        result=_PAGE_STATUS_NORMALIZATION_DESCRIPTION,
        activity_type=PlatformActivityType.MILESTONE.value,
        related_stage_id=related_stage_id,
        initiated_by_user_id=initiated_by_user_id,
        initiated_by_name=initiated_by_name,
    ):
        added += 1
        journal_lines.append(_PAGE_STATUS_NORMALIZATION_DESCRIPTION)

    return added, journal_lines


def _ensure_relation_field_type_dashboard_notes(
    db: Session,
    *,
    initiated_by_user_id: int | None,
    initiated_by_name: str | None,
) -> tuple[int, list[str]]:
    """Idempotent owner history + changelog entries for relation-field-type roadmap."""
    stage = (
        db.query(PlatformImplementationStage)
        .filter(PlatformImplementationStage.slug == "relation-field-type")
        .one_or_none()
    )
    related_stage_id = stage.id if stage is not None else None
    added = 0
    journal_lines: list[str] = []

    if _add_activity(
        db,
        slug=RELATION_FIELD_TYPE_HISTORY_SLUG,
        title='Тип поля "Связи": дорожная карта',
        description=_RELATION_FIELD_TYPE_HISTORY_DESCRIPTION,
        result="Детализированы шаги программы relation engine и перехода Parent Record.",
        activity_type=PlatformActivityType.MILESTONE.value,
        related_stage_id=related_stage_id,
        initiated_by_user_id=initiated_by_user_id,
        initiated_by_name=initiated_by_name,
    ):
        added += 1

    if _add_activity(
        db,
        slug=RELATION_FIELD_TYPE_CHANGELOG_SLUG,
        title='Журнал изменений: тип поля "Связи"',
        description=_RELATION_FIELD_TYPE_CHANGELOG_DESCRIPTION,
        result=_RELATION_FIELD_TYPE_CHANGELOG_DESCRIPTION,
        activity_type=PlatformActivityType.MILESTONE.value,
        related_stage_id=related_stage_id,
        initiated_by_user_id=initiated_by_user_id,
        initiated_by_name=initiated_by_name,
    ):
        added += 1
        journal_lines.append(_RELATION_FIELD_TYPE_CHANGELOG_DESCRIPTION)

    if _add_activity(
        db,
        slug=RELATION_FIELD_TYPE_SELF_RELATION_SLUG,
        title='Тип поля "Связи": self-relation support',
        description=_RELATION_FIELD_TYPE_SELF_RELATION_DESCRIPTION,
        result=(
            "Designer, Publish, Runtime и Relation Engine поддерживают связи "
            "между записями одного ObjectType (включая A → A)."
        ),
        activity_type=PlatformActivityType.MILESTONE.value,
        related_stage_id=related_stage_id,
        initiated_by_user_id=initiated_by_user_id,
        initiated_by_name=initiated_by_name,
    ):
        added += 1
        journal_lines.append(_RELATION_FIELD_TYPE_SELF_RELATION_DESCRIPTION)

    if _add_activity(
        db,
        slug=RELATION_FIELD_TYPE_TASK_SUBTASK_SPEC_SLUG,
        title='Тип поля "Связи": спецификация task_subtask',
        description=_RELATION_FIELD_TYPE_TASK_SUBTASK_SPEC_DESCRIPTION,
        result=(
            "Зафиксирован ADR docs/architecture/ADR_TASK_SUBTASK_RELATION_SPEC.md. "
            "Канон: task_subtask, Parent=source, Subtask=target, one_to_many."
        ),
        activity_type=PlatformActivityType.MILESTONE.value,
        related_stage_id=related_stage_id,
        initiated_by_user_id=initiated_by_user_id,
        initiated_by_name=initiated_by_name,
    ):
        added += 1
        journal_lines.append(_RELATION_FIELD_TYPE_TASK_SUBTASK_SPEC_DESCRIPTION)

    if _add_activity(
        db,
        slug=RELATION_FIELD_TYPE_TASK_SUBTASK_DOMAIN_SLUG,
        title='Тип поля "Связи": доменные ограничения task_subtask',
        description=_RELATION_FIELD_TYPE_TASK_SUBTASK_DOMAIN_DESCRIPTION,
        result=(
            "Runtime: validate_relation_instance_domain_rules — один родитель, "
            "запрет A→A и anti-cycle для relation_key task_subtask; "
            "прочие self-relations без изменений."
        ),
        activity_type=PlatformActivityType.MILESTONE.value,
        related_stage_id=related_stage_id,
        initiated_by_user_id=initiated_by_user_id,
        initiated_by_name=initiated_by_name,
    ):
        added += 1
        journal_lines.append(_RELATION_FIELD_TYPE_TASK_SUBTASK_DOMAIN_DESCRIPTION)

    if _add_activity(
        db,
        slug=RELATION_FIELD_TYPE_PARENT_SECTION_SLUG,
        title='Тип поля "Связи": Parent Section через relation engine',
        description=_RELATION_FIELD_TYPE_PARENT_SECTION_DESCRIPTION,
        result=(
            "OEC: блок «Родительская запись» читает runtime_relation_instances "
            "(hierarchy semantic_profile / task_subtask), отображает Title Field."
        ),
        activity_type=PlatformActivityType.MILESTONE.value,
        related_stage_id=related_stage_id,
        initiated_by_user_id=initiated_by_user_id,
        initiated_by_name=initiated_by_name,
    ):
        added += 1
        journal_lines.append(_RELATION_FIELD_TYPE_PARENT_SECTION_DESCRIPTION)

    if _add_activity(
        db,
        slug=RELATION_FIELD_TYPE_SUBTASKS_RELATION_ENGINE_SLUG,
        title='Тип поля "Связи": подзадачи через relation engine',
        description=_RELATION_FIELD_TYPE_SUBTASKS_RELATION_ENGINE_DESCRIPTION,
        result=(
            "Вкладка «Связанные записи»: группа «Подзадачи», «+ Подзадачу», "
            "создание/привязка; hierarchy fields скрыты из сетки полей."
        ),
        activity_type=PlatformActivityType.MILESTONE.value,
        related_stage_id=related_stage_id,
        initiated_by_user_id=initiated_by_user_id,
        initiated_by_name=initiated_by_name,
    ):
        added += 1
        journal_lines.append(_RELATION_FIELD_TYPE_SUBTASKS_RELATION_ENGINE_DESCRIPTION)

    if _add_activity(
        db,
        slug=RELATION_FIELD_TYPE_SUBTASKS_RELATIONS_TAB_UX_SLUG,
        title='Тип поля "Связи": подзадачи во вкладке «Связанные записи»',
        description=_RELATION_FIELD_TYPE_SUBTASKS_RELATIONS_TAB_UX_DESCRIPTION,
        result=(
            "Удалён отдельный блок «Подзадачи» над полями; UX перенесён во вкладку "
            "«Связанные записи» (HierarchyChildRelationsGroup, настраиваемые подписи)."
        ),
        activity_type=PlatformActivityType.MILESTONE.value,
        related_stage_id=related_stage_id,
        initiated_by_user_id=initiated_by_user_id,
        initiated_by_name=initiated_by_name,
    ):
        added += 1
        journal_lines.append(_RELATION_FIELD_TYPE_SUBTASKS_RELATIONS_TAB_UX_DESCRIPTION)

    if _add_activity(
        db,
        slug=RELATION_FIELD_TYPE_QUICK_CREATE_FORM_SLUG,
        title='Тип поля "Связи": быстрая форма создания записи',
        description=_RELATION_FIELD_TYPE_QUICK_CREATE_FORM_DESCRIPTION,
        result=(
            "quick_create в Field Definition; PlatformQuickCreateForm; "
            "единый create-flow для таблицы и подзадач."
        ),
        activity_type=PlatformActivityType.MILESTONE.value,
        related_stage_id=related_stage_id,
        initiated_by_user_id=initiated_by_user_id,
        initiated_by_name=initiated_by_name,
    ):
        added += 1
        journal_lines.append(_RELATION_FIELD_TYPE_QUICK_CREATE_FORM_DESCRIPTION)

    if _add_activity(
        db,
        slug=RELATION_FIELD_TYPE_OBJECT_TABLE_TREE_VIEW_SLUG,
        title='Тип поля "Связи": Tree View для Object Table',
        description=_RELATION_FIELD_TYPE_OBJECT_TABLE_TREE_VIEW_DESCRIPTION,
        result=(
            "Таблица объекта: иерархия task_subtask через runtime_relation_instances, "
            "раскрытие в Title Field, состояние expanded в localStorage (object type + view)."
        ),
        activity_type=PlatformActivityType.MILESTONE.value,
        related_stage_id=related_stage_id,
        initiated_by_user_id=initiated_by_user_id,
        initiated_by_name=initiated_by_name,
    ):
        added += 1
        journal_lines.append(_RELATION_FIELD_TYPE_OBJECT_TABLE_TREE_VIEW_DESCRIPTION)

    return added, journal_lines


def _ensure_office_user_table_views_column_order_dashboard_notes(
    db: Session,
    *,
    initiated_by_user_id: int | None,
    initiated_by_name: str | None,
) -> tuple[int, list[str]]:
    stage = (
        db.query(PlatformImplementationStage)
        .filter(PlatformImplementationStage.slug == "views-engine")
        .one_or_none()
    )
    related_stage_id = stage.id if stage is not None else None
    added = 0
    journal_lines: list[str] = []

    if _add_activity(
        db,
        slug=OFFICE_USER_TABLE_VIEWS_COLUMN_ORDER_HISTORY_SLUG,
        title="Office: порядок колонок пользовательских представлений",
        description=_OFFICE_USER_TABLE_VIEWS_COLUMN_ORDER_HISTORY_DESCRIPTION,
        result=_OFFICE_USER_TABLE_VIEWS_COLUMN_ORDER_CHANGELOG_DESCRIPTION,
        activity_type=PlatformActivityType.MILESTONE.value,
        related_stage_id=related_stage_id,
        initiated_by_user_id=initiated_by_user_id,
        initiated_by_name=initiated_by_name,
    ):
        added += 1

    if _add_activity(
        db,
        slug=OFFICE_USER_TABLE_VIEWS_COLUMN_ORDER_CHANGELOG_SLUG,
        title="Журнал изменений: порядок колонок Office User Views",
        description=_OFFICE_USER_TABLE_VIEWS_COLUMN_ORDER_CHANGELOG_DESCRIPTION,
        result=_OFFICE_USER_TABLE_VIEWS_COLUMN_ORDER_CHANGELOG_DESCRIPTION,
        activity_type=PlatformActivityType.MILESTONE.value,
        related_stage_id=related_stage_id,
        initiated_by_user_id=initiated_by_user_id,
        initiated_by_name=initiated_by_name,
    ):
        added += 1
        journal_lines.append(_OFFICE_USER_TABLE_VIEWS_COLUMN_ORDER_CHANGELOG_DESCRIPTION)

    return added, journal_lines


def _ensure_office_user_table_views_default_dashboard_notes(
    db: Session,
    *,
    initiated_by_user_id: int | None,
    initiated_by_name: str | None,
) -> tuple[int, list[str]]:
    stage = (
        db.query(PlatformImplementationStage)
        .filter(PlatformImplementationStage.slug == "views-engine")
        .one_or_none()
    )
    related_stage_id = stage.id if stage is not None else None
    added = 0
    journal_lines: list[str] = []

    if _add_activity(
        db,
        slug=OFFICE_USER_TABLE_VIEWS_DEFAULT_HISTORY_SLUG,
        title="Office: представление по умолчанию (⭐)",
        description=_OFFICE_USER_TABLE_VIEWS_DEFAULT_HISTORY_DESCRIPTION,
        result=_OFFICE_USER_TABLE_VIEWS_DEFAULT_CHANGELOG_DESCRIPTION,
        activity_type=PlatformActivityType.MILESTONE.value,
        related_stage_id=related_stage_id,
        initiated_by_user_id=initiated_by_user_id,
        initiated_by_name=initiated_by_name,
    ):
        added += 1

    if _add_activity(
        db,
        slug=OFFICE_USER_TABLE_VIEWS_DEFAULT_CHANGELOG_SLUG,
        title="Журнал изменений: default Office User Views",
        description=_OFFICE_USER_TABLE_VIEWS_DEFAULT_CHANGELOG_DESCRIPTION,
        result=_OFFICE_USER_TABLE_VIEWS_DEFAULT_CHANGELOG_DESCRIPTION,
        activity_type=PlatformActivityType.MILESTONE.value,
        related_stage_id=related_stage_id,
        initiated_by_user_id=initiated_by_user_id,
        initiated_by_name=initiated_by_name,
    ):
        added += 1
        journal_lines.append(_OFFICE_USER_TABLE_VIEWS_DEFAULT_CHANGELOG_DESCRIPTION)

    return added, journal_lines


def _ensure_office_user_table_views_tab_key_fix_dashboard_notes(
    db: Session,
    *,
    initiated_by_user_id: int | None,
    initiated_by_name: str | None,
) -> tuple[int, list[str]]:
    stage = (
        db.query(PlatformImplementationStage)
        .filter(PlatformImplementationStage.slug == "views-engine")
        .one_or_none()
    )
    related_stage_id = stage.id if stage is not None else None
    added = 0
    journal_lines: list[str] = []

    if _add_activity(
        db,
        slug=OFFICE_USER_TABLE_VIEWS_TAB_KEY_FIX_HISTORY_SLUG,
        title="Office: default view после refresh (tab key fix)",
        description=_OFFICE_USER_TABLE_VIEWS_TAB_KEY_FIX_HISTORY_DESCRIPTION,
        result=_OFFICE_USER_TABLE_VIEWS_TAB_KEY_FIX_CHANGELOG_DESCRIPTION,
        activity_type=PlatformActivityType.MILESTONE.value,
        related_stage_id=related_stage_id,
        initiated_by_user_id=initiated_by_user_id,
        initiated_by_name=initiated_by_name,
    ):
        added += 1

    if _add_activity(
        db,
        slug=OFFICE_USER_TABLE_VIEWS_TAB_KEY_FIX_CHANGELOG_SLUG,
        title="Журнал изменений: Office default view refresh fix",
        description=_OFFICE_USER_TABLE_VIEWS_TAB_KEY_FIX_CHANGELOG_DESCRIPTION,
        result=_OFFICE_USER_TABLE_VIEWS_TAB_KEY_FIX_CHANGELOG_DESCRIPTION,
        activity_type=PlatformActivityType.MILESTONE.value,
        related_stage_id=related_stage_id,
        initiated_by_user_id=initiated_by_user_id,
        initiated_by_name=initiated_by_name,
    ):
        added += 1
        journal_lines.append(_OFFICE_USER_TABLE_VIEWS_TAB_KEY_FIX_CHANGELOG_DESCRIPTION)

    return added, journal_lines


def _ensure_office_user_table_views_column_visibility_dashboard_notes(
    db: Session,
    *,
    initiated_by_user_id: int | None,
    initiated_by_name: str | None,
) -> tuple[int, list[str]]:
    stage = (
        db.query(PlatformImplementationStage)
        .filter(PlatformImplementationStage.slug == "views-engine")
        .one_or_none()
    )
    related_stage_id = stage.id if stage is not None else None
    added = 0
    journal_lines: list[str] = []

    if _add_activity(
        db,
        slug=OFFICE_USER_TABLE_VIEWS_COLUMN_VISIBILITY_HISTORY_SLUG,
        title="Office: скрытие колонок пользовательских представлений",
        description=_OFFICE_USER_TABLE_VIEWS_COLUMN_VISIBILITY_HISTORY_DESCRIPTION,
        result=_OFFICE_USER_TABLE_VIEWS_COLUMN_VISIBILITY_CHANGELOG_DESCRIPTION,
        activity_type=PlatformActivityType.MILESTONE.value,
        related_stage_id=related_stage_id,
        initiated_by_user_id=initiated_by_user_id,
        initiated_by_name=initiated_by_name,
    ):
        added += 1

    if _add_activity(
        db,
        slug=OFFICE_USER_TABLE_VIEWS_COLUMN_VISIBILITY_CHANGELOG_SLUG,
        title="Журнал изменений: скрытие колонок Office User Views",
        description=_OFFICE_USER_TABLE_VIEWS_COLUMN_VISIBILITY_CHANGELOG_DESCRIPTION,
        result=_OFFICE_USER_TABLE_VIEWS_COLUMN_VISIBILITY_CHANGELOG_DESCRIPTION,
        activity_type=PlatformActivityType.MILESTONE.value,
        related_stage_id=related_stage_id,
        initiated_by_user_id=initiated_by_user_id,
        initiated_by_name=initiated_by_name,
    ):
        added += 1
        journal_lines.append(_OFFICE_USER_TABLE_VIEWS_COLUMN_VISIBILITY_CHANGELOG_DESCRIPTION)

    return added, journal_lines


def _ensure_office_user_view_unsaved_guard_modal_dashboard_notes(
    db: Session,
    *,
    initiated_by_user_id: int | None,
    initiated_by_name: str | None,
) -> tuple[int, list[str]]:
    stage = (
        db.query(PlatformImplementationStage)
        .filter(PlatformImplementationStage.slug == "views-engine")
        .one_or_none()
    )
    related_stage_id = stage.id if stage is not None else None
    added = 0
    journal_lines: list[str] = []

    if _add_activity(
        db,
        slug=OFFICE_USER_VIEW_UNSAVED_GUARD_MODAL_HISTORY_SLUG,
        title="Office: модалка несохранённых изменений представления",
        description=_OFFICE_USER_VIEW_UNSAVED_GUARD_MODAL_HISTORY_DESCRIPTION,
        result=_OFFICE_USER_VIEW_UNSAVED_GUARD_MODAL_CHANGELOG_DESCRIPTION,
        activity_type=PlatformActivityType.MILESTONE.value,
        related_stage_id=related_stage_id,
        initiated_by_user_id=initiated_by_user_id,
        initiated_by_name=initiated_by_name,
    ):
        added += 1

    if _add_activity(
        db,
        slug=OFFICE_USER_VIEW_UNSAVED_GUARD_MODAL_CHANGELOG_SLUG,
        title="Журнал изменений: PlatformModal guard Office User Views",
        description=_OFFICE_USER_VIEW_UNSAVED_GUARD_MODAL_CHANGELOG_DESCRIPTION,
        result=_OFFICE_USER_VIEW_UNSAVED_GUARD_MODAL_CHANGELOG_DESCRIPTION,
        activity_type=PlatformActivityType.MILESTONE.value,
        related_stage_id=related_stage_id,
        initiated_by_user_id=initiated_by_user_id,
        initiated_by_name=initiated_by_name,
    ):
        added += 1
        journal_lines.append(_OFFICE_USER_VIEW_UNSAVED_GUARD_MODAL_CHANGELOG_DESCRIPTION)

    return added, journal_lines


def _ensure_object_engine_record_number_dashboard_notes(
    db: Session,
    *,
    initiated_by_user_id: int | None,
    initiated_by_name: str | None,
) -> tuple[int, list[str]]:
    stage = (
        db.query(PlatformImplementationStage)
        .filter(PlatformImplementationStage.slug == "runtime-foundation")
        .one_or_none()
    )
    related_stage_id = stage.id if stage is not None else None
    added = 0
    journal_lines: list[str] = []

    if _add_activity(
        db,
        slug=OBJECT_ENGINE_RECORD_NUMBER_HISTORY_SLUG,
        title="Object Engine: record_number и динамическая позиция",
        description=_OBJECT_ENGINE_RECORD_NUMBER_HISTORY_DESCRIPTION,
        result=_OBJECT_ENGINE_RECORD_NUMBER_CHANGELOG_DESCRIPTION,
        activity_type=PlatformActivityType.MILESTONE.value,
        related_stage_id=related_stage_id,
        initiated_by_user_id=initiated_by_user_id,
        initiated_by_name=initiated_by_name,
    ):
        added += 1

    if _add_activity(
        db,
        slug=OBJECT_ENGINE_RECORD_NUMBER_CHANGELOG_SLUG,
        title="Журнал изменений: Object Engine record_number",
        description=_OBJECT_ENGINE_RECORD_NUMBER_CHANGELOG_DESCRIPTION,
        result=_OBJECT_ENGINE_RECORD_NUMBER_CHANGELOG_DESCRIPTION,
        activity_type=PlatformActivityType.MILESTONE.value,
        related_stage_id=related_stage_id,
        initiated_by_user_id=initiated_by_user_id,
        initiated_by_name=initiated_by_name,
    ):
        added += 1
        journal_lines.append(_OBJECT_ENGINE_RECORD_NUMBER_CHANGELOG_DESCRIPTION)

    return added, journal_lines


def _ensure_object_engine_row_menu_dashboard_notes(
    db: Session,
    *,
    initiated_by_user_id: int | None,
    initiated_by_name: str | None,
) -> tuple[int, list[str]]:
    stage = (
        db.query(PlatformImplementationStage)
        .filter(PlatformImplementationStage.slug == "relation-field-type")
        .one_or_none()
    )
    related_stage_id = stage.id if stage is not None else None
    added = 0
    journal_lines: list[str] = []

    if _add_activity(
        db,
        slug=OBJECT_ENGINE_ROW_MENU_HISTORY_SLUG,
        title="ViewEngineRowMenu: строковое меню Object Table",
        description=_OBJECT_ENGINE_ROW_MENU_HISTORY_DESCRIPTION,
        result=_OBJECT_ENGINE_ROW_MENU_CHANGELOG_DESCRIPTION,
        activity_type=PlatformActivityType.MILESTONE.value,
        related_stage_id=related_stage_id,
        initiated_by_user_id=initiated_by_user_id,
        initiated_by_name=initiated_by_name,
    ):
        added += 1

    if _add_activity(
        db,
        slug=OBJECT_ENGINE_ROW_MENU_CHANGELOG_SLUG,
        title="Журнал изменений: ViewEngineRowMenu",
        description=_OBJECT_ENGINE_ROW_MENU_CHANGELOG_DESCRIPTION,
        result=_OBJECT_ENGINE_ROW_MENU_CHANGELOG_DESCRIPTION,
        activity_type=PlatformActivityType.MILESTONE.value,
        related_stage_id=related_stage_id,
        initiated_by_user_id=initiated_by_user_id,
        initiated_by_name=initiated_by_name,
    ):
        added += 1
        journal_lines.append(_OBJECT_ENGINE_ROW_MENU_CHANGELOG_DESCRIPTION)

    return added, journal_lines


def _ensure_object_engine_hierarchy_labels_dashboard_notes(
    db: Session,
    *,
    initiated_by_user_id: int | None,
    initiated_by_name: str | None,
) -> tuple[int, list[str]]:
    stage = (
        db.query(PlatformImplementationStage)
        .filter(PlatformImplementationStage.slug == "relation-field-type")
        .one_or_none()
    )
    related_stage_id = stage.id if stage is not None else None
    added = 0
    journal_lines: list[str] = []

    if _add_activity(
        db,
        slug=OBJECT_ENGINE_HIERARCHY_LABELS_HISTORY_SLUG,
        title="Терминология иерархической связи (Studio + Object Table)",
        description=_OBJECT_ENGINE_HIERARCHY_LABELS_HISTORY_DESCRIPTION,
        result=_OBJECT_ENGINE_HIERARCHY_LABELS_CHANGELOG_DESCRIPTION,
        activity_type=PlatformActivityType.MILESTONE.value,
        related_stage_id=related_stage_id,
        initiated_by_user_id=initiated_by_user_id,
        initiated_by_name=initiated_by_name,
    ):
        added += 1

    if _add_activity(
        db,
        slug=OBJECT_ENGINE_HIERARCHY_LABELS_CHANGELOG_SLUG,
        title="Журнал изменений: терминология иерархической связи",
        description=_OBJECT_ENGINE_HIERARCHY_LABELS_CHANGELOG_DESCRIPTION,
        result=_OBJECT_ENGINE_HIERARCHY_LABELS_CHANGELOG_DESCRIPTION,
        activity_type=PlatformActivityType.MILESTONE.value,
        related_stage_id=related_stage_id,
        initiated_by_user_id=initiated_by_user_id,
        initiated_by_name=initiated_by_name,
    ):
        added += 1
        journal_lines.append(_OBJECT_ENGINE_HIERARCHY_LABELS_CHANGELOG_DESCRIPTION)

    return added, journal_lines


def _ensure_object_engine_table_bulk_selection_dashboard_notes(
    db: Session,
    *,
    initiated_by_user_id: int | None,
    initiated_by_name: str | None,
) -> tuple[int, list[str]]:
    stage = (
        db.query(PlatformImplementationStage)
        .filter(PlatformImplementationStage.slug == "relation-field-type")
        .one_or_none()
    )
    related_stage_id = stage.id if stage is not None else None
    added = 0
    journal_lines: list[str] = []

    if _add_activity(
        db,
        slug=OBJECT_ENGINE_TABLE_BULK_SELECTION_HISTORY_SLUG,
        title="Object Table: массовое выделение строк",
        description=_OBJECT_ENGINE_TABLE_BULK_SELECTION_HISTORY_DESCRIPTION,
        result=_OBJECT_ENGINE_TABLE_BULK_SELECTION_CHANGELOG_DESCRIPTION,
        activity_type=PlatformActivityType.MILESTONE.value,
        related_stage_id=related_stage_id,
        initiated_by_user_id=initiated_by_user_id,
        initiated_by_name=initiated_by_name,
    ):
        added += 1

    if _add_activity(
        db,
        slug=OBJECT_ENGINE_TABLE_BULK_SELECTION_CHANGELOG_SLUG,
        title="Журнал изменений: массовое выделение Object Table",
        description=_OBJECT_ENGINE_TABLE_BULK_SELECTION_CHANGELOG_DESCRIPTION,
        result=_OBJECT_ENGINE_TABLE_BULK_SELECTION_CHANGELOG_DESCRIPTION,
        activity_type=PlatformActivityType.MILESTONE.value,
        related_stage_id=related_stage_id,
        initiated_by_user_id=initiated_by_user_id,
        initiated_by_name=initiated_by_name,
    ):
        added += 1
        journal_lines.append(_OBJECT_ENGINE_TABLE_BULK_SELECTION_CHANGELOG_DESCRIPTION)

    return added, journal_lines


def _ensure_object_engine_table_bulk_delete_dashboard_notes(
    db: Session,
    *,
    initiated_by_user_id: int | None,
    initiated_by_name: str | None,
) -> tuple[int, list[str]]:
    stage = (
        db.query(PlatformImplementationStage)
        .filter(PlatformImplementationStage.slug == "relation-field-type")
        .one_or_none()
    )
    related_stage_id = stage.id if stage is not None else None
    added = 0
    journal_lines: list[str] = []

    if _add_activity(
        db,
        slug=OBJECT_ENGINE_TABLE_BULK_DELETE_HISTORY_SLUG,
        title="Object Table: массовое удаление записей",
        description=_OBJECT_ENGINE_TABLE_BULK_DELETE_HISTORY_DESCRIPTION,
        result=_OBJECT_ENGINE_TABLE_BULK_DELETE_CHANGELOG_DESCRIPTION,
        activity_type=PlatformActivityType.MILESTONE.value,
        related_stage_id=related_stage_id,
        initiated_by_user_id=initiated_by_user_id,
        initiated_by_name=initiated_by_name,
    ):
        added += 1

    if _add_activity(
        db,
        slug=OBJECT_ENGINE_TABLE_BULK_DELETE_CHANGELOG_SLUG,
        title="Журнал изменений: массовое удаление Object Table",
        description=_OBJECT_ENGINE_TABLE_BULK_DELETE_CHANGELOG_DESCRIPTION,
        result=_OBJECT_ENGINE_TABLE_BULK_DELETE_CHANGELOG_DESCRIPTION,
        activity_type=PlatformActivityType.MILESTONE.value,
        related_stage_id=related_stage_id,
        initiated_by_user_id=initiated_by_user_id,
        initiated_by_name=initiated_by_name,
    ):
        added += 1
        journal_lines.append(_OBJECT_ENGINE_TABLE_BULK_DELETE_CHANGELOG_DESCRIPTION)

    return added, journal_lines


def _ensure_object_engine_table_bulk_delete_labels_dashboard_note(
    db: Session,
    *,
    initiated_by_user_id: int | None,
    initiated_by_name: str | None,
) -> tuple[int, list[str]]:
    stage = (
        db.query(PlatformImplementationStage)
        .filter(PlatformImplementationStage.slug == "relation-field-type")
        .one_or_none()
    )
    related_stage_id = stage.id if stage is not None else None
    added = 0
    journal_lines: list[str] = []

    if _add_activity(
        db,
        slug=OBJECT_ENGINE_TABLE_BULK_DELETE_LABELS_SLUG,
        title="Object Table: терминология bulk delete",
        description=_OBJECT_ENGINE_TABLE_BULK_DELETE_LABELS_DESCRIPTION,
        result=_OBJECT_ENGINE_TABLE_BULK_DELETE_LABELS_DESCRIPTION,
        activity_type=PlatformActivityType.MILESTONE.value,
        related_stage_id=related_stage_id,
        initiated_by_user_id=initiated_by_user_id,
        initiated_by_name=initiated_by_name,
    ):
        added += 1
        journal_lines.append(_OBJECT_ENGINE_TABLE_BULK_DELETE_LABELS_DESCRIPTION)

    return added, journal_lines


def _ensure_object_engine_table_representation_chip_style_dashboard_note(
    db: Session,
    *,
    initiated_by_user_id: int | None,
    initiated_by_name: str | None,
) -> tuple[int, list[str]]:
    stage = (
        db.query(PlatformImplementationStage)
        .filter(PlatformImplementationStage.slug == "relation-field-type")
        .one_or_none()
    )
    related_stage_id = stage.id if stage is not None else None
    added = 0
    journal_lines: list[str] = []

    if _add_activity(
        db,
        slug=OBJECT_ENGINE_TABLE_REPRESENTATION_CHIP_STYLE_SLUG,
        title="Object Table: chip-стиль представлений",
        description=_OBJECT_ENGINE_TABLE_REPRESENTATION_CHIP_STYLE_DESCRIPTION,
        result=_OBJECT_ENGINE_TABLE_REPRESENTATION_CHIP_STYLE_DESCRIPTION,
        activity_type=PlatformActivityType.MILESTONE.value,
        related_stage_id=related_stage_id,
        initiated_by_user_id=initiated_by_user_id,
        initiated_by_name=initiated_by_name,
    ):
        added += 1
        journal_lines.append(_OBJECT_ENGINE_TABLE_REPRESENTATION_CHIP_STYLE_DESCRIPTION)

    return added, journal_lines


def _ensure_object_engine_table_representation_layout_fix_dashboard_note(
    db: Session,
    *,
    initiated_by_user_id: int | None,
    initiated_by_name: str | None,
) -> tuple[int, list[str]]:
    stage = (
        db.query(PlatformImplementationStage)
        .filter(PlatformImplementationStage.slug == "relation-field-type")
        .one_or_none()
    )
    related_stage_id = stage.id if stage is not None else None
    added = 0
    journal_lines: list[str] = []

    if _add_activity(
        db,
        slug=OBJECT_ENGINE_TABLE_REPRESENTATION_LAYOUT_FIX_SLUG,
        title="Object Table: layout пользовательских представлений",
        description=_OBJECT_ENGINE_TABLE_REPRESENTATION_LAYOUT_FIX_DESCRIPTION,
        result=_OBJECT_ENGINE_TABLE_REPRESENTATION_LAYOUT_FIX_DESCRIPTION,
        activity_type=PlatformActivityType.MILESTONE.value,
        related_stage_id=related_stage_id,
        initiated_by_user_id=initiated_by_user_id,
        initiated_by_name=initiated_by_name,
    ):
        added += 1
        journal_lines.append(_OBJECT_ENGINE_TABLE_REPRESENTATION_LAYOUT_FIX_DESCRIPTION)

    return added, journal_lines


def _ensure_object_engine_table_toolbar_height_dashboard_note(
    db: Session,
    *,
    initiated_by_user_id: int | None,
    initiated_by_name: str | None,
) -> tuple[int, list[str]]:
    stage = (
        db.query(PlatformImplementationStage)
        .filter(PlatformImplementationStage.slug == "relation-field-type")
        .one_or_none()
    )
    related_stage_id = stage.id if stage is not None else None
    added = 0
    journal_lines: list[str] = []

    if _add_activity(
        db,
        slug=OBJECT_ENGINE_TABLE_TOOLBAR_HEIGHT_SLUG,
        title="Object Table: единая высота toolbar",
        description=_OBJECT_ENGINE_TABLE_TOOLBAR_HEIGHT_DESCRIPTION,
        result=_OBJECT_ENGINE_TABLE_TOOLBAR_HEIGHT_DESCRIPTION,
        activity_type=PlatformActivityType.MILESTONE.value,
        related_stage_id=related_stage_id,
        initiated_by_user_id=initiated_by_user_id,
        initiated_by_name=initiated_by_name,
    ):
        added += 1
        journal_lines.append(_OBJECT_ENGINE_TABLE_TOOLBAR_HEIGHT_DESCRIPTION)

    return added, journal_lines


def _ensure_object_engine_table_filters_modal_dashboard_note(
    db: Session,
    *,
    initiated_by_user_id: int | None,
    initiated_by_name: str | None,
) -> tuple[int, list[str]]:
    stage = (
        db.query(PlatformImplementationStage)
        .filter(PlatformImplementationStage.slug == "relation-field-type")
        .one_or_none()
    )
    related_stage_id = stage.id if stage is not None else None
    added = 0
    journal_lines: list[str] = []

    if _add_activity(
        db,
        slug=OBJECT_ENGINE_TABLE_FILTERS_MODAL_SLUG,
        title="Object Table: модалка фильтров",
        description=_OBJECT_ENGINE_TABLE_FILTERS_MODAL_DESCRIPTION,
        result=_OBJECT_ENGINE_TABLE_FILTERS_MODAL_DESCRIPTION,
        activity_type=PlatformActivityType.MILESTONE.value,
        related_stage_id=related_stage_id,
        initiated_by_user_id=initiated_by_user_id,
        initiated_by_name=initiated_by_name,
    ):
        added += 1
        journal_lines.append(_OBJECT_ENGINE_TABLE_FILTERS_MODAL_DESCRIPTION)

    return added, journal_lines


def _ensure_object_engine_table_filters_typed_editors_dashboard_note(
    db: Session,
    *,
    initiated_by_user_id: int | None,
    initiated_by_name: str | None,
) -> tuple[int, list[str]]:
    stage = (
        db.query(PlatformImplementationStage)
        .filter(PlatformImplementationStage.slug == "relation-field-type")
        .one_or_none()
    )
    related_stage_id = stage.id if stage is not None else None
    added = 0
    journal_lines: list[str] = []

    if _add_activity(
        db,
        slug=OBJECT_ENGINE_TABLE_FILTERS_TYPED_EDITORS_SLUG,
        title="Object Table Filters: типизированные редакторы (Phase 1)",
        description=_OBJECT_ENGINE_TABLE_FILTERS_TYPED_EDITORS_DESCRIPTION,
        result=_OBJECT_ENGINE_TABLE_FILTERS_TYPED_EDITORS_DESCRIPTION,
        activity_type=PlatformActivityType.MILESTONE.value,
        related_stage_id=related_stage_id,
        initiated_by_user_id=initiated_by_user_id,
        initiated_by_name=initiated_by_name,
    ):
        added += 1
        journal_lines.append(_OBJECT_ENGINE_TABLE_FILTERS_TYPED_EDITORS_DESCRIPTION)

    return added, journal_lines


def _ensure_object_engine_table_filters_operators_dashboard_note(
    db: Session,
    *,
    initiated_by_user_id: int | None,
    initiated_by_name: str | None,
) -> tuple[int, list[str]]:
    stage = (
        db.query(PlatformImplementationStage)
        .filter(PlatformImplementationStage.slug == "relation-field-type")
        .one_or_none()
    )
    related_stage_id = stage.id if stage is not None else None
    added = 0
    journal_lines: list[str] = []

    if _add_activity(
        db,
        slug=OBJECT_ENGINE_TABLE_FILTERS_OPERATORS_SLUG,
        title="Object Table Filters — Phase 2 (Operators)",
        description=_OBJECT_ENGINE_TABLE_FILTERS_OPERATORS_DESCRIPTION,
        result=_OBJECT_ENGINE_TABLE_FILTERS_OPERATORS_DESCRIPTION,
        activity_type=PlatformActivityType.MILESTONE.value,
        related_stage_id=related_stage_id,
        initiated_by_user_id=initiated_by_user_id,
        initiated_by_name=initiated_by_name,
    ):
        added += 1
        journal_lines.append(_OBJECT_ENGINE_TABLE_FILTERS_OPERATORS_DESCRIPTION)

    return added, journal_lines


def _ensure_object_engine_table_filters_operators_stabilization_dashboard_notes(
    db: Session,
    *,
    initiated_by_user_id: int | None,
    initiated_by_name: str | None,
) -> tuple[int, list[str]]:
    stage = (
        db.query(PlatformImplementationStage)
        .filter(PlatformImplementationStage.slug == "relation-field-type")
        .one_or_none()
    )
    related_stage_id = stage.id if stage is not None else None
    added = 0
    journal_lines: list[str] = []

    if _add_activity(
        db,
        slug=OBJECT_ENGINE_TABLE_FILTERS_OPERATORS_STABILIZATION_HISTORY_SLUG,
        title="Object Table Filters — Backend Operators Stabilization",
        description=_OBJECT_ENGINE_TABLE_FILTERS_OPERATORS_STABILIZATION_DESCRIPTION,
        result=_OBJECT_ENGINE_TABLE_FILTERS_OPERATORS_STABILIZATION_DESCRIPTION,
        activity_type=PlatformActivityType.MILESTONE.value,
        related_stage_id=related_stage_id,
        initiated_by_user_id=initiated_by_user_id,
        initiated_by_name=initiated_by_name,
    ):
        added += 1

    if _add_activity(
        db,
        slug=OBJECT_ENGINE_TABLE_FILTERS_OPERATORS_STABILIZATION_CHANGELOG_SLUG,
        title="Журнал изменений: стабилизация операторов фильтров Object Table",
        description=_OBJECT_ENGINE_TABLE_FILTERS_OPERATORS_STABILIZATION_DESCRIPTION,
        result=_OBJECT_ENGINE_TABLE_FILTERS_OPERATORS_STABILIZATION_DESCRIPTION,
        activity_type=PlatformActivityType.MILESTONE.value,
        related_stage_id=related_stage_id,
        initiated_by_user_id=initiated_by_user_id,
        initiated_by_name=initiated_by_name,
    ):
        added += 1
        journal_lines.append(_OBJECT_ENGINE_TABLE_FILTERS_OPERATORS_STABILIZATION_DESCRIPTION)

    return added, journal_lines


def _ensure_object_engine_table_filters_phase3_dashboard_notes(
    db: Session,
    *,
    initiated_by_user_id: int | None,
    initiated_by_name: str | None,
) -> tuple[int, list[str]]:
    stage = (
        db.query(PlatformImplementationStage)
        .filter(PlatformImplementationStage.slug == "relation-field-type")
        .one_or_none()
    )
    related_stage_id = stage.id if stage is not None else None
    added = 0
    journal_lines: list[str] = []

    if _add_activity(
        db,
        slug=OBJECT_ENGINE_TABLE_FILTERS_PHASE3_HISTORY_SLUG,
        title="Object Table Filters — Phase 3",
        description=_OBJECT_ENGINE_TABLE_FILTERS_PHASE3_DESCRIPTION,
        result=_OBJECT_ENGINE_TABLE_FILTERS_PHASE3_DESCRIPTION,
        activity_type=PlatformActivityType.MILESTONE.value,
        related_stage_id=related_stage_id,
        initiated_by_user_id=initiated_by_user_id,
        initiated_by_name=initiated_by_name,
    ):
        added += 1

    if _add_activity(
        db,
        slug=OBJECT_ENGINE_TABLE_FILTERS_PHASE3_CHANGELOG_SLUG,
        title="Журнал изменений: Object Table Filters Phase 3",
        description=_OBJECT_ENGINE_TABLE_FILTERS_PHASE3_DESCRIPTION,
        result=_OBJECT_ENGINE_TABLE_FILTERS_PHASE3_DESCRIPTION,
        activity_type=PlatformActivityType.MILESTONE.value,
        related_stage_id=related_stage_id,
        initiated_by_user_id=initiated_by_user_id,
        initiated_by_name=initiated_by_name,
    ):
        added += 1
        journal_lines.append(_OBJECT_ENGINE_TABLE_FILTERS_PHASE3_DESCRIPTION)

    return added, journal_lines


def _ensure_object_engine_table_quick_filters_overflow_dashboard_notes(
    db: Session,
    *,
    initiated_by_user_id: int | None,
    initiated_by_name: str | None,
) -> tuple[int, list[str]]:
    stage = (
        db.query(PlatformImplementationStage)
        .filter(PlatformImplementationStage.slug == "relation-field-type")
        .one_or_none()
    )
    related_stage_id = stage.id if stage is not None else None
    added = 0
    journal_lines: list[str] = []

    if _add_activity(
        db,
        slug=OBJECT_ENGINE_TABLE_QUICK_FILTERS_OVERFLOW_HISTORY_SLUG,
        title="Перенос быстрых фильтров в overflow панели фильтрации",
        description=_OBJECT_ENGINE_TABLE_QUICK_FILTERS_OVERFLOW_DESCRIPTION,
        result=_OBJECT_ENGINE_TABLE_QUICK_FILTERS_OVERFLOW_DESCRIPTION,
        activity_type=PlatformActivityType.MILESTONE.value,
        related_stage_id=related_stage_id,
        initiated_by_user_id=initiated_by_user_id,
        initiated_by_name=initiated_by_name,
    ):
        added += 1

    if _add_activity(
        db,
        slug=OBJECT_ENGINE_TABLE_QUICK_FILTERS_OVERFLOW_CHANGELOG_SLUG,
        title="Журнал изменений: overflow быстрых фильтров Object Table",
        description=_OBJECT_ENGINE_TABLE_QUICK_FILTERS_OVERFLOW_DESCRIPTION,
        result=_OBJECT_ENGINE_TABLE_QUICK_FILTERS_OVERFLOW_DESCRIPTION,
        activity_type=PlatformActivityType.MILESTONE.value,
        related_stage_id=related_stage_id,
        initiated_by_user_id=initiated_by_user_id,
        initiated_by_name=initiated_by_name,
    ):
        added += 1
        journal_lines.append(_OBJECT_ENGINE_TABLE_QUICK_FILTERS_OVERFLOW_DESCRIPTION)

    return added, journal_lines


def _ensure_object_engine_table_quick_filters_layering_dashboard_notes(
    db: Session,
    *,
    initiated_by_user_id: int | None,
    initiated_by_name: str | None,
) -> tuple[int, list[str]]:
    stage = (
        db.query(PlatformImplementationStage)
        .filter(PlatformImplementationStage.slug == "relation-field-type")
        .one_or_none()
    )
    related_stage_id = stage.id if stage is not None else None
    added = 0
    journal_lines: list[str] = []

    if _add_activity(
        db,
        slug=OBJECT_ENGINE_TABLE_QUICK_FILTERS_LAYERING_HISTORY_SLUG,
        title="Object Table — слои фильтрации view + quick filter",
        description=_OBJECT_ENGINE_TABLE_QUICK_FILTERS_LAYERING_DESCRIPTION,
        result=_OBJECT_ENGINE_TABLE_QUICK_FILTERS_LAYERING_DESCRIPTION,
        activity_type=PlatformActivityType.MILESTONE.value,
        related_stage_id=related_stage_id,
        initiated_by_user_id=initiated_by_user_id,
        initiated_by_name=initiated_by_name,
    ):
        added += 1

    if _add_activity(
        db,
        slug=OBJECT_ENGINE_TABLE_QUICK_FILTERS_LAYERING_CHANGELOG_SLUG,
        title="Журнал изменений: слои быстрых фильтров Object Table",
        description=_OBJECT_ENGINE_TABLE_QUICK_FILTERS_LAYERING_DESCRIPTION,
        result=_OBJECT_ENGINE_TABLE_QUICK_FILTERS_LAYERING_DESCRIPTION,
        activity_type=PlatformActivityType.MILESTONE.value,
        related_stage_id=related_stage_id,
        initiated_by_user_id=initiated_by_user_id,
        initiated_by_name=initiated_by_name,
    ):
        added += 1
        journal_lines.append(_OBJECT_ENGINE_TABLE_QUICK_FILTERS_LAYERING_DESCRIPTION)

    return added, journal_lines


def _ensure_object_engine_table_saved_filters_unification_dashboard_notes(
    db: Session,
    *,
    initiated_by_user_id: int | None,
    initiated_by_name: str | None,
) -> tuple[int, list[str]]:
    stage = (
        db.query(PlatformImplementationStage)
        .filter(PlatformImplementationStage.slug == "relation-field-type")
        .one_or_none()
    )
    related_stage_id = stage.id if stage is not None else None
    added = 0
    journal_lines: list[str] = []

    if _add_activity(
        db,
        slug=OBJECT_ENGINE_TABLE_SAVED_FILTERS_UNIFICATION_HISTORY_SLUG,
        title="Унификация быстрых и сохранённых фильтров",
        description=_OBJECT_ENGINE_TABLE_SAVED_FILTERS_UNIFICATION_DESCRIPTION,
        result=_OBJECT_ENGINE_TABLE_SAVED_FILTERS_UNIFICATION_DESCRIPTION,
        activity_type=PlatformActivityType.MILESTONE.value,
        related_stage_id=related_stage_id,
        initiated_by_user_id=initiated_by_user_id,
        initiated_by_name=initiated_by_name,
    ):
        added += 1

    if _add_activity(
        db,
        slug=OBJECT_ENGINE_TABLE_SAVED_FILTERS_UNIFICATION_CHANGELOG_SLUG,
        title="Журнал изменений: унификация saved/quick filters",
        description=_OBJECT_ENGINE_TABLE_SAVED_FILTERS_UNIFICATION_DESCRIPTION,
        result=_OBJECT_ENGINE_TABLE_SAVED_FILTERS_UNIFICATION_DESCRIPTION,
        activity_type=PlatformActivityType.MILESTONE.value,
        related_stage_id=related_stage_id,
        initiated_by_user_id=initiated_by_user_id,
        initiated_by_name=initiated_by_name,
    ):
        added += 1
        journal_lines.append(_OBJECT_ENGINE_TABLE_SAVED_FILTERS_UNIFICATION_DESCRIPTION)

    return added, journal_lines


def _ensure_object_engine_table_title_field_visibility_dashboard_notes(
    db: Session,
    *,
    initiated_by_user_id: int | None,
    initiated_by_name: str | None,
) -> tuple[int, list[str]]:
    stage = (
        db.query(PlatformImplementationStage)
        .filter(PlatformImplementationStage.slug == "relation-field-type")
        .one_or_none()
    )
    related_stage_id = stage.id if stage is not None else None
    added = 0
    journal_lines: list[str] = []

    if _add_activity(
        db,
        slug=OBJECT_ENGINE_TABLE_TITLE_FIELD_VISIBILITY_HISTORY_SLUG,
        title="Object Table — глаз у Title Field (видимость колонок)",
        description=_OBJECT_ENGINE_TABLE_TITLE_FIELD_VISIBILITY_DESCRIPTION,
        result=_OBJECT_ENGINE_TABLE_TITLE_FIELD_VISIBILITY_DESCRIPTION,
        activity_type=PlatformActivityType.MILESTONE.value,
        related_stage_id=related_stage_id,
        initiated_by_user_id=initiated_by_user_id,
        initiated_by_name=initiated_by_name,
    ):
        added += 1

    if _add_activity(
        db,
        slug=OBJECT_ENGINE_TABLE_TITLE_FIELD_VISIBILITY_CHANGELOG_SLUG,
        title="Журнал изменений: глаз у Title Field (Object Table)",
        description=_OBJECT_ENGINE_TABLE_TITLE_FIELD_VISIBILITY_DESCRIPTION,
        result=_OBJECT_ENGINE_TABLE_TITLE_FIELD_VISIBILITY_DESCRIPTION,
        activity_type=PlatformActivityType.MILESTONE.value,
        related_stage_id=related_stage_id,
        initiated_by_user_id=initiated_by_user_id,
        initiated_by_name=initiated_by_name,
    ):
        added += 1
        journal_lines.append(_OBJECT_ENGINE_TABLE_TITLE_FIELD_VISIBILITY_DESCRIPTION)

    return added, journal_lines


def _ensure_object_engine_hierarchy_labels_publish_state_fix_note(
    db: Session,
    *,
    initiated_by_user_id: int | None,
    initiated_by_name: str | None,
) -> tuple[int, list[str]]:
    stage = (
        db.query(PlatformImplementationStage)
        .filter(PlatformImplementationStage.slug == "relation-field-type")
        .one_or_none()
    )
    related_stage_id = stage.id if stage is not None else None
    added = 0
    journal_lines: list[str] = []

    if _add_activity(
        db,
        slug=OBJECT_ENGINE_HIERARCHY_LABELS_PUBLISH_STATE_FIX_SLUG,
        title="Исправление: unpublished state для hierarchy_labels",
        description=_OBJECT_ENGINE_HIERARCHY_LABELS_PUBLISH_STATE_FIX_DESCRIPTION,
        result=_OBJECT_ENGINE_HIERARCHY_LABELS_PUBLISH_STATE_FIX_DESCRIPTION,
        activity_type=PlatformActivityType.MILESTONE.value,
        related_stage_id=related_stage_id,
        initiated_by_user_id=initiated_by_user_id,
        initiated_by_name=initiated_by_name,
    ):
        added += 1
        journal_lines.append(_OBJECT_ENGINE_HIERARCHY_LABELS_PUBLISH_STATE_FIX_DESCRIPTION)

    return added, journal_lines


def _ensure_object_engine_hierarchy_delete_dashboard_notes(
    db: Session,
    *,
    initiated_by_user_id: int | None,
    initiated_by_name: str | None,
) -> tuple[int, list[str]]:
    stage = (
        db.query(PlatformImplementationStage)
        .filter(PlatformImplementationStage.slug == "relation-field-type")
        .one_or_none()
    )
    related_stage_id = stage.id if stage is not None else None
    added = 0
    journal_lines: list[str] = []

    if _add_activity(
        db,
        slug=OBJECT_ENGINE_HIERARCHY_DELETE_HISTORY_SLUG,
        title="Object Engine: безопасное удаление с подзадачами",
        description=_OBJECT_ENGINE_HIERARCHY_DELETE_HISTORY_DESCRIPTION,
        result=_OBJECT_ENGINE_HIERARCHY_DELETE_CHANGELOG_DESCRIPTION,
        activity_type=PlatformActivityType.MILESTONE.value,
        related_stage_id=related_stage_id,
        initiated_by_user_id=initiated_by_user_id,
        initiated_by_name=initiated_by_name,
    ):
        added += 1

    if _add_activity(
        db,
        slug=OBJECT_ENGINE_HIERARCHY_DELETE_CHANGELOG_SLUG,
        title="Журнал изменений: безопасное удаление Object Table",
        description=_OBJECT_ENGINE_HIERARCHY_DELETE_CHANGELOG_DESCRIPTION,
        result=_OBJECT_ENGINE_HIERARCHY_DELETE_CHANGELOG_DESCRIPTION,
        activity_type=PlatformActivityType.MILESTONE.value,
        related_stage_id=related_stage_id,
        initiated_by_user_id=initiated_by_user_id,
        initiated_by_name=initiated_by_name,
    ):
        added += 1
        journal_lines.append(_OBJECT_ENGINE_HIERARCHY_DELETE_CHANGELOG_DESCRIPTION)

    return added, journal_lines


def _ensure_object_engine_record_number_fix_dashboard_notes(
    db: Session,
    *,
    initiated_by_user_id: int | None,
    initiated_by_name: str | None,
) -> tuple[int, list[str]]:
    stage = (
        db.query(PlatformImplementationStage)
        .filter(PlatformImplementationStage.slug == "runtime-foundation")
        .one_or_none()
    )
    related_stage_id = stage.id if stage is not None else None
    added = 0
    journal_lines: list[str] = []

    if _add_activity(
        db,
        slug=OBJECT_ENGINE_RECORD_NUMBER_FIX_HISTORY_SLUG,
        title="Object Engine: миграция record_number (Network Error fix)",
        description=_OBJECT_ENGINE_RECORD_NUMBER_FIX_HISTORY_DESCRIPTION,
        result=_OBJECT_ENGINE_RECORD_NUMBER_FIX_CHANGELOG_DESCRIPTION,
        activity_type=PlatformActivityType.MILESTONE.value,
        related_stage_id=related_stage_id,
        initiated_by_user_id=initiated_by_user_id,
        initiated_by_name=initiated_by_name,
    ):
        added += 1

    if _add_activity(
        db,
        slug=OBJECT_ENGINE_RECORD_NUMBER_FIX_CHANGELOG_SLUG,
        title="Журнал изменений: record_number migration fix",
        description=_OBJECT_ENGINE_RECORD_NUMBER_FIX_CHANGELOG_DESCRIPTION,
        result=_OBJECT_ENGINE_RECORD_NUMBER_FIX_CHANGELOG_DESCRIPTION,
        activity_type=PlatformActivityType.MILESTONE.value,
        related_stage_id=related_stage_id,
        initiated_by_user_id=initiated_by_user_id,
        initiated_by_name=initiated_by_name,
    ):
        added += 1
        journal_lines.append(_OBJECT_ENGINE_RECORD_NUMBER_FIX_CHANGELOG_DESCRIPTION)

    return added, journal_lines


OBJECT_TABLE_UT_PARITY_DASHBOARD_HISTORY_SLUG = (
    "object-table-ut-parity-dashboard-works-20260605"
)
OBJECT_TABLE_UT_PARITY_DASHBOARD_CHANGELOG_SLUG = (
    "object-table-ut-parity-dashboard-changelog-20260605"
)

_OBJECT_TABLE_UT_PARITY_DASHBOARD_HISTORY_DESCRIPTION = (
    "Dashboard: в этап «Переход на объектную платформу» добавлены остаточные "
    "работы по аудиту Universal Tables vs Object Table (P0–P3, взвешенные шаги)."
)

_OBJECT_TABLE_UT_PARITY_DASHBOARD_CHANGELOG_DESCRIPTION = (
    "Добавлены 19 шагов закрытия пробелов Object Table: миграция legacy, "
    "чек-листы, multi-sort, фильтры по связям, drag строк, режим дерева, "
    "поиск, bulk edit, Excel и др."
)


def _ensure_object_table_ut_parity_dashboard_notes(
    db: Session,
    *,
    initiated_by_user_id: int | None,
    initiated_by_name: str | None,
) -> tuple[int, list[str]]:
    stage = (
        db.query(PlatformImplementationStage)
        .filter(PlatformImplementationStage.slug == "object-table-ut-parity")
        .one_or_none()
    )
    related_stage_id = stage.id if stage is not None else None
    added = 0
    journal_lines: list[str] = []

    if _add_activity(
        db,
        slug=OBJECT_TABLE_UT_PARITY_DASHBOARD_HISTORY_SLUG,
        title="Переход на объектную платформу: остаточные работы Object Table",
        description=_OBJECT_TABLE_UT_PARITY_DASHBOARD_HISTORY_DESCRIPTION,
        result=_OBJECT_TABLE_UT_PARITY_DASHBOARD_CHANGELOG_DESCRIPTION,
        activity_type=PlatformActivityType.MILESTONE.value,
        related_stage_id=related_stage_id,
        initiated_by_user_id=initiated_by_user_id,
        initiated_by_name=initiated_by_name,
    ):
        added += 1

    if _add_activity(
        db,
        slug=OBJECT_TABLE_UT_PARITY_DASHBOARD_CHANGELOG_SLUG,
        title="Журнал изменений: работы UT → Object Table на Dashboard",
        description=_OBJECT_TABLE_UT_PARITY_DASHBOARD_CHANGELOG_DESCRIPTION,
        result=_OBJECT_TABLE_UT_PARITY_DASHBOARD_CHANGELOG_DESCRIPTION,
        activity_type=PlatformActivityType.MILESTONE.value,
        related_stage_id=related_stage_id,
        initiated_by_user_id=initiated_by_user_id,
        initiated_by_name=initiated_by_name,
    ):
        added += 1
        journal_lines.append(_OBJECT_TABLE_UT_PARITY_DASHBOARD_CHANGELOG_DESCRIPTION)

    return added, journal_lines


OWNER_STAGE_DETAIL_PANEL_HISTORY_SLUG = (
    "owner-stage-detail-panel-ux-20260605"
)
OWNER_STAGE_DETAIL_PANEL_CHANGELOG_SLUG = (
    "owner-stage-detail-panel-ux-changelog-20260605"
)

_OWNER_STAGE_DETAIL_PANEL_HISTORY_DESCRIPTION = (
    "Dashboard: правая панель этапа показывает сводку задач (выполнено / в работе / "
    "не начато), следующие задачи, блок «В работе» и выполненные задачи с весами."
)

_OWNER_STAGE_DETAIL_PANEL_CHANGELOG_DESCRIPTION = (
    "Переработана правая панель выбранного этапа: вместо «Выполнено этапов / Всего "
    "этапов / Следующий этап» — списки задач по статусам, раскрываемые секции и "
    "отображение весов (без изменения расчёта готовности)."
)


def _ensure_owner_stage_detail_panel_dashboard_notes(
    db: Session,
    *,
    initiated_by_user_id: int | None,
    initiated_by_name: str | None,
) -> tuple[int, list[str]]:
    added = 0
    journal_lines: list[str] = []

    if _add_activity(
        db,
        slug=OWNER_STAGE_DETAIL_PANEL_HISTORY_SLUG,
        title="Dashboard: улучшение отображения этапов",
        description=_OWNER_STAGE_DETAIL_PANEL_HISTORY_DESCRIPTION,
        result=_OWNER_STAGE_DETAIL_PANEL_CHANGELOG_DESCRIPTION,
        activity_type=PlatformActivityType.MILESTONE.value,
        related_stage_id=None,
        initiated_by_user_id=initiated_by_user_id,
        initiated_by_name=initiated_by_name,
    ):
        added += 1

    if _add_activity(
        db,
        slug=OWNER_STAGE_DETAIL_PANEL_CHANGELOG_SLUG,
        title="Журнал изменений: панель деталей этапа Dashboard",
        description=_OWNER_STAGE_DETAIL_PANEL_CHANGELOG_DESCRIPTION,
        result=_OWNER_STAGE_DETAIL_PANEL_CHANGELOG_DESCRIPTION,
        activity_type=PlatformActivityType.MILESTONE.value,
        related_stage_id=None,
        initiated_by_user_id=initiated_by_user_id,
        initiated_by_name=initiated_by_name,
    ):
        added += 1
        journal_lines.append(_OWNER_STAGE_DETAIL_PANEL_CHANGELOG_DESCRIPTION)

    return added, journal_lines


OBJECT_TABLE_LINK_FIELD_TYPE_HISTORY_SLUG = "object-table-link-field-type-20260605"
OBJECT_TABLE_LINK_FIELD_TYPE_CHANGELOG_SLUG = (
    "object-table-link-field-type-changelog-20260605"
)

_OBJECT_TABLE_LINK_FIELD_TYPE_HISTORY_DESCRIPTION = (
    "Object Platform: тип поля «Ссылка» — создание в Studio, ввод URL в карточке, "
    "кликабельное отображение в таблице, фильтрация и сортировка как у текста."
)

_OBJECT_TABLE_LINK_FIELD_TYPE_CHANGELOG_DESCRIPTION = (
    "Добавлен field_type=link: backend validation, LinkFieldEditor, безопасное "
    "открытие http/https, хранение URL в runtime_entity_values.value_json."
)


def _ensure_object_table_link_field_type_dashboard_notes(
    db: Session,
    *,
    initiated_by_user_id: int | None,
    initiated_by_name: str | None,
) -> tuple[int, list[str]]:
    stage = (
        db.query(PlatformImplementationStage)
        .filter(PlatformImplementationStage.slug == "object-table-ut-parity")
        .one_or_none()
    )
    related_stage_id = stage.id if stage is not None else None
    added = 0
    journal_lines: list[str] = []

    if _add_activity(
        db,
        slug=OBJECT_TABLE_LINK_FIELD_TYPE_HISTORY_SLUG,
        title="Object Platform: тип поля «Ссылка»",
        description=_OBJECT_TABLE_LINK_FIELD_TYPE_HISTORY_DESCRIPTION,
        result=_OBJECT_TABLE_LINK_FIELD_TYPE_CHANGELOG_DESCRIPTION,
        activity_type=PlatformActivityType.MILESTONE.value,
        related_stage_id=related_stage_id,
        initiated_by_user_id=initiated_by_user_id,
        initiated_by_name=initiated_by_name,
    ):
        added += 1

    if _add_activity(
        db,
        slug=OBJECT_TABLE_LINK_FIELD_TYPE_CHANGELOG_SLUG,
        title="Журнал изменений: тип поля «Ссылка»",
        description=_OBJECT_TABLE_LINK_FIELD_TYPE_CHANGELOG_DESCRIPTION,
        result=_OBJECT_TABLE_LINK_FIELD_TYPE_CHANGELOG_DESCRIPTION,
        activity_type=PlatformActivityType.MILESTONE.value,
        related_stage_id=related_stage_id,
        initiated_by_user_id=initiated_by_user_id,
        initiated_by_name=initiated_by_name,
    ):
        added += 1
        journal_lines.append(_OBJECT_TABLE_LINK_FIELD_TYPE_CHANGELOG_DESCRIPTION)

    return added, journal_lines


OBJECT_TABLE_ENTITY_CARD_CHECKLIST_HISTORY_SLUG = (
    "object-table-entity-card-checklist-20260605"
)
OBJECT_TABLE_ENTITY_CARD_CHECKLIST_CHANGELOG_SLUG = (
    "object-table-entity-card-checklist-changelog-20260605"
)

_OBJECT_TABLE_ENTITY_CARD_CHECKLIST_HISTORY_DESCRIPTION = (
    "Object Platform: вкладка «Чек-лист» в карточке runtime-объекта — добавление пунктов, "
    "отметка выполнения, редактирование, удаление, прогресс и счётчик на вкладке."
)

_OBJECT_TABLE_ENTITY_CARD_CHECKLIST_CHANGELOG_DESCRIPTION = (
    "Чек-лист в карточке Object Platform привязан к runtime_entity (UUID записи); "
    "переиспользованы checklist API и UI-паттерн Universal Tables без legacy table_row."
)


def _ensure_object_table_entity_card_checklist_dashboard_notes(
    db: Session,
    *,
    initiated_by_user_id: int | None,
    initiated_by_name: str | None,
) -> tuple[int, list[str]]:
    stage = (
        db.query(PlatformImplementationStage)
        .filter(PlatformImplementationStage.slug == "object-table-ut-parity")
        .one_or_none()
    )
    related_stage_id = stage.id if stage is not None else None
    added = 0
    journal_lines: list[str] = []

    if _add_activity(
        db,
        slug=OBJECT_TABLE_ENTITY_CARD_CHECKLIST_HISTORY_SLUG,
        title="Object Platform: чек-лист в карточке объекта",
        description=_OBJECT_TABLE_ENTITY_CARD_CHECKLIST_HISTORY_DESCRIPTION,
        result=_OBJECT_TABLE_ENTITY_CARD_CHECKLIST_CHANGELOG_DESCRIPTION,
        activity_type=PlatformActivityType.MILESTONE.value,
        related_stage_id=related_stage_id,
        initiated_by_user_id=initiated_by_user_id,
        initiated_by_name=initiated_by_name,
    ):
        added += 1

    if _add_activity(
        db,
        slug=OBJECT_TABLE_ENTITY_CARD_CHECKLIST_CHANGELOG_SLUG,
        title="Журнал изменений: чек-лист в карточке Object Platform",
        description=_OBJECT_TABLE_ENTITY_CARD_CHECKLIST_CHANGELOG_DESCRIPTION,
        result=_OBJECT_TABLE_ENTITY_CARD_CHECKLIST_CHANGELOG_DESCRIPTION,
        activity_type=PlatformActivityType.MILESTONE.value,
        related_stage_id=related_stage_id,
        initiated_by_user_id=initiated_by_user_id,
        initiated_by_name=initiated_by_name,
    ):
        added += 1
        journal_lines.append(_OBJECT_TABLE_ENTITY_CARD_CHECKLIST_CHANGELOG_DESCRIPTION)

    return added, journal_lines


OBJECT_CONTEXT_MENU_HISTORY_SLUG = "object-context-menu-20260606"
OBJECT_CONTEXT_MENU_CHANGELOG_SLUG = "object-context-menu-changelog-20260606"

_OBJECT_CONTEXT_MENU_HISTORY_DESCRIPTION = (
    "Object Platform: контекстное меню объекта в шапке runtime — триггер «Название ▾», "
    "единая точка управления объектом, расширяемый registry действий."
)

_OBJECT_CONTEXT_MENU_CHANGELOG_DESCRIPTION = (
    "Добавлено Object Context Menu между иконкой объекта и вкладками; MVP-пункты "
    "Импорт/Экспорт Excel (заглушки), закрытие по клику вне/Escape."
)


def _ensure_object_context_menu_dashboard_notes(
    db: Session,
    *,
    initiated_by_user_id: int | None,
    initiated_by_name: str | None,
) -> tuple[int, list[str]]:
    added = 0
    journal_lines: list[str] = []

    if _add_activity(
        db,
        slug=OBJECT_CONTEXT_MENU_HISTORY_SLUG,
        title="Object Platform: контекстное меню объекта",
        description=_OBJECT_CONTEXT_MENU_HISTORY_DESCRIPTION,
        result=_OBJECT_CONTEXT_MENU_CHANGELOG_DESCRIPTION,
        activity_type=PlatformActivityType.MILESTONE.value,
        related_stage_id=None,
        initiated_by_user_id=initiated_by_user_id,
        initiated_by_name=initiated_by_name,
    ):
        added += 1

    if _add_activity(
        db,
        slug=OBJECT_CONTEXT_MENU_CHANGELOG_SLUG,
        title="Журнал изменений: контекстное меню объекта",
        description=_OBJECT_CONTEXT_MENU_CHANGELOG_DESCRIPTION,
        result=_OBJECT_CONTEXT_MENU_CHANGELOG_DESCRIPTION,
        activity_type=PlatformActivityType.MILESTONE.value,
        related_stage_id=None,
        initiated_by_user_id=initiated_by_user_id,
        initiated_by_name=initiated_by_name,
    ):
        added += 1
        journal_lines.append(_OBJECT_CONTEXT_MENU_CHANGELOG_DESCRIPTION)

    return added, journal_lines


OBJECT_TABLE_EXCEL_EXPORT_HISTORY_SLUG = (
    "object-table-excel-export-20260606"
)
OBJECT_TABLE_EXCEL_EXPORT_CHANGELOG_SLUG = (
    "object-table-excel-export-changelog-20260606"
)

_OBJECT_TABLE_EXCEL_EXPORT_HISTORY_DESCRIPTION = (
    "Object Platform: MVP-экспорт Excel из контекстного меню объекта — текущее "
    "табличное представление (видимые колонки, порядок, фильтры, сортировка), "
    "читаемые значения полей, до 10 000 записей."
)

_OBJECT_TABLE_EXCEL_EXPORT_CHANGELOG_DESCRIPTION = (
    "Экспорт Excel запускается через «Название объекта ▾ → Экспорт Excel»; "
    "данные берутся из Object Platform runtime (не Universal Tables), файл "
    "формируется сервисом exportObjectTableToExcel с учётом активного представления."
)


def _ensure_object_table_excel_export_dashboard_notes(
    db: Session,
    *,
    initiated_by_user_id: int | None,
    initiated_by_name: str | None,
) -> tuple[int, list[str]]:
    stage = (
        db.query(PlatformImplementationStage)
        .filter(PlatformImplementationStage.slug == "object-table-ut-parity")
        .one_or_none()
    )
    related_stage_id = stage.id if stage is not None else None
    added = 0
    journal_lines: list[str] = []

    if _add_activity(
        db,
        slug=OBJECT_TABLE_EXCEL_EXPORT_HISTORY_SLUG,
        title="Object Platform: экспорт Excel (MVP)",
        description=_OBJECT_TABLE_EXCEL_EXPORT_HISTORY_DESCRIPTION,
        result=_OBJECT_TABLE_EXCEL_EXPORT_CHANGELOG_DESCRIPTION,
        activity_type=PlatformActivityType.MILESTONE.value,
        related_stage_id=related_stage_id,
        initiated_by_user_id=initiated_by_user_id,
        initiated_by_name=initiated_by_name,
    ):
        added += 1

    if _add_activity(
        db,
        slug=OBJECT_TABLE_EXCEL_EXPORT_CHANGELOG_SLUG,
        title="Журнал изменений: экспорт Excel Object Table",
        description=_OBJECT_TABLE_EXCEL_EXPORT_CHANGELOG_DESCRIPTION,
        result=_OBJECT_TABLE_EXCEL_EXPORT_CHANGELOG_DESCRIPTION,
        activity_type=PlatformActivityType.MILESTONE.value,
        related_stage_id=related_stage_id,
        initiated_by_user_id=initiated_by_user_id,
        initiated_by_name=initiated_by_name,
    ):
        added += 1
        journal_lines.append(_OBJECT_TABLE_EXCEL_EXPORT_CHANGELOG_DESCRIPTION)

    return added, journal_lines


OBJECT_TABLE_TITLE_HIERARCHY_NUMBER_UX_CHANGELOG_SLUG = (
    "object-table-title-hierarchy-number-ux-20260606"
)

_OBJECT_TABLE_TITLE_HIERARCHY_NUMBER_UX_CHANGELOG_DESCRIPTION = (
    "Object Table: иерархический номер в Title Field — единая зона [меню ⋮] [раскрытие ›] "
    "[hierarchyNumber] [название]; приоритет row.hierarchy.hierarchyNumber; фиксированные "
    "ширины зон; hover-меню без сдвига строки; колонка № (record_number) без изменений."
)


def _ensure_object_table_title_hierarchy_number_ux_dashboard_notes(
    db: Session,
    *,
    initiated_by_user_id: int | None,
    initiated_by_name: str | None,
) -> tuple[int, list[str]]:
    added = 0
    journal_lines: list[str] = []

    if _add_activity(
        db,
        slug=OBJECT_TABLE_TITLE_HIERARCHY_NUMBER_UX_CHANGELOG_SLUG,
        title="Object Table: иерархический номер в Title Field",
        description=_OBJECT_TABLE_TITLE_HIERARCHY_NUMBER_UX_CHANGELOG_DESCRIPTION,
        result=_OBJECT_TABLE_TITLE_HIERARCHY_NUMBER_UX_CHANGELOG_DESCRIPTION,
        activity_type=PlatformActivityType.MILESTONE.value,
        related_stage_id=None,
        initiated_by_user_id=initiated_by_user_id,
        initiated_by_name=initiated_by_name,
    ):
        added += 1
        journal_lines.append(_OBJECT_TABLE_TITLE_HIERARCHY_NUMBER_UX_CHANGELOG_DESCRIPTION)

    return added, journal_lines


OBJECT_TABLE_SELECTION_TREE_TOGGLE_UX_CHANGELOG_SLUG = (
    "object-table-selection-tree-toggle-ux-20260606"
)

_OBJECT_TABLE_SELECTION_TREE_TOGGLE_UX_CHANGELOG_DESCRIPTION = (
    "Object Table: раскрытие дерева перенесено в колонку чекбокса — первая служебная колонка "
    "[checkbox][tree toggle]; шапка с глобальным expandAll/collapseAll через expandedRowIds; "
    "строки без детей — только чекбокс; Title Field без зоны раскрытия."
)

STUDIO_PREVIEW_BUSINESS_CONTEXT_UX_CHANGELOG_SLUG = (
    "studio-preview-business-context-ux-20260606"
)

_STUDIO_PREVIEW_BUSINESS_CONTEXT_UX_CHANGELOG_DESCRIPTION = (
    "Studio: вкладка «Предпросмотр» — бизнес-контекст (используется, статус, отображается) "
    "вместо технических строк runtime/query; переименование Runtime Preview → Предпросмотр."
)


def _ensure_studio_preview_business_context_ux_dashboard_notes(
    db: Session,
    *,
    initiated_by_user_id: int | None,
    initiated_by_name: str | None,
) -> tuple[int, list[str]]:
    added = 0
    journal_lines: list[str] = []

    if _add_activity(
        db,
        slug=STUDIO_PREVIEW_BUSINESS_CONTEXT_UX_CHANGELOG_SLUG,
        title="Studio: бизнес-контекст вкладки «Предпросмотр»",
        description=_STUDIO_PREVIEW_BUSINESS_CONTEXT_UX_CHANGELOG_DESCRIPTION,
        result=_STUDIO_PREVIEW_BUSINESS_CONTEXT_UX_CHANGELOG_DESCRIPTION,
        activity_type=PlatformActivityType.MILESTONE.value,
        related_stage_id=None,
        initiated_by_user_id=initiated_by_user_id,
        initiated_by_name=initiated_by_name,
    ):
        added += 1
        journal_lines.append(_STUDIO_PREVIEW_BUSINESS_CONTEXT_UX_CHANGELOG_DESCRIPTION)

    return added, journal_lines


STUDIO_PREVIEW_TAB_SELECTOR_UX_CHANGELOG_SLUG = (
    "studio-preview-tab-selector-ux-20260606"
)

_STUDIO_PREVIEW_TAB_SELECTOR_UX_CHANGELOG_DESCRIPTION = (
    "Studio: вкладка «Предпросмотр» показывает выбранную вкладку объекта — dropdown "
    "«Предпросмотр ▾», название и статус вкладки, блок «Используется»; preview-only "
    "через ObjectViewHost без поля «Отображается»."
)


def _ensure_studio_preview_tab_selector_ux_dashboard_notes(
    db: Session,
    *,
    initiated_by_user_id: int | None,
    initiated_by_name: str | None,
) -> tuple[int, list[str]]:
    added = 0
    journal_lines: list[str] = []

    if _add_activity(
        db,
        slug=STUDIO_PREVIEW_TAB_SELECTOR_UX_CHANGELOG_SLUG,
        title="Studio: предпросмотр выбранной вкладки объекта",
        description=_STUDIO_PREVIEW_TAB_SELECTOR_UX_CHANGELOG_DESCRIPTION,
        result=_STUDIO_PREVIEW_TAB_SELECTOR_UX_CHANGELOG_DESCRIPTION,
        activity_type=PlatformActivityType.MILESTONE.value,
        related_stage_id=None,
        initiated_by_user_id=initiated_by_user_id,
        initiated_by_name=initiated_by_name,
    ):
        added += 1
        journal_lines.append(_STUDIO_PREVIEW_TAB_SELECTOR_UX_CHANGELOG_DESCRIPTION)

    return added, journal_lines


STUDIO_PREVIEW_TAB_BAR_UX_CHANGELOG_SLUG = (
    "studio-preview-tab-bar-ux-20260606"
)

_STUDIO_PREVIEW_TAB_BAR_UX_CHANGELOG_DESCRIPTION = (
    "Studio Preview UX: dropdown «Предпросмотр ▾» перенесён в tab-bar; на странице — "
    "компактное имя вкладки, тип, платформенный badge статуса и «Используется» только "
    "с маршрутами Офис (без Studio)."
)


def _ensure_studio_preview_tab_bar_ux_dashboard_notes(
    db: Session,
    *,
    initiated_by_user_id: int | None,
    initiated_by_name: str | None,
) -> tuple[int, list[str]]:
    added = 0
    journal_lines: list[str] = []

    if _add_activity(
        db,
        slug=STUDIO_PREVIEW_TAB_BAR_UX_CHANGELOG_SLUG,
        title="Studio Preview: dropdown в tab-bar и office-only usage",
        description=_STUDIO_PREVIEW_TAB_BAR_UX_CHANGELOG_DESCRIPTION,
        result=_STUDIO_PREVIEW_TAB_BAR_UX_CHANGELOG_DESCRIPTION,
        activity_type=PlatformActivityType.MILESTONE.value,
        related_stage_id=None,
        initiated_by_user_id=initiated_by_user_id,
        initiated_by_name=initiated_by_name,
    ):
        added += 1
        journal_lines.append(_STUDIO_PREVIEW_TAB_BAR_UX_CHANGELOG_DESCRIPTION)

    return added, journal_lines


STUDIO_OBJECT_TYPE_ACTIONS_MENU_CHANGELOG_SLUG = (
    "studio-object-type-actions-menu-20260607"
)

_STUDIO_OBJECT_TYPE_ACTIONS_MENU_CHANGELOG_DESCRIPTION = (
    "Studio Object Actions Menu: меню «…» в шапке типа объекта снова открывается "
    "(portal + fixed positioning); пункты Переименовать / Дублировать / Удалить; "
    "удаление через ObjectTypeDeleteConfirmModal с delete-preview API."
)


def _ensure_studio_object_type_actions_menu_dashboard_notes(
    db: Session,
    *,
    initiated_by_user_id: int | None,
    initiated_by_name: str | None,
) -> tuple[int, list[str]]:
    added = 0
    journal_lines: list[str] = []

    if _add_activity(
        db,
        slug=STUDIO_OBJECT_TYPE_ACTIONS_MENU_CHANGELOG_SLUG,
        title="Studio: меню действий типа объекта",
        description=_STUDIO_OBJECT_TYPE_ACTIONS_MENU_CHANGELOG_DESCRIPTION,
        result=_STUDIO_OBJECT_TYPE_ACTIONS_MENU_CHANGELOG_DESCRIPTION,
        activity_type=PlatformActivityType.MILESTONE.value,
        related_stage_id=None,
        initiated_by_user_id=initiated_by_user_id,
        initiated_by_name=initiated_by_name,
    ):
        added += 1
        journal_lines.append(_STUDIO_OBJECT_TYPE_ACTIONS_MENU_CHANGELOG_DESCRIPTION)

    return added, journal_lines


OBJECT_TYPE_OFFICE_NAV_CLEANUP_CHANGELOG_SLUG = "object-type-office-nav-cleanup-20260610"

_OBJECT_TYPE_OFFICE_NAV_CLEANUP_CHANGELOG_DESCRIPTION = (
    "Object Type Delete: Office Navigation Cleanup — при удалении object type "
    "удаляются все navigation_items (Studio и Office, menu_scope designer/runtime) "
    "по object_type_id и URL; API навигации скрывает пункты удалённых объектов; "
    "Studio после удаления перезагружает Office sidebar."
)


def _ensure_object_type_office_nav_cleanup_dashboard_notes(
    db: Session,
    *,
    initiated_by_user_id: int | None,
    initiated_by_name: str | None,
) -> tuple[int, list[str]]:
    component = (
        db.query(PlatformComponent)
        .filter(PlatformComponent.slug == "object-type")
        .one_or_none()
    )
    related_component_id = component.id if component is not None else None
    added = 0
    journal_lines: list[str] = []

    if _add_activity(
        db,
        slug=OBJECT_TYPE_OFFICE_NAV_CLEANUP_CHANGELOG_SLUG,
        title="Object Type Delete: Office Navigation Cleanup",
        description=_OBJECT_TYPE_OFFICE_NAV_CLEANUP_CHANGELOG_DESCRIPTION,
        result=_OBJECT_TYPE_OFFICE_NAV_CLEANUP_CHANGELOG_DESCRIPTION,
        activity_type=PlatformActivityType.MILESTONE.value,
        related_component_id=related_component_id,
        initiated_by_user_id=initiated_by_user_id,
        initiated_by_name=initiated_by_name,
        meta={"ui_location": "Студия → Объекты; Office → левое меню"},
    ):
        added += 1
        journal_lines.append(_OBJECT_TYPE_OFFICE_NAV_CLEANUP_CHANGELOG_DESCRIPTION)

    return added, journal_lines


OBJECT_TYPE_CASCADE_DELETE_CHANGELOG_SLUG = "object-type-cascade-delete-20260609"

_OBJECT_TYPE_CASCADE_DELETE_CHANGELOG_DESCRIPTION = (
    "Object Type Cascade Delete: удаление объекта каскадно убирает поля, представления, "
    "действия, навигацию, runtime-записи и связи; внешние зависимости (пространства, "
    "действия других объектов) только предупреждают; корзина удаляет окончательно без "
    "блокировки внутренними сущностями."
)


def _ensure_object_type_cascade_delete_dashboard_notes(
    db: Session,
    *,
    initiated_by_user_id: int | None,
    initiated_by_name: str | None,
) -> tuple[int, list[str]]:
    component = (
        db.query(PlatformComponent)
        .filter(PlatformComponent.slug == "object-type")
        .one_or_none()
    )
    related_component_id = component.id if component is not None else None
    added = 0
    journal_lines: list[str] = []

    if _add_activity(
        db,
        slug=OBJECT_TYPE_CASCADE_DELETE_CHANGELOG_SLUG,
        title="Object Type Cascade Delete",
        description=_OBJECT_TYPE_CASCADE_DELETE_CHANGELOG_DESCRIPTION,
        result=_OBJECT_TYPE_CASCADE_DELETE_CHANGELOG_DESCRIPTION,
        activity_type=PlatformActivityType.MILESTONE.value,
        related_component_id=related_component_id,
        initiated_by_user_id=initiated_by_user_id,
        initiated_by_name=initiated_by_name,
        meta={"ui_location": "Студия → Объекты; Студия → Корзина"},
    ):
        added += 1
        journal_lines.append(_OBJECT_TYPE_CASCADE_DELETE_CHANGELOG_DESCRIPTION)

    return added, journal_lines


OBJECT_TYPE_DELETE_FIX_CHANGELOG_SLUG = "object-type-delete-fix-20260609"

_OBJECT_TYPE_DELETE_FIX_CHANGELOG_DESCRIPTION = (
    "Object Type Delete Fix: delete-preview больше не падает с 500 из-за varchar/uuid "
    "в designer_workspace_tabs.object_type_id; проверка зависимостей (связи, представления, "
    "действия, вкладки, навигация, runtime data) возвращает 409 Conflict с группами; "
    "Studio UI показывает «Нельзя удалить объект» и список использований."
)


def _ensure_object_type_delete_fix_dashboard_notes(
    db: Session,
    *,
    initiated_by_user_id: int | None,
    initiated_by_name: str | None,
) -> tuple[int, list[str]]:
    component = (
        db.query(PlatformComponent)
        .filter(PlatformComponent.slug == "object-type")
        .one_or_none()
    )
    related_component_id = component.id if component is not None else None
    added = 0
    journal_lines: list[str] = []

    if _add_activity(
        db,
        slug=OBJECT_TYPE_DELETE_FIX_CHANGELOG_SLUG,
        title="Object Type Delete Fix",
        description=_OBJECT_TYPE_DELETE_FIX_CHANGELOG_DESCRIPTION,
        result=_OBJECT_TYPE_DELETE_FIX_CHANGELOG_DESCRIPTION,
        activity_type=PlatformActivityType.MILESTONE.value,
        related_component_id=related_component_id,
        initiated_by_user_id=initiated_by_user_id,
        initiated_by_name=initiated_by_name,
        meta={"ui_location": "Студия → Объекты"},
    ):
        added += 1
        journal_lines.append(_OBJECT_TYPE_DELETE_FIX_CHANGELOG_DESCRIPTION)

    return added, journal_lines


STUDIO_OBJECT_TYPE_HEADER_ICON_CHANGELOG_SLUG = (
    "studio-object-type-header-icon-20260606"
)

_STUDIO_OBJECT_TYPE_HEADER_ICON_CHANGELOG_DESCRIPTION = (
    "Studio Object Type Header: единый резолв иконки с Office — "
    "getObjectTypeAppearanceFields не затирает icon_type/icon_file_url пустыми display_*; "
    "mergeObjectTypeAppearance с navigation fallback в ObjectTypeWorkspacePage."
)


def _ensure_studio_object_type_header_icon_dashboard_notes(
    db: Session,
    *,
    initiated_by_user_id: int | None,
    initiated_by_name: str | None,
) -> tuple[int, list[str]]:
    added = 0
    journal_lines: list[str] = []

    if _add_activity(
        db,
        slug=STUDIO_OBJECT_TYPE_HEADER_ICON_CHANGELOG_SLUG,
        title="Studio: иконка объекта в шапке workspace",
        description=_STUDIO_OBJECT_TYPE_HEADER_ICON_CHANGELOG_DESCRIPTION,
        result=_STUDIO_OBJECT_TYPE_HEADER_ICON_CHANGELOG_DESCRIPTION,
        activity_type=PlatformActivityType.MILESTONE.value,
        related_stage_id=None,
        initiated_by_user_id=initiated_by_user_id,
        initiated_by_name=initiated_by_name,
    ):
        added += 1
        journal_lines.append(_STUDIO_OBJECT_TYPE_HEADER_ICON_CHANGELOG_DESCRIPTION)

    return added, journal_lines


STUDIO_PREVIEW_DEMO_DATA_TOOLBAR_BADGE_CHANGELOG_SLUG = (
    "studio-preview-demo-data-toolbar-badge-20260606"
)

_STUDIO_PREVIEW_DEMO_DATA_TOOLBAR_BADGE_CHANGELOG_DESCRIPTION = (
    "Studio Preview: badge «Демо-данные» в панели таблицы вместо строки над таблицей; "
    "warning-стиль, tooltip; только mode=studio-preview."
)


def _ensure_studio_preview_demo_data_toolbar_badge_dashboard_notes(
    db: Session,
    *,
    initiated_by_user_id: int | None,
    initiated_by_name: str | None,
) -> tuple[int, list[str]]:
    added = 0
    journal_lines: list[str] = []

    if _add_activity(
        db,
        slug=STUDIO_PREVIEW_DEMO_DATA_TOOLBAR_BADGE_CHANGELOG_SLUG,
        title="Studio Preview: badge демо-данных в toolbar",
        description=_STUDIO_PREVIEW_DEMO_DATA_TOOLBAR_BADGE_CHANGELOG_DESCRIPTION,
        result=_STUDIO_PREVIEW_DEMO_DATA_TOOLBAR_BADGE_CHANGELOG_DESCRIPTION,
        activity_type=PlatformActivityType.MILESTONE.value,
        related_stage_id=None,
        initiated_by_user_id=initiated_by_user_id,
        initiated_by_name=initiated_by_name,
    ):
        added += 1
        journal_lines.append(_STUDIO_PREVIEW_DEMO_DATA_TOOLBAR_BADGE_CHANGELOG_DESCRIPTION)

    return added, journal_lines


STUDIO_PREVIEW_MOCK_DATA_CHANGELOG_SLUG = (
    "studio-preview-mock-data-20260606"
)

_STUDIO_PREVIEW_MOCK_DATA_CHANGELOG_DESCRIPTION = (
    "Studio Preview: демонстрационные строки вместо runtime records — mock data по схеме "
    "объекта, без GET /runtime/query для строк; Office без изменений."
)


def _ensure_studio_preview_mock_data_dashboard_notes(
    db: Session,
    *,
    initiated_by_user_id: int | None,
    initiated_by_name: str | None,
) -> tuple[int, list[str]]:
    added = 0
    journal_lines: list[str] = []

    if _add_activity(
        db,
        slug=STUDIO_PREVIEW_MOCK_DATA_CHANGELOG_SLUG,
        title="Studio Preview: демонстрационные данные",
        description=_STUDIO_PREVIEW_MOCK_DATA_CHANGELOG_DESCRIPTION,
        result=_STUDIO_PREVIEW_MOCK_DATA_CHANGELOG_DESCRIPTION,
        activity_type=PlatformActivityType.MILESTONE.value,
        related_stage_id=None,
        initiated_by_user_id=initiated_by_user_id,
        initiated_by_name=initiated_by_name,
    ):
        added += 1
        journal_lines.append(_STUDIO_PREVIEW_MOCK_DATA_CHANGELOG_DESCRIPTION)

    return added, journal_lines


OBJECT_TABLE_STUDIO_PREVIEW_PARITY_CHANGELOG_SLUG = (
    "object-table-studio-preview-parity-20260606"
)

_OBJECT_TABLE_STUDIO_PREVIEW_PARITY_CHANGELOG_DESCRIPTION = (
    "Object Table Studio Preview: единый render path с Office — иерархия, tree toggle, "
    "иерархическая нумерация, disabled чекбоксы; режим «Предпросмотр» блокирует изменение "
    "данных, inline edit, массовые действия и карточку записи."
)


def _ensure_object_table_studio_preview_parity_dashboard_notes(
    db: Session,
    *,
    initiated_by_user_id: int | None,
    initiated_by_name: str | None,
) -> tuple[int, list[str]]:
    added = 0
    journal_lines: list[str] = []

    if _add_activity(
        db,
        slug=OBJECT_TABLE_STUDIO_PREVIEW_PARITY_CHANGELOG_SLUG,
        title="Object Table: Studio Preview parity с Office",
        description=_OBJECT_TABLE_STUDIO_PREVIEW_PARITY_CHANGELOG_DESCRIPTION,
        result=_OBJECT_TABLE_STUDIO_PREVIEW_PARITY_CHANGELOG_DESCRIPTION,
        activity_type=PlatformActivityType.MILESTONE.value,
        related_stage_id=None,
        initiated_by_user_id=initiated_by_user_id,
        initiated_by_name=initiated_by_name,
    ):
        added += 1
        journal_lines.append(_OBJECT_TABLE_STUDIO_PREVIEW_PARITY_CHANGELOG_DESCRIPTION)

    return added, journal_lines


OBJECT_PLAN_VIEW_CHANGELOG_SLUG = "object-plan-view-20260607"

_OBJECT_PLAN_VIEW_CHANGELOG_DESCRIPTION = (
    'Object Platform: представление объекта «План» (view_type=plan) — иерархия по relation, '
    "дерево + панель деталей, готовность по статусам, следующие шаги, опциональные проблемы; "
    "Studio → Object Type → Tabs → View Type = План; Office → Object Tab → План; "
    "Studio Preview на mock-данных без runtime records."
)

OBJECT_VIEW_ARCHITECTURE_CHANGELOG_SLUG = "object-view-architecture-20260607"

_OBJECT_VIEW_ARCHITECTURE_CHANGELOG_DESCRIPTION = (
    "Платформенное ядро: утверждена целевая модель Object Tab = Projection + Query + View Settings "
    "для Table/Plan/Card/Kanban/Calendar/Tree/Diagram. Матрица отклонений, legacy и roadmap "
    "этапов 0–6 в docs/architecture/OBJECT_VIEW_ARCHITECTURE.md v1.1."
)

OBJECT_VIEW_CONTRACT_CHANGELOG_SLUG = "object-view-contract-20260608"

_OBJECT_VIEW_CONTRACT_CHANGELOG_DESCRIPTION = (
    "Платформенное ядро: этап 1 — контракт представлений. roleMapping в ObjectViewContract "
    "(draft/save/publish/catalog); publish validation projection + roleMapping ⊆ projection; "
    "dual-read adapter resolvePlanRoleMappingDualRead (не подключён к runtime). "
    "Документ docs/architecture/OBJECT_VIEW_CONTRACT.md."
)

OBJECT_VIEW_PROJECTION_UI_CHANGELOG_SLUG = "object-view-projection-ui-20260608"

_OBJECT_VIEW_PROJECTION_UI_CHANGELOG_DESCRIPTION = (
    "Платформенное ядро: этап 2 — Projection UI. ObjectProjectionPanel для Table/Plan/Form/Card/List; "
    "Plan получил блок Projection над настройками Плана; fieldKeys сохраняются в контракт. "
    "Runtime без изменений."
)

OBJECT_VIEW_ROLE_MAPPING_UI_CHANGELOG_SLUG = "object-view-role-mapping-ui-20260608"

_OBJECT_VIEW_ROLE_MAPPING_UI_CHANGELOG_DESCRIPTION = (
    "Платформенное ядро: этап 3 — Role Mapping UI. ObjectRoleMappingPanel (универсальный компонент); "
    "Plan: nodeTitle/nodeStatus/nodeDescription/nextSteps из Projection; roleMapping в draft/save/publish. "
    "Legacy *FieldKey сохранены и помечены."
)

OBJECT_VIEW_DUAL_READ_CHANGELOG_SLUG = "object-view-dual-read-20260608"

_OBJECT_VIEW_DUAL_READ_CHANGELOG_DESCRIPTION = (
    "Платформенное ядро: этап 4 — Runtime dual-read для Plan. resolvePlanRoleMappingDualRead "
    "подключён в ObjectPlanView/buildPlanTree; приоритет roleMapping → legacy → fallback. "
    "Старые Plan-вкладки работают без изменений. Следующий этап: очистка legacy."
)

OBJECT_VIEW_LEGACY_DEPRECATION_CHANGELOG_SLUG = "object-view-legacy-deprecation-20260608"

_OBJECT_VIEW_LEGACY_DEPRECATION_CHANGELOG_DESCRIPTION = (
    "Платформенное ядро: этап 5A — Plan Legacy Deprecation. presentation.plan.*FieldKey "
    "помечены @deprecated; publish snapshot добавляет usesLegacyPlanFields; Plan debug без "
    "window.__YASNOPRO_*; dual-read и fallback сохранены. Следующий этап 5B: удаление legacy."
)

OBJECT_VIEW_LEGACY_USAGE_AUDIT_CHANGELOG_SLUG = "object-view-legacy-usage-audit-20260608"

_OBJECT_VIEW_LEGACY_USAGE_AUDIT_CHANGELOG_DESCRIPTION = (
    "Платформенное ядро: этап 5A.1 — Legacy Usage Audit. Read-only аудит published Plan "
    "(audit_plan_legacy_usage.py): 1 Plan, 100% legacy, removal readiness 25%. "
    "Рекомендация: Migration Assistant перед этапом 5B."
)

OBJECT_VIEW_LEGACY_SNAPSHOT_CLEANUP_CHANGELOG_SLUG = "object-view-legacy-snapshot-cleanup-20260608"

_OBJECT_VIEW_LEGACY_SNAPSHOT_CLEANUP_CHANGELOG_DESCRIPTION = (
    "Платформенное ядро: этап 5B — Plan Legacy Snapshot Cleanup. "
    "sanitize_presentation_plan удаляет *FieldKey из publish snapshot при "
    "usesLegacyPlanFields=false; catalog v69; Mixed=0; draft/Studio/dual-read сохранены. "
    "Следующий этап 5C: Fallback cleanup."
)

OBJECT_VIEW_FALLBACK_AUDIT_CHANGELOG_SLUG = "object-view-fallback-audit-20260608"

_OBJECT_VIEW_FALLBACK_AUDIT_CHANGELOG_DESCRIPTION = (
    "Платформенное ядро: этап 5C.1 — Runtime Fallback Audit. "
    "Карта F1–F8; Published Plan v69 не использует role-mapping fallback; "
    "Studio Preview — mock tree. Рекомендация 5C.2: удалить F1–F6 после тестов."
)

OBJECT_VIEW_FALLBACK_REMOVAL_CHANGELOG_SLUG = "object-view-fallback-removal-20260607"

_OBJECT_VIEW_FALLBACK_REMOVAL_CHANGELOG_DESCRIPTION = (
    "Платформенное ядро: этап 5C.2 — Plan Fallback Removal. "
    "Удалены F1–F6 (resolvePlanRoleMapping, planEntityUtils tree, buildPlanTree); "
    "dual-read roleMapping → legacy; F7 Issues panel и F8 buildPlanTree safety сохранены. "
    "Plan Tree Fallback Count = 0. Следующий этап 5D: Legacy Dual-Read Removal."
)

OBJECT_VIEW_LEGACY_DUAL_READ_AUDIT_CHANGELOG_SLUG = "object-view-legacy-dual-read-audit-20260607"

_OBJECT_VIEW_LEGACY_DUAL_READ_AUDIT_CHANGELOG_DESCRIPTION = (
    "Платформенное ядро: этап 5D.1 — Legacy Dual-Read Usage Audit. "
    "Published Plan v69 roleMapping-only; legacy tier не в Office runtime; "
    "draft legacy keys только в Studio. Рекомендация 5D.2: удалить legacy tier после тестов."
)

OBJECT_VIEW_LEGACY_DUAL_READ_REMOVAL_CHANGELOG_SLUG = "object-view-legacy-dual-read-removal-20260607"

_OBJECT_VIEW_LEGACY_DUAL_READ_REMOVAL_CHANGELOG_DESCRIPTION = (
    "Платформенное ядро: этап 5D.2 — Plan Legacy Dual-Read Removal. "
    "resolvePlanRoleMapping — roleMapping only; legacy tier удалён из Plan tree runtime; "
    "buildPlanTree F8 → EMPTY_PLAN_ROLE_MAPPING. Studio draft, Migration Assistant, "
    "publish diagnostic сохранены. Следующий этап 5E: Issues Panel (F7)."
)

OBJECT_VIEW_ENTITY_TITLE_UNIFICATION_CHANGELOG_SLUG = "object-view-entity-title-unification-20260607"

_OBJECT_VIEW_ENTITY_TITLE_UNIFICATION_CHANGELOG_DESCRIPTION = (
    "Платформенное ядро: этап 5E — Entity Title Resolution. "
    "resolveEntityDisplayTitle: Projection.titleFieldKey → Object Type Title Field → [id]; "
    "F7 resolvePlanEntityTitle удалён; Issues/Related/Lookup мигрированы. "
    "Runtime Title Fallbacks = 0 в object platform. Следующий этап 5F."
)

OBJECT_VIEW_PLAN_UI_CLEANUP_CHANGELOG_SLUG = "object-view-plan-ui-cleanup-20260607"

_OBJECT_VIEW_PLAN_UI_CLEANUP_CHANGELOG_DESCRIPTION = (
    "Платформенное ядро: этап 5F — UI Cleanup Plan Settings. "
    "Удалены legacy *FieldKey controls из Studio; Migration Assistant скрыт при заполненном "
    "roleMapping; draft legacy keys и generatePlanRoleMappingFromLegacy сохранены. "
    "Legacy Controls Visible = 0; Plan Settings Simplified = true. Следующий этап 6."
)

OBJECT_VIEW_PLAN_STATUS_DISPLAY_BUGFIX_CHANGELOG_SLUG = (
    "object-view-plan-status-display-bugfix-20260607"
)

_OBJECT_VIEW_PLAN_STATUS_DISPLAY_BUGFIX_CHANGELOG_DESCRIPTION = (
    "Bugfix: Plan status display uses object field settings. "
    "resolvePlanFieldDisplayValue + normalizeChoiceValue; option key → label как в Table; "
    "ownStatusLabel не подменяется rollup-категорией."
)

OBJECT_VIEW_PLAN_UI_REFERENCE_LAYOUT_CHANGELOG_SLUG = (
    "object-view-plan-ui-reference-layout-20260607"
)

_OBJECT_VIEW_PLAN_UI_REFERENCE_LAYOUT_CHANGELOG_DESCRIPTION = (
    "Plan UI — Reference Layout. Дерево: нумерация 1/1.1, компактные колонки, ПКМ-меню, "
    "resize 280-600px (localStorage). Правая область: вкладки сверху "
    "(Инфо/Комментарии/История/Файлы/Задачи/Связи/Активности). "
    "Инфо: Projection + Runtime Entity; архитектура данных без изменений."
)

OBJECT_VIEW_PLAN_TREE_VISUAL_POLISH_CHANGELOG_SLUG = (
    "object-view-plan-tree-visual-polish-20260608"
)

_OBJECT_VIEW_PLAN_TREE_VISUAL_POLISH_CHANGELOG_DESCRIPTION = (
    "Plan Tree Visual Polish. Заголовки колонок #0f172a; глобальное раскрытие Chevron "
    "слева от «Название»; удалён GripVertical; единый gap 8px в строке; "
    "вертикальное выравнивание; логика дерева/статусов/готовности без изменений."
)

OBJECT_VIEW_PLAN_LAYOUT_SETTINGS_CHANGELOG_SLUG = (
    "object-view-plan-layout-settings-20260608"
)

_OBJECT_VIEW_PLAN_LAYOUT_SETTINGS_CHANGELOG_DESCRIPTION = (
    "Plan View Settings — tabs synchronized between Studio Preview and Office Runtime. "
    "planLayout in presentation.plan; Info tab fields from projection.infoFieldKeys; "
    "draft overlay in studio-preview."
)

OBJECT_VIEW_PLAN_PROPERTIES_SIMPLIFICATION_CHANGELOG_SLUG = (
    "object-view-plan-properties-simplification-20260608"
)

_OBJECT_VIEW_PLAN_PROPERTIES_SIMPLIFICATION_CHANGELOG_DESCRIPTION = (
    "Plan properties panel: Projection column «Инфо» + visibility eye; Title Field for "
    "tree/work area/card; removed Role Mapping, issues relation and info sections UI; "
    "tabs configured separately (visibility, order, label)."
)

OBJECT_VIEW_PLAN_TABS_SHOW_IN_INFO_CHANGELOG_SLUG = (
    "object-view-plan-tabs-show-in-info-20260608"
)

_OBJECT_VIEW_PLAN_TABS_SHOW_IN_INFO_CHANGELOG_DESCRIPTION = (
    "Plan tabs: added checklist tab (system module); showInInfo embeds tab content inside "
    "Info tab; Studio UI drag | eye | Info checkbox | label; eye and showInInfo are "
    "independent; Studio Preview and Office Runtime synchronized."
)

OBJECT_VIEW_PLAN_TABS_HEADER_FILTER_BUGFIX_CHANGELOG_SLUG = (
    "object-view-plan-tabs-header-filter-bugfix-20260608"
)

_OBJECT_VIEW_PLAN_TABS_HEADER_FILTER_BUGFIX_CHANGELOG_DESCRIPTION = (
    "Bugfix: Plan work-area header excludes tabs with showInInfo=true; "
    "embedded blocks still render inside Info tab regardless of visible flag."
)

OBJECT_VIEW_PLAN_PREVIEW_CONSTRUCTOR_CHANGELOG_SLUG = (
    "object-view-plan-preview-constructor-20260608"
)

_OBJECT_VIEW_PLAN_PREVIEW_CONSTRUCTOR_CHANGELOG_DESCRIPTION = (
    "Plan Preview visual constructor: context menus and drag & drop for Info fields "
    "and work-area tabs; updates projection, field definitions and planLayout.tabs; "
    "single source of truth synced with properties panel and Office Runtime."
)


def _ensure_object_view_architecture_dashboard_notes(
    db: Session,
    *,
    initiated_by_user_id: int | None,
    initiated_by_name: str | None,
) -> tuple[int, list[str]]:
    stage = (
        db.query(PlatformImplementationStage)
        .filter(PlatformImplementationStage.slug == "object-platform-independence")
        .one_or_none()
    )
    related_stage_id = stage.id if stage is not None else None
    added = 0
    journal_lines: list[str] = []

    if _add_activity(
        db,
        slug=OBJECT_VIEW_ARCHITECTURE_CHANGELOG_SLUG,
        title="Платформенное ядро: архитектура представлений объектов",
        description=_OBJECT_VIEW_ARCHITECTURE_CHANGELOG_DESCRIPTION,
        result=_OBJECT_VIEW_ARCHITECTURE_CHANGELOG_DESCRIPTION,
        activity_type=PlatformActivityType.MILESTONE.value,
        related_stage_id=related_stage_id,
        initiated_by_user_id=initiated_by_user_id,
        initiated_by_name=initiated_by_name,
    ):
        added += 1
        journal_lines.append(_OBJECT_VIEW_ARCHITECTURE_CHANGELOG_DESCRIPTION)

    if _add_activity(
        db,
        slug=OBJECT_VIEW_CONTRACT_CHANGELOG_SLUG,
        title="Платформенное ядро: контракт представлений (этап 1)",
        description=_OBJECT_VIEW_CONTRACT_CHANGELOG_DESCRIPTION,
        result=_OBJECT_VIEW_CONTRACT_CHANGELOG_DESCRIPTION,
        activity_type=PlatformActivityType.MILESTONE.value,
        related_stage_id=related_stage_id,
        initiated_by_user_id=initiated_by_user_id,
        initiated_by_name=initiated_by_name,
    ):
        added += 1
        journal_lines.append(_OBJECT_VIEW_CONTRACT_CHANGELOG_DESCRIPTION)

    if _add_activity(
        db,
        slug=OBJECT_VIEW_PROJECTION_UI_CHANGELOG_SLUG,
        title="Платформенное ядро: Projection UI (этап 2)",
        description=_OBJECT_VIEW_PROJECTION_UI_CHANGELOG_DESCRIPTION,
        result=_OBJECT_VIEW_PROJECTION_UI_CHANGELOG_DESCRIPTION,
        activity_type=PlatformActivityType.MILESTONE.value,
        related_stage_id=related_stage_id,
        initiated_by_user_id=initiated_by_user_id,
        initiated_by_name=initiated_by_name,
    ):
        added += 1
        journal_lines.append(_OBJECT_VIEW_PROJECTION_UI_CHANGELOG_DESCRIPTION)

    if _add_activity(
        db,
        slug=OBJECT_VIEW_ROLE_MAPPING_UI_CHANGELOG_SLUG,
        title="Платформенное ядро: Role Mapping UI (этап 3)",
        description=_OBJECT_VIEW_ROLE_MAPPING_UI_CHANGELOG_DESCRIPTION,
        result=_OBJECT_VIEW_ROLE_MAPPING_UI_CHANGELOG_DESCRIPTION,
        activity_type=PlatformActivityType.MILESTONE.value,
        related_stage_id=related_stage_id,
        initiated_by_user_id=initiated_by_user_id,
        initiated_by_name=initiated_by_name,
    ):
        added += 1
        journal_lines.append(_OBJECT_VIEW_ROLE_MAPPING_UI_CHANGELOG_DESCRIPTION)

    if _add_activity(
        db,
        slug=OBJECT_VIEW_DUAL_READ_CHANGELOG_SLUG,
        title="Платформенное ядро: Runtime dual-read (этап 4)",
        description=_OBJECT_VIEW_DUAL_READ_CHANGELOG_DESCRIPTION,
        result=_OBJECT_VIEW_DUAL_READ_CHANGELOG_DESCRIPTION,
        activity_type=PlatformActivityType.MILESTONE.value,
        related_stage_id=related_stage_id,
        initiated_by_user_id=initiated_by_user_id,
        initiated_by_name=initiated_by_name,
    ):
        added += 1
        journal_lines.append(_OBJECT_VIEW_DUAL_READ_CHANGELOG_DESCRIPTION)

    if _add_activity(
        db,
        slug=OBJECT_VIEW_LEGACY_DEPRECATION_CHANGELOG_SLUG,
        title="Платформенное ядро: Plan Legacy Deprecation (этап 5A)",
        description=_OBJECT_VIEW_LEGACY_DEPRECATION_CHANGELOG_DESCRIPTION,
        result=_OBJECT_VIEW_LEGACY_DEPRECATION_CHANGELOG_DESCRIPTION,
        activity_type=PlatformActivityType.MILESTONE.value,
        related_stage_id=related_stage_id,
        initiated_by_user_id=initiated_by_user_id,
        initiated_by_name=initiated_by_name,
    ):
        added += 1
        journal_lines.append(_OBJECT_VIEW_LEGACY_DEPRECATION_CHANGELOG_DESCRIPTION)

    if _add_activity(
        db,
        slug=OBJECT_VIEW_LEGACY_USAGE_AUDIT_CHANGELOG_SLUG,
        title="Платформенное ядро: Plan Legacy Usage Audit (этап 5A.1)",
        description=_OBJECT_VIEW_LEGACY_USAGE_AUDIT_CHANGELOG_DESCRIPTION,
        result=_OBJECT_VIEW_LEGACY_USAGE_AUDIT_CHANGELOG_DESCRIPTION,
        activity_type=PlatformActivityType.MILESTONE.value,
        related_stage_id=related_stage_id,
        initiated_by_user_id=initiated_by_user_id,
        initiated_by_name=initiated_by_name,
    ):
        added += 1
        journal_lines.append(_OBJECT_VIEW_LEGACY_USAGE_AUDIT_CHANGELOG_DESCRIPTION)

    if _add_activity(
        db,
        slug=OBJECT_VIEW_LEGACY_SNAPSHOT_CLEANUP_CHANGELOG_SLUG,
        title="Платформенное ядро: Plan Legacy Snapshot Cleanup (этап 5B)",
        description=_OBJECT_VIEW_LEGACY_SNAPSHOT_CLEANUP_CHANGELOG_DESCRIPTION,
        result=_OBJECT_VIEW_LEGACY_SNAPSHOT_CLEANUP_CHANGELOG_DESCRIPTION,
        activity_type=PlatformActivityType.MILESTONE.value,
        related_stage_id=related_stage_id,
        initiated_by_user_id=initiated_by_user_id,
        initiated_by_name=initiated_by_name,
    ):
        added += 1
        journal_lines.append(_OBJECT_VIEW_LEGACY_SNAPSHOT_CLEANUP_CHANGELOG_DESCRIPTION)

    if _add_activity(
        db,
        slug=OBJECT_VIEW_FALLBACK_AUDIT_CHANGELOG_SLUG,
        title="Платформенное ядро: Plan Runtime Fallback Audit (этап 5C.1)",
        description=_OBJECT_VIEW_FALLBACK_AUDIT_CHANGELOG_DESCRIPTION,
        result=_OBJECT_VIEW_FALLBACK_AUDIT_CHANGELOG_DESCRIPTION,
        activity_type=PlatformActivityType.MILESTONE.value,
        related_stage_id=related_stage_id,
        initiated_by_user_id=initiated_by_user_id,
        initiated_by_name=initiated_by_name,
    ):
        added += 1
        journal_lines.append(_OBJECT_VIEW_FALLBACK_AUDIT_CHANGELOG_DESCRIPTION)

    if _add_activity(
        db,
        slug=OBJECT_VIEW_FALLBACK_REMOVAL_CHANGELOG_SLUG,
        title="Платформенное ядро: Plan Fallback Removal (этап 5C.2)",
        description=_OBJECT_VIEW_FALLBACK_REMOVAL_CHANGELOG_DESCRIPTION,
        result=_OBJECT_VIEW_FALLBACK_REMOVAL_CHANGELOG_DESCRIPTION,
        activity_type=PlatformActivityType.MILESTONE.value,
        related_stage_id=related_stage_id,
        initiated_by_user_id=initiated_by_user_id,
        initiated_by_name=initiated_by_name,
    ):
        added += 1
        journal_lines.append(_OBJECT_VIEW_FALLBACK_REMOVAL_CHANGELOG_DESCRIPTION)

    if _add_activity(
        db,
        slug=OBJECT_VIEW_LEGACY_DUAL_READ_AUDIT_CHANGELOG_SLUG,
        title="Платформенное ядро: Plan Legacy Dual-Read Audit (этап 5D.1)",
        description=_OBJECT_VIEW_LEGACY_DUAL_READ_AUDIT_CHANGELOG_DESCRIPTION,
        result=_OBJECT_VIEW_LEGACY_DUAL_READ_AUDIT_CHANGELOG_DESCRIPTION,
        activity_type=PlatformActivityType.MILESTONE.value,
        related_stage_id=related_stage_id,
        initiated_by_user_id=initiated_by_user_id,
        initiated_by_name=initiated_by_name,
    ):
        added += 1
        journal_lines.append(_OBJECT_VIEW_LEGACY_DUAL_READ_AUDIT_CHANGELOG_DESCRIPTION)

    if _add_activity(
        db,
        slug=OBJECT_VIEW_LEGACY_DUAL_READ_REMOVAL_CHANGELOG_SLUG,
        title="Платформенное ядро: Plan Legacy Dual-Read Removal (этап 5D.2)",
        description=_OBJECT_VIEW_LEGACY_DUAL_READ_REMOVAL_CHANGELOG_DESCRIPTION,
        result=_OBJECT_VIEW_LEGACY_DUAL_READ_REMOVAL_CHANGELOG_DESCRIPTION,
        activity_type=PlatformActivityType.MILESTONE.value,
        related_stage_id=related_stage_id,
        initiated_by_user_id=initiated_by_user_id,
        initiated_by_name=initiated_by_name,
    ):
        added += 1
        journal_lines.append(_OBJECT_VIEW_LEGACY_DUAL_READ_REMOVAL_CHANGELOG_DESCRIPTION)

    if _add_activity(
        db,
        slug=OBJECT_VIEW_ENTITY_TITLE_UNIFICATION_CHANGELOG_SLUG,
        title="Платформенное ядро: Entity Title Resolution (этап 5E)",
        description=_OBJECT_VIEW_ENTITY_TITLE_UNIFICATION_CHANGELOG_DESCRIPTION,
        result=_OBJECT_VIEW_ENTITY_TITLE_UNIFICATION_CHANGELOG_DESCRIPTION,
        activity_type=PlatformActivityType.MILESTONE.value,
        related_stage_id=related_stage_id,
        initiated_by_user_id=initiated_by_user_id,
        initiated_by_name=initiated_by_name,
    ):
        added += 1
        journal_lines.append(_OBJECT_VIEW_ENTITY_TITLE_UNIFICATION_CHANGELOG_DESCRIPTION)

    if _add_activity(
        db,
        slug=OBJECT_VIEW_PLAN_UI_CLEANUP_CHANGELOG_SLUG,
        title="Платформенное ядро: UI Cleanup Plan Settings (этап 5F)",
        description=_OBJECT_VIEW_PLAN_UI_CLEANUP_CHANGELOG_DESCRIPTION,
        result=_OBJECT_VIEW_PLAN_UI_CLEANUP_CHANGELOG_DESCRIPTION,
        activity_type=PlatformActivityType.MILESTONE.value,
        related_stage_id=related_stage_id,
        initiated_by_user_id=initiated_by_user_id,
        initiated_by_name=initiated_by_name,
    ):
        added += 1
        journal_lines.append(_OBJECT_VIEW_PLAN_UI_CLEANUP_CHANGELOG_DESCRIPTION)

    if _add_activity(
        db,
        slug=OBJECT_VIEW_PLAN_STATUS_DISPLAY_BUGFIX_CHANGELOG_SLUG,
        title="Bugfix: Plan status display uses object field settings",
        description=_OBJECT_VIEW_PLAN_STATUS_DISPLAY_BUGFIX_CHANGELOG_DESCRIPTION,
        result=_OBJECT_VIEW_PLAN_STATUS_DISPLAY_BUGFIX_CHANGELOG_DESCRIPTION,
        activity_type=PlatformActivityType.MILESTONE.value,
        related_stage_id=related_stage_id,
        initiated_by_user_id=initiated_by_user_id,
        initiated_by_name=initiated_by_name,
    ):
        added += 1
        journal_lines.append(_OBJECT_VIEW_PLAN_STATUS_DISPLAY_BUGFIX_CHANGELOG_DESCRIPTION)

    if _add_activity(
        db,
        slug=OBJECT_VIEW_PLAN_UI_REFERENCE_LAYOUT_CHANGELOG_SLUG,
        title="Plan UI — Reference Layout",
        description=_OBJECT_VIEW_PLAN_UI_REFERENCE_LAYOUT_CHANGELOG_DESCRIPTION,
        result=_OBJECT_VIEW_PLAN_UI_REFERENCE_LAYOUT_CHANGELOG_DESCRIPTION,
        activity_type=PlatformActivityType.MILESTONE.value,
        related_stage_id=related_stage_id,
        initiated_by_user_id=initiated_by_user_id,
        initiated_by_name=initiated_by_name,
    ):
        added += 1
        journal_lines.append(_OBJECT_VIEW_PLAN_UI_REFERENCE_LAYOUT_CHANGELOG_DESCRIPTION)

    if _add_activity(
        db,
        slug=OBJECT_VIEW_PLAN_TREE_VISUAL_POLISH_CHANGELOG_SLUG,
        title="Plan Tree Visual Polish",
        description=_OBJECT_VIEW_PLAN_TREE_VISUAL_POLISH_CHANGELOG_DESCRIPTION,
        result=_OBJECT_VIEW_PLAN_TREE_VISUAL_POLISH_CHANGELOG_DESCRIPTION,
        activity_type=PlatformActivityType.MILESTONE.value,
        related_stage_id=related_stage_id,
        initiated_by_user_id=initiated_by_user_id,
        initiated_by_name=initiated_by_name,
    ):
        added += 1
        journal_lines.append(_OBJECT_VIEW_PLAN_TREE_VISUAL_POLISH_CHANGELOG_DESCRIPTION)

    if _add_activity(
        db,
        slug=OBJECT_VIEW_PLAN_LAYOUT_SETTINGS_CHANGELOG_SLUG,
        title="Plan View Settings — tabs & info layout",
        description=_OBJECT_VIEW_PLAN_LAYOUT_SETTINGS_CHANGELOG_DESCRIPTION,
        result=_OBJECT_VIEW_PLAN_LAYOUT_SETTINGS_CHANGELOG_DESCRIPTION,
        activity_type=PlatformActivityType.MILESTONE.value,
        related_stage_id=related_stage_id,
        initiated_by_user_id=initiated_by_user_id,
        initiated_by_name=initiated_by_name,
    ):
        added += 1
        journal_lines.append(_OBJECT_VIEW_PLAN_LAYOUT_SETTINGS_CHANGELOG_DESCRIPTION)

    if _add_activity(
        db,
        slug=OBJECT_VIEW_PLAN_PROPERTIES_SIMPLIFICATION_CHANGELOG_SLUG,
        title="Plan properties panel simplification",
        description=_OBJECT_VIEW_PLAN_PROPERTIES_SIMPLIFICATION_CHANGELOG_DESCRIPTION,
        result=_OBJECT_VIEW_PLAN_PROPERTIES_SIMPLIFICATION_CHANGELOG_DESCRIPTION,
        activity_type=PlatformActivityType.MILESTONE.value,
        related_stage_id=related_stage_id,
        initiated_by_user_id=initiated_by_user_id,
        initiated_by_name=initiated_by_name,
    ):
        added += 1
        journal_lines.append(_OBJECT_VIEW_PLAN_PROPERTIES_SIMPLIFICATION_CHANGELOG_DESCRIPTION)

    if _add_activity(
        db,
        slug=OBJECT_VIEW_PLAN_TABS_SHOW_IN_INFO_CHANGELOG_SLUG,
        title="Plan tabs — checklist & showInInfo",
        description=_OBJECT_VIEW_PLAN_TABS_SHOW_IN_INFO_CHANGELOG_DESCRIPTION,
        result=_OBJECT_VIEW_PLAN_TABS_SHOW_IN_INFO_CHANGELOG_DESCRIPTION,
        activity_type=PlatformActivityType.MILESTONE.value,
        related_stage_id=related_stage_id,
        initiated_by_user_id=initiated_by_user_id,
        initiated_by_name=initiated_by_name,
    ):
        added += 1
        journal_lines.append(_OBJECT_VIEW_PLAN_TABS_SHOW_IN_INFO_CHANGELOG_DESCRIPTION)

    if _add_activity(
        db,
        slug=OBJECT_VIEW_PLAN_TABS_HEADER_FILTER_BUGFIX_CHANGELOG_SLUG,
        title="Bugfix: showInInfo tabs excluded from Plan header",
        description=_OBJECT_VIEW_PLAN_TABS_HEADER_FILTER_BUGFIX_CHANGELOG_DESCRIPTION,
        result=_OBJECT_VIEW_PLAN_TABS_HEADER_FILTER_BUGFIX_CHANGELOG_DESCRIPTION,
        activity_type=PlatformActivityType.MILESTONE.value,
        related_stage_id=related_stage_id,
        initiated_by_user_id=initiated_by_user_id,
        initiated_by_name=initiated_by_name,
    ):
        added += 1
        journal_lines.append(_OBJECT_VIEW_PLAN_TABS_HEADER_FILTER_BUGFIX_CHANGELOG_DESCRIPTION)

    if _add_activity(
        db,
        slug=OBJECT_VIEW_PLAN_PREVIEW_CONSTRUCTOR_CHANGELOG_SLUG,
        title="Plan Preview visual constructor",
        description=_OBJECT_VIEW_PLAN_PREVIEW_CONSTRUCTOR_CHANGELOG_DESCRIPTION,
        result=_OBJECT_VIEW_PLAN_PREVIEW_CONSTRUCTOR_CHANGELOG_DESCRIPTION,
        activity_type=PlatformActivityType.MILESTONE.value,
        related_stage_id=related_stage_id,
        initiated_by_user_id=initiated_by_user_id,
        initiated_by_name=initiated_by_name,
    ):
        added += 1
        journal_lines.append(_OBJECT_VIEW_PLAN_PREVIEW_CONSTRUCTOR_CHANGELOG_DESCRIPTION)

    return added, journal_lines


def _ensure_object_plan_view_dashboard_notes(
    db: Session,
    *,
    initiated_by_user_id: int | None,
    initiated_by_name: str | None,
) -> tuple[int, list[str]]:
    stage = (
        db.query(PlatformImplementationStage)
        .filter(PlatformImplementationStage.slug == "relation-field-type")
        .one_or_none()
    )
    related_stage_id = stage.id if stage is not None else None
    added = 0
    journal_lines: list[str] = []

    if _add_activity(
        db,
        slug=OBJECT_PLAN_VIEW_CHANGELOG_SLUG,
        title='Object Platform: представление «План»',
        description=_OBJECT_PLAN_VIEW_CHANGELOG_DESCRIPTION,
        result=_OBJECT_PLAN_VIEW_CHANGELOG_DESCRIPTION,
        activity_type=PlatformActivityType.MILESTONE.value,
        related_stage_id=related_stage_id,
        initiated_by_user_id=initiated_by_user_id,
        initiated_by_name=initiated_by_name,
    ):
        added += 1
        journal_lines.append(_OBJECT_PLAN_VIEW_CHANGELOG_DESCRIPTION)

    return added, journal_lines


OBJECT_TABLE_SELECTION_TREE_EXPAND_ALL_FIX_CHANGELOG_SLUG = (
    "object-table-selection-tree-expand-all-fix-20260606"
)

_OBJECT_TABLE_SELECTION_TREE_EXPAND_ALL_FIX_CHANGELOG_DESCRIPTION = (
    "Bugfix Object Table: глобальное раскрытие дерева из шапки работает из полностью свернутого "
    "состояния — expandableRowIds строится по childrenByParent и полному flatRows, а не по "
    "видимым displayRows."
)


def _ensure_object_table_selection_tree_toggle_ux_dashboard_notes(
    db: Session,
    *,
    initiated_by_user_id: int | None,
    initiated_by_name: str | None,
) -> tuple[int, list[str]]:
    added = 0
    journal_lines: list[str] = []

    if _add_activity(
        db,
        slug=OBJECT_TABLE_SELECTION_TREE_TOGGLE_UX_CHANGELOG_SLUG,
        title="Object Table: раскрытие дерева в колонке чекбокса",
        description=_OBJECT_TABLE_SELECTION_TREE_TOGGLE_UX_CHANGELOG_DESCRIPTION,
        result=_OBJECT_TABLE_SELECTION_TREE_TOGGLE_UX_CHANGELOG_DESCRIPTION,
        activity_type=PlatformActivityType.MILESTONE.value,
        related_stage_id=None,
        initiated_by_user_id=initiated_by_user_id,
        initiated_by_name=initiated_by_name,
    ):
        added += 1
        journal_lines.append(_OBJECT_TABLE_SELECTION_TREE_TOGGLE_UX_CHANGELOG_DESCRIPTION)

    return added, journal_lines


def _ensure_object_table_selection_tree_expand_all_fix_dashboard_notes(
    db: Session,
    *,
    initiated_by_user_id: int | None,
    initiated_by_name: str | None,
) -> tuple[int, list[str]]:
    added = 0
    journal_lines: list[str] = []

    if _add_activity(
        db,
        slug=OBJECT_TABLE_SELECTION_TREE_EXPAND_ALL_FIX_CHANGELOG_SLUG,
        title="Bugfix: Object Table — глобальное раскрытие дерева",
        description=_OBJECT_TABLE_SELECTION_TREE_EXPAND_ALL_FIX_CHANGELOG_DESCRIPTION,
        result=_OBJECT_TABLE_SELECTION_TREE_EXPAND_ALL_FIX_CHANGELOG_DESCRIPTION,
        activity_type=PlatformActivityType.MILESTONE.value,
        related_stage_id=None,
        initiated_by_user_id=initiated_by_user_id,
        initiated_by_name=initiated_by_name,
    ):
        added += 1
        journal_lines.append(
            _OBJECT_TABLE_SELECTION_TREE_EXPAND_ALL_FIX_CHANGELOG_DESCRIPTION
        )

    return added, journal_lines


OBJECT_TABLE_EXCEL_EXPORT_HIERARCHY_COLUMN_UX_CHANGELOG_SLUG = (
    "object-table-excel-export-hierarchy-column-ux-20260606"
)

_OBJECT_TABLE_EXCEL_EXPORT_HIERARCHY_COLUMN_UX_CHANGELOG_DESCRIPTION = (
    "Excel Export: колонка иерархии переименована в «Иерархия» и размещена после «№» "
    "(порядок: № → Иерархия → название); расчёт hierarchyNumber без изменений."
)


def _ensure_object_table_excel_export_hierarchy_column_ux_dashboard_notes(
    db: Session,
    *,
    initiated_by_user_id: int | None,
    initiated_by_name: str | None,
) -> tuple[int, list[str]]:
    stage = (
        db.query(PlatformImplementationStage)
        .filter(PlatformImplementationStage.slug == "object-table-ut-parity")
        .one_or_none()
    )
    related_stage_id = stage.id if stage is not None else None
    added = 0
    journal_lines: list[str] = []

    if _add_activity(
        db,
        slug=OBJECT_TABLE_EXCEL_EXPORT_HIERARCHY_COLUMN_UX_CHANGELOG_SLUG,
        title="Excel Export: колонка «Иерархия» после «№»",
        description=_OBJECT_TABLE_EXCEL_EXPORT_HIERARCHY_COLUMN_UX_CHANGELOG_DESCRIPTION,
        result=_OBJECT_TABLE_EXCEL_EXPORT_HIERARCHY_COLUMN_UX_CHANGELOG_DESCRIPTION,
        activity_type=PlatformActivityType.MILESTONE.value,
        related_stage_id=related_stage_id,
        initiated_by_user_id=initiated_by_user_id,
        initiated_by_name=initiated_by_name,
    ):
        added += 1
        journal_lines.append(
            _OBJECT_TABLE_EXCEL_EXPORT_HIERARCHY_COLUMN_UX_CHANGELOG_DESCRIPTION
        )

    return added, journal_lines


OBJECT_TABLE_EXCEL_EXPORT_HIERARCHY_LABELS_CHANGELOG_SLUG = (
    "object-table-excel-export-hierarchy-labels-20260606"
)

_OBJECT_TABLE_EXCEL_EXPORT_HIERARCHY_LABELS_CHANGELOG_DESCRIPTION = (
    "Excel Export: tree order и колонка «Иерархический №» через "
    "buildObjectTableHierarchyDisplayRows (все узлы, включая свёрнутые); "
    "списки и статусы экспортируются как label из settings_json.options."
)


def _ensure_object_table_excel_export_hierarchy_labels_dashboard_notes(
    db: Session,
    *,
    initiated_by_user_id: int | None,
    initiated_by_name: str | None,
) -> tuple[int, list[str]]:
    stage = (
        db.query(PlatformImplementationStage)
        .filter(PlatformImplementationStage.slug == "object-table-ut-parity")
        .one_or_none()
    )
    related_stage_id = stage.id if stage is not None else None
    added = 0
    journal_lines: list[str] = []

    if _add_activity(
        db,
        slug=OBJECT_TABLE_EXCEL_EXPORT_HIERARCHY_LABELS_CHANGELOG_SLUG,
        title="Excel Export: иерархия и label для списков/статусов",
        description=_OBJECT_TABLE_EXCEL_EXPORT_HIERARCHY_LABELS_CHANGELOG_DESCRIPTION,
        result=_OBJECT_TABLE_EXCEL_EXPORT_HIERARCHY_LABELS_CHANGELOG_DESCRIPTION,
        activity_type=PlatformActivityType.MILESTONE.value,
        related_stage_id=related_stage_id,
        initiated_by_user_id=initiated_by_user_id,
        initiated_by_name=initiated_by_name,
    ):
        added += 1
        journal_lines.append(
            _OBJECT_TABLE_EXCEL_EXPORT_HIERARCHY_LABELS_CHANGELOG_DESCRIPTION
        )

    return added, journal_lines


OBJECT_TABLE_EXCEL_EXPORT_FIX_CHANGELOG_SLUG = (
    "object-table-excel-export-fix-changelog-20260606"
)

_OBJECT_TABLE_EXCEL_EXPORT_FIX_CHANGELOG_DESCRIPTION = (
    "Исправлен Excel Export: пагинация экспорта ограничена лимитом Runtime API (200), "
    "сортировка маппится через тот же mapper, что и Object Table; при 422 на sort — "
    "безопасный fallback без сортировки с console.warn."
)


def _ensure_object_table_excel_export_fix_dashboard_notes(
    db: Session,
    *,
    initiated_by_user_id: int | None,
    initiated_by_name: str | None,
) -> tuple[int, list[str]]:
    stage = (
        db.query(PlatformImplementationStage)
        .filter(PlatformImplementationStage.slug == "object-table-ut-parity")
        .one_or_none()
    )
    related_stage_id = stage.id if stage is not None else None
    added = 0
    journal_lines: list[str] = []

    if _add_activity(
        db,
        slug=OBJECT_TABLE_EXCEL_EXPORT_FIX_CHANGELOG_SLUG,
        title="Bugfix: Excel Export — Runtime query 422",
        description=_OBJECT_TABLE_EXCEL_EXPORT_FIX_CHANGELOG_DESCRIPTION,
        result=_OBJECT_TABLE_EXCEL_EXPORT_FIX_CHANGELOG_DESCRIPTION,
        activity_type=PlatformActivityType.MILESTONE.value,
        related_stage_id=related_stage_id,
        initiated_by_user_id=initiated_by_user_id,
        initiated_by_name=initiated_by_name,
    ):
        added += 1
        journal_lines.append(_OBJECT_TABLE_EXCEL_EXPORT_FIX_CHANGELOG_DESCRIPTION)

    return added, journal_lines


OBJECT_TABLE_EXCEL_IMPORT_HISTORY_SLUG = (
    "object-table-excel-import-20260606"
)
OBJECT_TABLE_EXCEL_IMPORT_CHANGELOG_SLUG = (
    "object-table-excel-import-changelog-20260606"
)

_OBJECT_TABLE_EXCEL_IMPORT_HISTORY_DESCRIPTION = (
    "Object Platform: MVP-импорт Excel из контекстного меню объекта — создание "
    "новых записей через runtime_entity/runtime_entity_values, мастер из 4 шагов "
    "(файл, сопоставление, проверка, результат), chunk create по 50 строк."
)

_OBJECT_TABLE_EXCEL_IMPORT_CHANGELOG_DESCRIPTION = (
    "Импорт Excel запускается через «Название объекта ▾ → Импорт Excel» только в "
    "Office; PlatformModal-мастер читает .xlsx, сопоставляет колонки с полями "
    "объекта, валидирует строки и создаёт записи через runtimeWriteGateway.createEntity."
)


def _ensure_object_table_excel_import_dashboard_notes(
    db: Session,
    *,
    initiated_by_user_id: int | None,
    initiated_by_name: str | None,
) -> tuple[int, list[str]]:
    stage = (
        db.query(PlatformImplementationStage)
        .filter(PlatformImplementationStage.slug == "object-table-ut-parity")
        .one_or_none()
    )
    related_stage_id = stage.id if stage is not None else None
    added = 0
    journal_lines: list[str] = []

    if _add_activity(
        db,
        slug=OBJECT_TABLE_EXCEL_IMPORT_HISTORY_SLUG,
        title="Object Platform: импорт Excel (MVP)",
        description=_OBJECT_TABLE_EXCEL_IMPORT_HISTORY_DESCRIPTION,
        result=_OBJECT_TABLE_EXCEL_IMPORT_CHANGELOG_DESCRIPTION,
        activity_type=PlatformActivityType.MILESTONE.value,
        related_stage_id=related_stage_id,
        initiated_by_user_id=initiated_by_user_id,
        initiated_by_name=initiated_by_name,
    ):
        added += 1

    if _add_activity(
        db,
        slug=OBJECT_TABLE_EXCEL_IMPORT_CHANGELOG_SLUG,
        title="Журнал изменений: импорт Excel Object Table",
        description=_OBJECT_TABLE_EXCEL_IMPORT_CHANGELOG_DESCRIPTION,
        result=_OBJECT_TABLE_EXCEL_IMPORT_CHANGELOG_DESCRIPTION,
        activity_type=PlatformActivityType.MILESTONE.value,
        related_stage_id=related_stage_id,
        initiated_by_user_id=initiated_by_user_id,
        initiated_by_name=initiated_by_name,
    ):
        added += 1
        journal_lines.append(_OBJECT_TABLE_EXCEL_IMPORT_CHANGELOG_DESCRIPTION)

    return added, journal_lines


OBJECT_TABLE_EXCEL_IMPORT_WIZARD_UX_CHANGELOG_SLUG = (
    "object-table-excel-import-wizard-ux-20260606"
)

_OBJECT_TABLE_EXCEL_IMPORT_WIZARD_UX_CHANGELOG_DESCRIPTION = (
    "Excel Import: шаг «Файл» оформлен как мастер — индикатор 4 шагов, drag-and-drop "
    "зона загрузки, карточка файла, статистика листа, badge-колонки и активная кнопка "
    "«Далее →»; PlatformModal с сохранением drag/resize."
)


def _ensure_object_table_excel_import_wizard_ux_dashboard_notes(
    db: Session,
    *,
    initiated_by_user_id: int | None,
    initiated_by_name: str | None,
) -> tuple[int, list[str]]:
    stage = (
        db.query(PlatformImplementationStage)
        .filter(PlatformImplementationStage.slug == "object-table-ut-parity")
        .one_or_none()
    )
    related_stage_id = stage.id if stage is not None else None
    added = 0
    journal_lines: list[str] = []

    if _add_activity(
        db,
        slug=OBJECT_TABLE_EXCEL_IMPORT_WIZARD_UX_CHANGELOG_SLUG,
        title="Excel Import: UX мастера (шаг «Файл»)",
        description=_OBJECT_TABLE_EXCEL_IMPORT_WIZARD_UX_CHANGELOG_DESCRIPTION,
        result=_OBJECT_TABLE_EXCEL_IMPORT_WIZARD_UX_CHANGELOG_DESCRIPTION,
        activity_type=PlatformActivityType.MILESTONE.value,
        related_stage_id=related_stage_id,
        initiated_by_user_id=initiated_by_user_id,
        initiated_by_name=initiated_by_name,
    ):
        added += 1
        journal_lines.append(_OBJECT_TABLE_EXCEL_IMPORT_WIZARD_UX_CHANGELOG_DESCRIPTION)

    return added, journal_lines


OBJECT_TABLE_EXCEL_IMPORT_WIZARD_COMPACT_UX_CHANGELOG_SLUG = (
    "object-table-excel-import-wizard-compact-ux-20260606"
)

_OBJECT_TABLE_EXCEL_IMPORT_WIZARD_COMPACT_UX_CHANGELOG_DESCRIPTION = (
    "Excel Import: компактный шаг «Файл» — уменьшена высота модалки и dropzone, "
    "иконка FileSpreadsheet, подсказка .xlsx, карточка файла, badge-колонки, "
    "платформенные кнопки «Выбрать файл» / «Далее →» (без designer-btn в Office)."
)


def _ensure_object_table_excel_import_wizard_compact_ux_dashboard_notes(
    db: Session,
    *,
    initiated_by_user_id: int | None,
    initiated_by_name: str | None,
) -> tuple[int, list[str]]:
    stage = (
        db.query(PlatformImplementationStage)
        .filter(PlatformImplementationStage.slug == "object-table-ut-parity")
        .one_or_none()
    )
    related_stage_id = stage.id if stage is not None else None
    added = 0
    journal_lines: list[str] = []

    if _add_activity(
        db,
        slug=OBJECT_TABLE_EXCEL_IMPORT_WIZARD_COMPACT_UX_CHANGELOG_SLUG,
        title="Excel Import: компактный UX шага «Файл»",
        description=_OBJECT_TABLE_EXCEL_IMPORT_WIZARD_COMPACT_UX_CHANGELOG_DESCRIPTION,
        result=_OBJECT_TABLE_EXCEL_IMPORT_WIZARD_COMPACT_UX_CHANGELOG_DESCRIPTION,
        activity_type=PlatformActivityType.MILESTONE.value,
        related_stage_id=related_stage_id,
        initiated_by_user_id=initiated_by_user_id,
        initiated_by_name=initiated_by_name,
    ):
        added += 1
        journal_lines.append(
            _OBJECT_TABLE_EXCEL_IMPORT_WIZARD_COMPACT_UX_CHANGELOG_DESCRIPTION
        )

    return added, journal_lines


OBJECT_TABLE_EXCEL_IMPORT_WIZARD_CLEAN_UX_CHANGELOG_SLUG = (
    "object-table-excel-import-wizard-clean-ux-20260606"
)

_OBJECT_TABLE_EXCEL_IMPORT_WIZARD_CLEAN_UX_CHANGELOG_DESCRIPTION = (
    "Excel Import: чистый шаг «Файл» — компактная шапка (Импорт Excel / объект), "
    "stepper ①–④ сразу под заголовком, уменьшенная dropzone, кнопки [Отмена][Далее →] "
    "справа; уведомление о .xlsx только при неверном формате файла."
)


def _ensure_object_table_excel_import_wizard_clean_ux_dashboard_notes(
    db: Session,
    *,
    initiated_by_user_id: int | None,
    initiated_by_name: str | None,
) -> tuple[int, list[str]]:
    stage = (
        db.query(PlatformImplementationStage)
        .filter(PlatformImplementationStage.slug == "object-table-ut-parity")
        .one_or_none()
    )
    related_stage_id = stage.id if stage is not None else None
    added = 0
    journal_lines: list[str] = []

    if _add_activity(
        db,
        slug=OBJECT_TABLE_EXCEL_IMPORT_WIZARD_CLEAN_UX_CHANGELOG_SLUG,
        title="Excel Import: чистый UX шага «Файл»",
        description=_OBJECT_TABLE_EXCEL_IMPORT_WIZARD_CLEAN_UX_CHANGELOG_DESCRIPTION,
        result=_OBJECT_TABLE_EXCEL_IMPORT_WIZARD_CLEAN_UX_CHANGELOG_DESCRIPTION,
        activity_type=PlatformActivityType.MILESTONE.value,
        related_stage_id=related_stage_id,
        initiated_by_user_id=initiated_by_user_id,
        initiated_by_name=initiated_by_name,
    ):
        added += 1
        journal_lines.append(
            _OBJECT_TABLE_EXCEL_IMPORT_WIZARD_CLEAN_UX_CHANGELOG_DESCRIPTION
        )

    return added, journal_lines


OBJECT_TABLE_EXCEL_IMPORT_VALUE_MAPPING_CHANGELOG_SLUG = (
    "object-table-excel-import-value-mapping-20260606"
)

_OBJECT_TABLE_EXCEL_IMPORT_VALUE_MAPPING_CHANGELOG_DESCRIPTION = (
    "Excel Import: шаг «Сопоставление значений» для статусов, списков и пользователей — "
    "ручное сопоставление нераспознанных Excel-значений с автопропуском при точном match; "
    "валидация повторно учитывает правила перед импортом."
)


def _ensure_object_table_excel_import_value_mapping_dashboard_notes(
    db: Session,
    *,
    initiated_by_user_id: int | None,
    initiated_by_name: str | None,
) -> tuple[int, list[str]]:
    stage = (
        db.query(PlatformImplementationStage)
        .filter(PlatformImplementationStage.slug == "object-table-ut-parity")
        .one_or_none()
    )
    related_stage_id = stage.id if stage is not None else None
    added = 0
    journal_lines: list[str] = []

    if _add_activity(
        db,
        slug=OBJECT_TABLE_EXCEL_IMPORT_VALUE_MAPPING_CHANGELOG_SLUG,
        title="Excel Import: сопоставление значений",
        description=_OBJECT_TABLE_EXCEL_IMPORT_VALUE_MAPPING_CHANGELOG_DESCRIPTION,
        result=_OBJECT_TABLE_EXCEL_IMPORT_VALUE_MAPPING_CHANGELOG_DESCRIPTION,
        activity_type=PlatformActivityType.MILESTONE.value,
        related_stage_id=related_stage_id,
        initiated_by_user_id=initiated_by_user_id,
        initiated_by_name=initiated_by_name,
    ):
        added += 1
        journal_lines.append(_OBJECT_TABLE_EXCEL_IMPORT_VALUE_MAPPING_CHANGELOG_DESCRIPTION)

    return added, journal_lines


OBJECT_TABLE_EXCEL_IMPORT_DEFAULT_VALUES_FIX_CHANGELOG_SLUG = (
    "object-table-excel-import-default-values-fix-20260606"
)

_OBJECT_TABLE_EXCEL_IMPORT_DEFAULT_VALUES_FIX_CHANGELOG_DESCRIPTION = (
    "Excel Import fix: default values для обязательных полей без колонки Excel — "
    "«Текущий пользователь», сохранение правил между шагами, применение при "
    "валидации/импорте, select колонки и предупреждения на шаге «Колонки»."
)


def _ensure_object_table_excel_import_default_values_fix_dashboard_notes(
    db: Session,
    *,
    initiated_by_user_id: int | None,
    initiated_by_name: str | None,
) -> tuple[int, list[str]]:
    stage = (
        db.query(PlatformImplementationStage)
        .filter(PlatformImplementationStage.slug == "object-table-ut-parity")
        .one_or_none()
    )
    related_stage_id = stage.id if stage is not None else None
    added = 0
    journal_lines: list[str] = []

    if _add_activity(
        db,
        slug=OBJECT_TABLE_EXCEL_IMPORT_DEFAULT_VALUES_FIX_CHANGELOG_SLUG,
        title="Excel Import: fix default values обязательных полей",
        description=_OBJECT_TABLE_EXCEL_IMPORT_DEFAULT_VALUES_FIX_CHANGELOG_DESCRIPTION,
        result=_OBJECT_TABLE_EXCEL_IMPORT_DEFAULT_VALUES_FIX_CHANGELOG_DESCRIPTION,
        activity_type=PlatformActivityType.MILESTONE.value,
        related_stage_id=related_stage_id,
        initiated_by_user_id=initiated_by_user_id,
        initiated_by_name=initiated_by_name,
    ):
        added += 1
        journal_lines.append(
            _OBJECT_TABLE_EXCEL_IMPORT_DEFAULT_VALUES_FIX_CHANGELOG_DESCRIPTION
        )

    return added, journal_lines


OBJECT_TABLE_EXCEL_IMPORT_DEFAULT_VALUES_CHANGELOG_SLUG = (
    "object-table-excel-import-default-values-20260606"
)

CREATE_FIELD_MODAL_DEFAULT_VALUE_CHANGELOG_SLUG = (
    "create-field-modal-default-value-20260607"
)

_CREATE_FIELD_MODAL_DEFAULT_VALUE_CHANGELOG_DESCRIPTION = (
    "Create Field Modal: секция «Значение по умолчанию» при создании поля — "
    "переиспользован DefaultValueEditor, default_value_json сохраняется сразу; "
    "Studio → Object Type → Fields → Добавить поле."
)


def _ensure_create_field_modal_default_value_dashboard_notes(
    db: Session,
    *,
    initiated_by_user_id: int | None,
    initiated_by_name: str | None,
) -> tuple[int, list[str]]:
    stage = (
        db.query(PlatformImplementationStage)
        .filter(PlatformImplementationStage.slug == "designer-foundation")
        .one_or_none()
    )
    related_stage_id = stage.id if stage is not None else None
    added = 0
    journal_lines: list[str] = []

    if _add_activity(
        db,
        slug=CREATE_FIELD_MODAL_DEFAULT_VALUE_CHANGELOG_SLUG,
        title="Create Field Modal: default value при создании поля",
        description=_CREATE_FIELD_MODAL_DEFAULT_VALUE_CHANGELOG_DESCRIPTION,
        result=_CREATE_FIELD_MODAL_DEFAULT_VALUE_CHANGELOG_DESCRIPTION,
        activity_type=PlatformActivityType.MILESTONE.value,
        related_stage_id=related_stage_id,
        initiated_by_user_id=initiated_by_user_id,
        initiated_by_name=initiated_by_name,
    ):
        added += 1
        journal_lines.append(_CREATE_FIELD_MODAL_DEFAULT_VALUE_CHANGELOG_DESCRIPTION)

    return added, journal_lines


PLATFORM_MODAL_FOOTER_LAYOUT_CHANGELOG_SLUG = "platform-modal-footer-layout-20260607"

_PLATFORM_MODAL_FOOTER_LAYOUT_CHANGELOG_DESCRIPTION = (
    "PlatformModal footer layout: body scroll отделён от footer, footer всегда видим "
    "(z-index, flex-shrink 0), resize-handles не перекрывают кнопки, minWidth для footer-safe "
    "модалок; общий CSS platform-modal-footer для кнопок Справка/Отмена/Создать."
)


def _ensure_platform_modal_footer_layout_dashboard_notes(
    db: Session,
    *,
    initiated_by_user_id: int | None,
    initiated_by_name: str | None,
) -> tuple[int, list[str]]:
    stage = (
        db.query(PlatformImplementationStage)
        .filter(PlatformImplementationStage.slug == "designer-foundation")
        .one_or_none()
    )
    related_stage_id = stage.id if stage is not None else None
    added = 0
    journal_lines: list[str] = []

    if _add_activity(
        db,
        slug=PLATFORM_MODAL_FOOTER_LAYOUT_CHANGELOG_SLUG,
        title="PlatformModal: footer layout и footer-safe minWidth",
        description=_PLATFORM_MODAL_FOOTER_LAYOUT_CHANGELOG_DESCRIPTION,
        result=_PLATFORM_MODAL_FOOTER_LAYOUT_CHANGELOG_DESCRIPTION,
        activity_type=PlatformActivityType.MILESTONE.value,
        related_stage_id=related_stage_id,
        initiated_by_user_id=initiated_by_user_id,
        initiated_by_name=initiated_by_name,
    ):
        added += 1
        journal_lines.append(_PLATFORM_MODAL_FOOTER_LAYOUT_CHANGELOG_DESCRIPTION)

    return added, journal_lines


OFFICE_OBJECT_RECORD_CREATE_MODAL_RESIZE_CHANGELOG_SLUG = (
    "office-object-record-create-modal-resize-20260607"
)

_OFFICE_OBJECT_RECORD_CREATE_MODAL_RESIZE_CHANGELOG_DESCRIPTION = (
    "Office «Новая запись»: PlatformQuickCreateForm с canCustomizeLayout, "
    "resize-handles в углу модалки, platform-modal-footer без negative margin, "
    "persist key office.objectRecord.create.{objectTypeKey}."
)


def _ensure_office_object_record_create_modal_resize_dashboard_notes(
    db: Session,
    *,
    initiated_by_user_id: int | None,
    initiated_by_name: str | None,
) -> tuple[int, list[str]]:
    stage = (
        db.query(PlatformImplementationStage)
        .filter(PlatformImplementationStage.slug == "designer-foundation")
        .one_or_none()
    )
    related_stage_id = stage.id if stage is not None else None
    added = 0
    journal_lines: list[str] = []

    if _add_activity(
        db,
        slug=OFFICE_OBJECT_RECORD_CREATE_MODAL_RESIZE_CHANGELOG_SLUG,
        title="Office Quick Create: resize модалки «Новая запись»",
        description=_OFFICE_OBJECT_RECORD_CREATE_MODAL_RESIZE_CHANGELOG_DESCRIPTION,
        result=_OFFICE_OBJECT_RECORD_CREATE_MODAL_RESIZE_CHANGELOG_DESCRIPTION,
        activity_type=PlatformActivityType.MILESTONE.value,
        related_stage_id=related_stage_id,
        initiated_by_user_id=initiated_by_user_id,
        initiated_by_name=initiated_by_name,
    ):
        added += 1
        journal_lines.append(_OFFICE_OBJECT_RECORD_CREATE_MODAL_RESIZE_CHANGELOG_DESCRIPTION)

    return added, journal_lines


PLATFORM_MODAL_MIN_WIDTH_300_CHANGELOG_SLUG = "platform-modal-min-width-300-20260607"

_PLATFORM_MODAL_MIN_WIDTH_300_CHANGELOG_DESCRIPTION = (
    "PlatformModal minWidth снижен до 300px (standard и compact); footer кнопки адаптируются "
    "(flex-wrap, min-width 88px); сохранённые большие размеры не затронуты."
)


def _ensure_platform_modal_min_width_300_dashboard_notes(
    db: Session,
    *,
    initiated_by_user_id: int | None,
    initiated_by_name: str | None,
) -> tuple[int, list[str]]:
    stage = (
        db.query(PlatformImplementationStage)
        .filter(PlatformImplementationStage.slug == "designer-foundation")
        .one_or_none()
    )
    related_stage_id = stage.id if stage is not None else None
    added = 0
    journal_lines: list[str] = []

    if _add_activity(
        db,
        slug=PLATFORM_MODAL_MIN_WIDTH_300_CHANGELOG_SLUG,
        title="PlatformModal: minWidth 300px",
        description=_PLATFORM_MODAL_MIN_WIDTH_300_CHANGELOG_DESCRIPTION,
        result=_PLATFORM_MODAL_MIN_WIDTH_300_CHANGELOG_DESCRIPTION,
        activity_type=PlatformActivityType.MILESTONE.value,
        related_stage_id=related_stage_id,
        initiated_by_user_id=initiated_by_user_id,
        initiated_by_name=initiated_by_name,
    ):
        added += 1
        journal_lines.append(_PLATFORM_MODAL_MIN_WIDTH_300_CHANGELOG_DESCRIPTION)

    return added, journal_lines


PLATFORM_MODAL_STANDARD_MIN_WIDTH_CHANGELOG_SLUG = "platform-modal-standard-min-width-520-20260607"

_PLATFORM_MODAL_STANDARD_MIN_WIDTH_CHANGELOG_DESCRIPTION = (
    "PlatformModal standard minWidth 520px (эталон Office «Новая запись»); "
    "layoutPreset standard|compact; viewport clamp; compact delete modals сохраняют малый размер."
)


def _ensure_platform_modal_standard_min_width_dashboard_notes(
    db: Session,
    *,
    initiated_by_user_id: int | None,
    initiated_by_name: str | None,
) -> tuple[int, list[str]]:
    stage = (
        db.query(PlatformImplementationStage)
        .filter(PlatformImplementationStage.slug == "designer-foundation")
        .one_or_none()
    )
    related_stage_id = stage.id if stage is not None else None
    added = 0
    journal_lines: list[str] = []

    if _add_activity(
        db,
        slug=PLATFORM_MODAL_STANDARD_MIN_WIDTH_CHANGELOG_SLUG,
        title="PlatformModal: единый minWidth 520px для рабочих модалок",
        description=_PLATFORM_MODAL_STANDARD_MIN_WIDTH_CHANGELOG_DESCRIPTION,
        result=_PLATFORM_MODAL_STANDARD_MIN_WIDTH_CHANGELOG_DESCRIPTION,
        activity_type=PlatformActivityType.MILESTONE.value,
        related_stage_id=related_stage_id,
        initiated_by_user_id=initiated_by_user_id,
        initiated_by_name=initiated_by_name,
    ):
        added += 1
        journal_lines.append(_PLATFORM_MODAL_STANDARD_MIN_WIDTH_CHANGELOG_DESCRIPTION)

    return added, journal_lines


PLATFORM_MODAL_RESIZE_REGRESSION_CHANGELOG_SLUG = "platform-modal-resize-handles-zindex-20260607"

_PLATFORM_MODAL_RESIZE_REGRESSION_CHANGELOG_DESCRIPTION = (
    "PlatformModal resize regression fix: footer z-index больше не перекрывает "
    "resize-handles (E/S/SE); data-platform-modal-resize-handle; persist bounds без регрессии footer."
)


def _ensure_platform_modal_resize_regression_dashboard_notes(
    db: Session,
    *,
    initiated_by_user_id: int | None,
    initiated_by_name: str | None,
) -> tuple[int, list[str]]:
    stage = (
        db.query(PlatformImplementationStage)
        .filter(PlatformImplementationStage.slug == "designer-foundation")
        .one_or_none()
    )
    related_stage_id = stage.id if stage is not None else None
    added = 0
    journal_lines: list[str] = []

    if _add_activity(
        db,
        slug=PLATFORM_MODAL_RESIZE_REGRESSION_CHANGELOG_SLUG,
        title="PlatformModal: восстановлен resize после footer layout",
        description=_PLATFORM_MODAL_RESIZE_REGRESSION_CHANGELOG_DESCRIPTION,
        result=_PLATFORM_MODAL_RESIZE_REGRESSION_CHANGELOG_DESCRIPTION,
        activity_type=PlatformActivityType.MILESTONE.value,
        related_stage_id=related_stage_id,
        initiated_by_user_id=initiated_by_user_id,
        initiated_by_name=initiated_by_name,
    ):
        added += 1
        journal_lines.append(_PLATFORM_MODAL_RESIZE_REGRESSION_CHANGELOG_DESCRIPTION)

    return added, journal_lines


PLATFORM_QUICK_CREATE_OFFICE_ACCENT_CHANGELOG_SLUG = "platform-quick-create-office-accent-20260607"

_PLATFORM_QUICK_CREATE_OFFICE_ACCENT_CHANGELOG_DESCRIPTION = (
    "Office Quick Create «Новая запись»: primary-кнопка наследует --platform-accent (blue) "
    "через data-platform-zone на PlatformModal; убран хардкод Studio purple #7c3aed."
)


def _ensure_platform_quick_create_office_accent_dashboard_notes(
    db: Session,
    *,
    initiated_by_user_id: int | None,
    initiated_by_name: str | None,
) -> tuple[int, list[str]]:
    stage = (
        db.query(PlatformImplementationStage)
        .filter(PlatformImplementationStage.slug == "designer-foundation")
        .one_or_none()
    )
    related_stage_id = stage.id if stage is not None else None
    added = 0
    journal_lines: list[str] = []

    if _add_activity(
        db,
        slug=PLATFORM_QUICK_CREATE_OFFICE_ACCENT_CHANGELOG_SLUG,
        title="Office Quick Create: синий accent primary-кнопки",
        description=_PLATFORM_QUICK_CREATE_OFFICE_ACCENT_CHANGELOG_DESCRIPTION,
        result=_PLATFORM_QUICK_CREATE_OFFICE_ACCENT_CHANGELOG_DESCRIPTION,
        activity_type=PlatformActivityType.MILESTONE.value,
        related_stage_id=related_stage_id,
        initiated_by_user_id=initiated_by_user_id,
        initiated_by_name=initiated_by_name,
    ):
        added += 1
        journal_lines.append(_PLATFORM_QUICK_CREATE_OFFICE_ACCENT_CHANGELOG_DESCRIPTION)

    return added, journal_lines


PLAN_VIEW_RENDERER_ROUTING_CHANGELOG_SLUG = "plan-view-renderer-routing-preview-office-20260607"

_PLAN_VIEW_RENDERER_ROUTING_CHANGELOG_DESCRIPTION = (
    "Plan view renderer: resolveActiveObjectTabView для plan/table; Studio Preview передаёт viewType; "
    "Office query limit ≤200; PlanViewEmptyState вместо fallback table и validation error."
)


def _ensure_plan_view_renderer_routing_dashboard_notes(
    db: Session,
    *,
    initiated_by_user_id: int | None,
    initiated_by_name: str | None,
) -> tuple[int, list[str]]:
    stage = (
        db.query(PlatformImplementationStage)
        .filter(PlatformImplementationStage.slug == "designer-foundation")
        .one_or_none()
    )
    related_stage_id = stage.id if stage is not None else None
    added = 0
    journal_lines: list[str] = []

    if _add_activity(
        db,
        slug=PLAN_VIEW_RENDERER_ROUTING_CHANGELOG_SLUG,
        title="Plan view: единый renderer в Preview и Office",
        description=_PLAN_VIEW_RENDERER_ROUTING_CHANGELOG_DESCRIPTION,
        result=_PLAN_VIEW_RENDERER_ROUTING_CHANGELOG_DESCRIPTION,
        activity_type=PlatformActivityType.MILESTONE.value,
        related_stage_id=related_stage_id,
        initiated_by_user_id=initiated_by_user_id,
        initiated_by_name=initiated_by_name,
    ):
        added += 1
        journal_lines.append(_PLAN_VIEW_RENDERER_ROUTING_CHANGELOG_DESCRIPTION)

    return added, journal_lines


FIELD_PLACEHOLDER_SUPPORT_CHANGELOG_SLUG = "field-placeholder-support-20260607"

_FIELD_PLACEHOLDER_SUPPORT_CHANGELOG_DESCRIPTION = (
    "Field placeholder support added: field hints can now be configured in Studio "
    "and displayed in create/edit forms and runtime inputs."
)


CUSTOMER_COMPANIES_MVP_CHANGELOG_SLUG = "control-plane-customer-companies-mvp-20260609"

_CUSTOMER_COMPANIES_MVP_CHANGELOG_DESCRIPTION = (
    "Добавлена MVP-модель клиентских компаний customer_companies: таблица, CRUD API "
    "/control-plane/customer-companies, связь CustomerCompany → Portal; "
    "UI/архитектура: Управление платформой → Клиенты."
)


TENANT_MANAGEMENT_UI_CHANGELOG_SLUG = "control-plane-tenant-management-ui-20260609"

_TENANT_MANAGEMENT_UI_CHANGELOG_DESCRIPTION = (
    "Tenant Management UI: раздел Управление платформой → Тенанты — список portals, "
    "создание tenant через POST /portals/, карточка tenant и действие «Открыть tenant» "
    "(/portal/{id}). Временный инструмент платформенной администрации."
)


TENANT_CONTEXT_NAVIGATION_CHANGELOG_SLUG = (
    "control-plane-tenant-context-navigation-20260609"
)

_TENANT_CONTEXT_NAVIGATION_CHANGELOG_DESCRIPTION = (
    "Tenant Context Fix: левое меню Office runtime сохраняет текущий portalId из URL "
    "(/portal/:portalId) — переписывание устаревших /portal/1 путей в navigation tree "
    "и в обработчиках sidebar (PortalLayout, PortalPageView, workspace/object/library runtime)."
)


def _ensure_tenant_context_navigation_dashboard_notes(
    db: Session,
    *,
    initiated_by_user_id: int | None,
    initiated_by_name: str | None,
) -> tuple[int, list[str]]:
    component = (
        db.query(PlatformComponent)
        .filter(PlatformComponent.slug == "control-plane")
        .one_or_none()
    )
    related_component_id = component.id if component is not None else None
    added = 0
    journal_lines: list[str] = []

    if _add_activity(
        db,
        slug=TENANT_CONTEXT_NAVIGATION_CHANGELOG_SLUG,
        title="Tenant Context Fix",
        description=_TENANT_CONTEXT_NAVIGATION_CHANGELOG_DESCRIPTION,
        result=_TENANT_CONTEXT_NAVIGATION_CHANGELOG_DESCRIPTION,
        activity_type=PlatformActivityType.MILESTONE.value,
        related_component_id=related_component_id,
        initiated_by_user_id=initiated_by_user_id,
        initiated_by_name=initiated_by_name,
        meta={"ui_location": "Office runtime → левое меню"},
    ):
        added += 1
        journal_lines.append(_TENANT_CONTEXT_NAVIGATION_CHANGELOG_DESCRIPTION)

    return added, journal_lines


TENANT_STRUCTURE_CLONE_MVP_CHANGELOG_SLUG = (
    "control-plane-tenant-structure-clone-mvp-20260609"
)

_TENANT_STRUCTURE_CLONE_MVP_CHANGELOG_DESCRIPTION = (
    "Tenant Structure Clone MVP: сервис clone_tenant_structure копирует структуру Platform Template "
    "tenant 2 в новый portal — pages, navigation, designer object catalog, workspaces, "
    "actions; без runtime data; publish_tenant_catalog после clone. UI: Студия → "
    "Администрирование → Тенанты — автоклонирование при создании."
)


def _ensure_tenant_structure_clone_mvp_dashboard_notes(
    db: Session,
    *,
    initiated_by_user_id: int | None,
    initiated_by_name: str | None,
) -> tuple[int, list[str]]:
    component = (
        db.query(PlatformComponent)
        .filter(PlatformComponent.slug == "control-plane")
        .one_or_none()
    )
    related_component_id = component.id if component is not None else None
    added = 0
    journal_lines: list[str] = []

    if _add_activity(
        db,
        slug=TENANT_STRUCTURE_CLONE_MVP_CHANGELOG_SLUG,
        title="Tenant Structure Clone MVP",
        description=_TENANT_STRUCTURE_CLONE_MVP_CHANGELOG_DESCRIPTION,
        result=_TENANT_STRUCTURE_CLONE_MVP_CHANGELOG_DESCRIPTION,
        activity_type=PlatformActivityType.MILESTONE.value,
        related_component_id=related_component_id,
        initiated_by_user_id=initiated_by_user_id,
        initiated_by_name=initiated_by_name,
        meta={"ui_location": "Студия → Администрирование → Тенанты"},
    ):
        added += 1
        journal_lines.append(_TENANT_STRUCTURE_CLONE_MVP_CHANGELOG_DESCRIPTION)

    return added, journal_lines


BOOTSTRAP_SOURCE_PLATFORM_TEMPLATE_CHANGELOG_SLUG = (
    "control-plane-bootstrap-source-platform-template-20260610"
)

_BOOTSTRAP_SOURCE_PLATFORM_TEMPLATE_CHANGELOG_DESCRIPTION = (
    "Bootstrap Source Switched to Platform Template: PortalCreate.bootstrap_from_tenant_id "
    "default = 2 (Platform Template); новые tenant клонируются из эталона tenant 2, "
    "а не из production tenant 1. UI: Студия → Администрирование → Тенанты."
)


def _ensure_bootstrap_source_platform_template_dashboard_notes(
    db: Session,
    *,
    initiated_by_user_id: int | None,
    initiated_by_name: str | None,
) -> tuple[int, list[str]]:
    component = (
        db.query(PlatformComponent)
        .filter(PlatformComponent.slug == "control-plane")
        .one_or_none()
    )
    related_component_id = component.id if component is not None else None
    added = 0
    journal_lines: list[str] = []

    if _add_activity(
        db,
        slug=BOOTSTRAP_SOURCE_PLATFORM_TEMPLATE_CHANGELOG_SLUG,
        title="Bootstrap Source Switched to Platform Template",
        description=_BOOTSTRAP_SOURCE_PLATFORM_TEMPLATE_CHANGELOG_DESCRIPTION,
        result=_BOOTSTRAP_SOURCE_PLATFORM_TEMPLATE_CHANGELOG_DESCRIPTION,
        activity_type=PlatformActivityType.MILESTONE.value,
        related_component_id=related_component_id,
        initiated_by_user_id=initiated_by_user_id,
        initiated_by_name=initiated_by_name,
        meta={"ui_location": "Студия → Администрирование → Тенанты"},
    ):
        added += 1
        journal_lines.append(_BOOTSTRAP_SOURCE_PLATFORM_TEMPLATE_CHANGELOG_DESCRIPTION)

    return added, journal_lines


TENANT_ENVIRONMENT_BADGE_CHANGELOG_SLUG = "control-plane-tenant-environment-badge-20260610"

_TENANT_ENVIRONMENT_BADGE_CHANGELOG_DESCRIPTION = (
    "Tenant Environment Badge: визуальное обозначение роли tenant из URL — бейдж рядом с "
    "логотипом в AppSidebar, цветная полоса 4px сверху AppShell, document.title "
    "[PROD|TEMPLATE|DEMO|CLIENT|OLD TEMPLATE] YasnoPro; Office, Studio, runtime."
)


def _ensure_tenant_environment_badge_dashboard_notes(
    db: Session,
    *,
    initiated_by_user_id: int | None,
    initiated_by_name: str | None,
) -> tuple[int, list[str]]:
    component = (
        db.query(PlatformComponent)
        .filter(PlatformComponent.slug == "control-plane")
        .one_or_none()
    )
    related_component_id = component.id if component is not None else None
    added = 0
    journal_lines: list[str] = []

    if _add_activity(
        db,
        slug=TENANT_ENVIRONMENT_BADGE_CHANGELOG_SLUG,
        title="Tenant Environment Badge",
        description=_TENANT_ENVIRONMENT_BADGE_CHANGELOG_DESCRIPTION,
        result=_TENANT_ENVIRONMENT_BADGE_CHANGELOG_DESCRIPTION,
        activity_type=PlatformActivityType.MILESTONE.value,
        related_component_id=related_component_id,
        initiated_by_user_id=initiated_by_user_id,
        initiated_by_name=initiated_by_name,
        meta={
            "ui_location": (
                "AppShell top bar, sidebar brand badge, document.title; "
                "/portal/{tenantId}, /designer/tenant/{tenantId}"
            ),
        },
    ):
        added += 1
        journal_lines.append(_TENANT_ENVIRONMENT_BADGE_CHANGELOG_DESCRIPTION)

    return added, journal_lines


PLAN_ROOT_ANCHOR_UNIQUENESS_CHANGELOG_SLUG = "plan-root-anchor-uniqueness-20260610"

_PLAN_ROOT_ANCHOR_UNIQUENESS_CHANGELOG_DESCRIPTION = (
    "Plan Root Anchor Uniqueness: structural registry plan_root_relation_key on runtime_entities; "
    "partial unique index (tenant, object_type, relation); pg_advisory_xact_lock + reconcile "
    "дубликатов; запрет anchor→anchor relations; самовосстановление при legacy/duplicate anchors."
)


def _ensure_plan_root_anchor_uniqueness_dashboard_notes(
    db: Session,
    *,
    initiated_by_user_id: int | None,
    initiated_by_name: str | None,
) -> tuple[int, list[str]]:
    component = (
        db.query(PlatformComponent)
        .filter(PlatformComponent.slug == "object-card")
        .one_or_none()
    )
    related_component_id = component.id if component is not None else None
    added = 0
    journal_lines: list[str] = []

    if _add_activity(
        db,
        slug=PLAN_ROOT_ANCHOR_UNIQUENESS_CHANGELOG_SLUG,
        title="Plan Root Anchor Uniqueness",
        description=_PLAN_ROOT_ANCHOR_UNIQUENESS_CHANGELOG_DESCRIPTION,
        result=_PLAN_ROOT_ANCHOR_UNIQUENESS_CHANGELOG_DESCRIPTION,
        activity_type=PlatformActivityType.MILESTONE.value,
        related_component_id=related_component_id,
        initiated_by_user_id=initiated_by_user_id,
        initiated_by_name=initiated_by_name,
        meta={
            "ui_location": (
                "backend plan_tree/root_anchor.py, anchor_registry.py; "
                "runtime_entities.plan_root_relation_key"
            ),
        },
    ):
        added += 1
        journal_lines.append(_PLAN_ROOT_ANCHOR_UNIQUENESS_CHANGELOG_DESCRIPTION)

    return added, journal_lines


DEFAULT_QUICK_FORM_ENSURE_CHANGELOG_SLUG = "default-quick-form-ensure-20260610"

_DEFAULT_QUICK_FORM_ENSURE_CHANGELOG_DESCRIPTION = (
    "Default Quick Form Ensure: ensure_default_quick_form_view по ключу "
    "default_quick_form (tenant + object type); pg_advisory_xact_lock; reconcile "
    "дубликатов; IntegrityError retry; bootstrap при создании Object Type; "
    "защита reserved key в create_view."
)


def _ensure_default_quick_form_ensure_dashboard_notes(
    db: Session,
    *,
    initiated_by_user_id: int | None,
    initiated_by_name: str | None,
) -> tuple[int, list[str]]:
    component = (
        db.query(PlatformComponent)
        .filter(PlatformComponent.slug == "object-card")
        .one_or_none()
    )
    related_component_id = component.id if component is not None else None
    added = 0
    journal_lines: list[str] = []

    if _add_activity(
        db,
        slug=DEFAULT_QUICK_FORM_ENSURE_CHANGELOG_SLUG,
        title="Default Quick Form Ensure",
        description=_DEFAULT_QUICK_FORM_ENSURE_CHANGELOG_DESCRIPTION,
        result=_DEFAULT_QUICK_FORM_ENSURE_CHANGELOG_DESCRIPTION,
        activity_type=PlatformActivityType.MILESTONE.value,
        related_component_id=related_component_id,
        initiated_by_user_id=initiated_by_user_id,
        initiated_by_name=initiated_by_name,
        meta={
            "ui_location": (
                "backend designer/view_definitions/service.py, "
                "quick_form_view_registry.py"
            ),
        },
    ):
        added += 1
        journal_lines.append(_DEFAULT_QUICK_FORM_ENSURE_CHANGELOG_DESCRIPTION)

    return added, journal_lines


WORKSPACE_HOME_ENSURE_CHANGELOG_SLUG = "workspace-home-ensure-20260610"

_WORKSPACE_HOME_ENSURE_CHANGELOG_DESCRIPTION = (
    "Workspace Home Ensure: инвариант 1 workspace = 1 Home Tab (slug=home, is_system) "
    "+ 1 Home Page (home_page_id) + 1 root section (sort_order=0); pg_advisory_xact_lock; "
    "reconcile дубликатов Home Tab и root sections; восстановление битых home_page_id."
)


def _ensure_workspace_home_ensure_dashboard_notes(
    db: Session,
    *,
    initiated_by_user_id: int | None,
    initiated_by_name: str | None,
) -> tuple[int, list[str]]:
    component = (
        db.query(PlatformComponent)
        .filter(PlatformComponent.slug == "runtime-entity")
        .one_or_none()
    )
    related_component_id = component.id if component is not None else None
    added = 0
    journal_lines: list[str] = []

    if _add_activity(
        db,
        slug=WORKSPACE_HOME_ENSURE_CHANGELOG_SLUG,
        title="Workspace Home Ensure",
        description=_WORKSPACE_HOME_ENSURE_CHANGELOG_DESCRIPTION,
        result=_WORKSPACE_HOME_ENSURE_CHANGELOG_DESCRIPTION,
        activity_type=PlatformActivityType.MILESTONE.value,
        related_component_id=related_component_id,
        initiated_by_user_id=initiated_by_user_id,
        initiated_by_name=initiated_by_name,
        meta={
            "ui_location": (
                "backend designer/workspaces/workspace_home/registry.py; "
                "designer/workspaces/service.py"
            ),
        },
    ):
        added += 1
        journal_lines.append(_WORKSPACE_HOME_ENSURE_CHANGELOG_DESCRIPTION)

    return added, journal_lines


TENANT_ENVIRONMENT_MODEL_CHANGELOG_SLUG = "tenant-environment-model-20260610"

_TENANT_ENVIRONMENT_MODEL_CHANGELOG_DESCRIPTION = (
    "Tenant Environment Model: portals.tenant_type, template_version, tenant_status, "
    "source_tenant_id, notes; GET /portals/{id}/environment; backend resolver с legacy "
    "fallback; frontend badge через tenant_type; миграция tenant 1=DEV, 2=TEMPLATE, "
    "3=DEMO, 13=LEGACY_TEMPLATE, 4+=CLIENT."
)


def _ensure_tenant_environment_model_dashboard_notes(
    db: Session,
    *,
    initiated_by_user_id: int | None,
    initiated_by_name: str | None,
) -> tuple[int, list[str]]:
    component = (
        db.query(PlatformComponent)
        .filter(PlatformComponent.slug == "control-plane")
        .one_or_none()
    )
    related_component_id = component.id if component is not None else None
    added = 0
    journal_lines: list[str] = []

    if _add_activity(
        db,
        slug=TENANT_ENVIRONMENT_MODEL_CHANGELOG_SLUG,
        title="Tenant Environment Model",
        description=_TENANT_ENVIRONMENT_MODEL_CHANGELOG_DESCRIPTION,
        result=_TENANT_ENVIRONMENT_MODEL_CHANGELOG_DESCRIPTION,
        activity_type=PlatformActivityType.MILESTONE.value,
        related_component_id=related_component_id,
        initiated_by_user_id=initiated_by_user_id,
        initiated_by_name=initiated_by_name,
        meta={
            "ui_location": (
                "backend app/modules/tenant_environment/; portals API; "
                "frontend shared/tenantEnvironment/"
            ),
        },
    ):
        added += 1
        journal_lines.append(_TENANT_ENVIRONMENT_MODEL_CHANGELOG_DESCRIPTION)

    return added, journal_lines


UI_STORAGE_TENANT_ISOLATION_P0P1_CHANGELOG_SLUG = (
    "ui-storage-tenant-isolation-p0p1-20260610"
)

_UI_STORAGE_TENANT_ISOLATION_P0P1_CHANGELOG_DESCRIPTION = (
    "UI Storage Scope Standard P0/P1: frontend/shared/uiStorage с ключами "
    "ui:tenant:{tenantId}:{key}; tenant-scoped sidebarCollapsed, leftMenuScale, "
    "menuCollapsed, systemMenuSettings, lastRuntimePath/lastDesignerPath; "
    "one-time legacy migration; устранено пересечение UI state между tenant."
)


def _ensure_ui_storage_tenant_isolation_p0p1_dashboard_notes(
    db: Session,
    *,
    initiated_by_user_id: int | None,
    initiated_by_name: str | None,
) -> tuple[int, list[str]]:
    component = (
        db.query(PlatformComponent)
        .filter(PlatformComponent.slug == "control-plane")
        .one_or_none()
    )
    related_component_id = component.id if component is not None else None
    added = 0
    journal_lines: list[str] = []

    if _add_activity(
        db,
        slug=UI_STORAGE_TENANT_ISOLATION_P0P1_CHANGELOG_SLUG,
        title="UI Storage Scope — Tenant Isolation P0/P1",
        description=_UI_STORAGE_TENANT_ISOLATION_P0P1_CHANGELOG_DESCRIPTION,
        result=_UI_STORAGE_TENANT_ISOLATION_P0P1_CHANGELOG_DESCRIPTION,
        activity_type=PlatformActivityType.MILESTONE.value,
        related_component_id=related_component_id,
        initiated_by_user_id=initiated_by_user_id,
        initiated_by_name=initiated_by_name,
        meta={
            "ui_location": (
                "frontend/src/shared/uiStorage/; "
                "docs/architecture/platform/configuration-and-ui-state-scope-standard.md"
            ),
        },
    ):
        added += 1
        journal_lines.append(_UI_STORAGE_TENANT_ISOLATION_P0P1_CHANGELOG_DESCRIPTION)

    return added, journal_lines


UI_STORAGE_TENANT_ISOLATION_P2_CHANGELOG_SLUG = (
    "ui-storage-tenant-isolation-p2-20260610"
)

_UI_STORAGE_TENANT_ISOLATION_P2_CHANGELOG_DESCRIPTION = (
    "UI Storage Scope Standard P2: tenant-scoped modalPreferences (Platform Modal "
    "bounds), planTreeWidth:{scopeKey}, yasiiPinned и yasiiPreWorkspacePath; "
    "one-time legacy migration; завершены подтверждённые P2 нарушения "
    "Tenant Isolation."
)


def _ensure_ui_storage_tenant_isolation_p2_dashboard_notes(
    db: Session,
    *,
    initiated_by_user_id: int | None,
    initiated_by_name: str | None,
) -> tuple[int, list[str]]:
    component = (
        db.query(PlatformComponent)
        .filter(PlatformComponent.slug == "control-plane")
        .one_or_none()
    )
    related_component_id = component.id if component is not None else None
    added = 0
    journal_lines: list[str] = []

    if _add_activity(
        db,
        slug=UI_STORAGE_TENANT_ISOLATION_P2_CHANGELOG_SLUG,
        title="UI Storage Scope — Tenant Isolation P2",
        description=_UI_STORAGE_TENANT_ISOLATION_P2_CHANGELOG_DESCRIPTION,
        result=_UI_STORAGE_TENANT_ISOLATION_P2_CHANGELOG_DESCRIPTION,
        activity_type=PlatformActivityType.MILESTONE.value,
        related_component_id=related_component_id,
        initiated_by_user_id=initiated_by_user_id,
        initiated_by_name=initiated_by_name,
        meta={
            "ui_location": (
                "frontend/src/shared/platformModal/modalUiPreferences.js; "
                "frontend/src/modules/objectViews/plan/planTreePanelWidthStorage.js; "
                "frontend/src/yasii/workspace/yasiiWorkspaceModeStorage.js"
            ),
        },
    ):
        added += 1
        journal_lines.append(_UI_STORAGE_TENANT_ISOLATION_P2_CHANGELOG_DESCRIPTION)

    return added, journal_lines


TENANT_REGISTRY_V1_CHANGELOG_SLUG = "control-plane-tenant-registry-v1-20260610"

_TENANT_REGISTRY_V1_CHANGELOG_DESCRIPTION = (
    "Control Plane — Tenant Registry v1: read-only реестр всех tenant в Studio "
    "Administration; GET /control-plane/tenants (+ /summary, /{id}); фильтры "
    "type/status, поиск ID/Name; карточка tenant с notes; доступ admin/superadmin; "
    "основа для будущего Clone Tenant и Version Management."
)


CLIENTS_UX_REFACTOR_CHANGELOG_SLUG = "control-plane-clients-ux-refactor-20260610"

_CLIENTS_UX_REFACTOR_CHANGELOG_DESCRIPTION = (
    "Control Plane UX — Клиенты ЯсноПро: единая карточка на главной Administration "
    "(всего / активных / отключённых / архивных, последние компании, «Все компании →»); "
    "раздел /admin/clients с вкладками Обзор, Компании, Tenant Registry; "
    "редиректы со старых /admin/tenants и /admin/control-plane/tenants; "
    "термин tenant оставлен в коде, API и Tenant Registry."
)


CONTROL_PLANE_INDEPENDENCE_AUDIT_CHANGELOG_SLUG = (
    "control-plane-independence-audit-20260610"
)

_CONTROL_PLANE_INDEPENDENCE_AUDIT_CHANGELOG_DESCRIPTION = (
    "Control Plane Independence Audit: полный аудит зависимостей Control Plane от Tenant 1 "
    "(routing, navigation, workspace, pages, portal, auth, API, storage, data model, bootstrap risk). "
    "Вердикт B — backend API (/control-plane/*, customer_companies, portals CRUD) независим от "
    "конкретного tenant; UI shell встроен в Studio → /designer/tenant/{id}/administration; "
    "portal 1 защищён от удаления (SYSTEM_TENANT_ID); для полного отделения нужен root route "
    "/control-plane и вынос shell из Designer tenant context."
)


def _ensure_control_plane_independence_audit_dashboard_notes(
    db: Session,
    *,
    initiated_by_user_id: int | None,
    initiated_by_name: str | None,
) -> tuple[int, list[str]]:
    component = (
        db.query(PlatformComponent)
        .filter(PlatformComponent.slug == "control-plane")
        .one_or_none()
    )
    related_component_id = component.id if component is not None else None
    added = 0
    journal_lines: list[str] = []

    if _add_activity(
        db,
        slug=CONTROL_PLANE_INDEPENDENCE_AUDIT_CHANGELOG_SLUG,
        title="Control Plane Independence Audit",
        description=_CONTROL_PLANE_INDEPENDENCE_AUDIT_CHANGELOG_DESCRIPTION,
        result=_CONTROL_PLANE_INDEPENDENCE_AUDIT_CHANGELOG_DESCRIPTION,
        activity_type=PlatformActivityType.ANALYSIS.value,
        related_component_id=related_component_id,
        initiated_by_user_id=initiated_by_user_id,
        initiated_by_name=initiated_by_name,
        meta={
            "ui_location": (
                "docs/architecture/control-plane-independence-audit-20260610.md; "
                "frontend/src/modules/controlPlane/; "
                "backend/app/modules/control_plane/"
            ),
            "audit_verdict": "B",
        },
    ):
        added += 1
        journal_lines.append(_CONTROL_PLANE_INDEPENDENCE_AUDIT_CHANGELOG_DESCRIPTION)

    return added, journal_lines


PLATFORM_TENANT_ADMIN_SPLIT_CHANGELOG_SLUG = "control-plane-platform-tenant-admin-split-20260610"

_PLATFORM_TENANT_ADMIN_SPLIT_CHANGELOG_DESCRIPTION = (
    "Platform vs Tenant Administration Split: Control Plane (/control-plane/*) — только "
    "platform-level (clients, platform-users, platform-roles, modules, settings, integrations, "
    "audit-log); Tenant Administration "
    "(/designer/tenant/{id}/administration/*) — users, roles, settings, modules, integrations, "
    "audit-log компании; Studio sidebar — два пункта; selective redirects; "
    "ui:tenant:{tenantId}:administration:* storage scope."
)


def _ensure_platform_tenant_admin_split_dashboard_notes(
    db: Session,
    *,
    initiated_by_user_id: int | None,
    initiated_by_name: str | None,
) -> tuple[int, list[str]]:
    component = (
        db.query(PlatformComponent)
        .filter(PlatformComponent.slug == "control-plane")
        .one_or_none()
    )
    related_component_id = component.id if component is not None else None
    added = 0
    journal_lines: list[str] = []

    if _add_activity(
        db,
        slug=PLATFORM_TENANT_ADMIN_SPLIT_CHANGELOG_SLUG,
        title="Platform vs Tenant Administration Split",
        description=_PLATFORM_TENANT_ADMIN_SPLIT_CHANGELOG_DESCRIPTION,
        result=_PLATFORM_TENANT_ADMIN_SPLIT_CHANGELOG_DESCRIPTION,
        activity_type=PlatformActivityType.MILESTONE.value,
        related_component_id=related_component_id,
        initiated_by_user_id=initiated_by_user_id,
        initiated_by_name=initiated_by_name,
        meta={
            "ui_location": (
                "frontend/src/modules/admin/routes/TenantAdministrationRouter.jsx; "
                "frontend/src/modules/controlPlane/config/controlPlanePaths.js; "
                "frontend/src/modules/designer/components/shell/DesignerShell.jsx"
            ),
        },
    ):
        added += 1
        journal_lines.append(_PLATFORM_TENANT_ADMIN_SPLIT_CHANGELOG_DESCRIPTION)

    return added, journal_lines


CONTROL_PLANE_SHELL_PHASE1_CHANGELOG_SLUG = "control-plane-shell-phase1-20260610"

_CONTROL_PLANE_SHELL_PHASE1_CHANGELOG_DESCRIPTION = (
    "Control Plane Independence — Platform Shell Phase 1: независимые маршруты "
    "/control-plane/* без tenantId; ControlPlaneShell (AppShellFrame, header, sidebar, "
    "search, notifications); platform-scoped UI storage "
    "(ui:platform:controlPlane:*); redirects со старых /admin и Studio Administration."
)


def _ensure_control_plane_shell_phase1_dashboard_notes(
    db: Session,
    *,
    initiated_by_user_id: int | None,
    initiated_by_name: str | None,
) -> tuple[int, list[str]]:
    component = (
        db.query(PlatformComponent)
        .filter(PlatformComponent.slug == "control-plane")
        .one_or_none()
    )
    related_component_id = component.id if component is not None else None
    added = 0
    journal_lines: list[str] = []

    if _add_activity(
        db,
        slug=CONTROL_PLANE_SHELL_PHASE1_CHANGELOG_SLUG,
        title="Control Plane Independence — Platform Shell",
        description=_CONTROL_PLANE_SHELL_PHASE1_CHANGELOG_DESCRIPTION,
        result=_CONTROL_PLANE_SHELL_PHASE1_CHANGELOG_DESCRIPTION,
        activity_type=PlatformActivityType.MILESTONE.value,
        related_component_id=related_component_id,
        initiated_by_user_id=initiated_by_user_id,
        initiated_by_name=initiated_by_name,
        meta={
            "ui_location": (
                "frontend/src/modules/controlPlane/shell/ControlPlaneShell.jsx; "
                "frontend/src/modules/controlPlane/layout/ControlPlaneLayout.jsx"
            ),
        },
    ):
        added += 1
        journal_lines.append(_CONTROL_PLANE_SHELL_PHASE1_CHANGELOG_DESCRIPTION)

    return added, journal_lines


def _ensure_clients_ux_refactor_dashboard_notes(
    db: Session,
    *,
    initiated_by_user_id: int | None,
    initiated_by_name: str | None,
) -> tuple[int, list[str]]:
    component = (
        db.query(PlatformComponent)
        .filter(PlatformComponent.slug == "control-plane")
        .one_or_none()
    )
    related_component_id = component.id if component is not None else None
    added = 0
    journal_lines: list[str] = []

    if _add_activity(
        db,
        slug=CLIENTS_UX_REFACTOR_CHANGELOG_SLUG,
        title="Control Plane UX — Клиенты ЯсноПро",
        description=_CLIENTS_UX_REFACTOR_CHANGELOG_DESCRIPTION,
        result=_CLIENTS_UX_REFACTOR_CHANGELOG_DESCRIPTION,
        activity_type=PlatformActivityType.MILESTONE.value,
        related_component_id=related_component_id,
        initiated_by_user_id=initiated_by_user_id,
        initiated_by_name=initiated_by_name,
        meta={
            "ui_location": (
                "frontend/src/modules/admin/clients/; "
                "frontend/src/modules/admin/config/adminSections.js"
            ),
        },
    ):
        added += 1
        journal_lines.append(_CLIENTS_UX_REFACTOR_CHANGELOG_DESCRIPTION)

    return added, journal_lines


def _ensure_tenant_registry_v1_dashboard_notes(
    db: Session,
    *,
    initiated_by_user_id: int | None,
    initiated_by_name: str | None,
) -> tuple[int, list[str]]:
    component = (
        db.query(PlatformComponent)
        .filter(PlatformComponent.slug == "control-plane")
        .one_or_none()
    )
    related_component_id = component.id if component is not None else None
    added = 0
    journal_lines: list[str] = []

    if _add_activity(
        db,
        slug=TENANT_REGISTRY_V1_CHANGELOG_SLUG,
        title="Control Plane — Tenant Registry v1",
        description=_TENANT_REGISTRY_V1_CHANGELOG_DESCRIPTION,
        result=_TENANT_REGISTRY_V1_CHANGELOG_DESCRIPTION,
        activity_type=PlatformActivityType.MILESTONE.value,
        related_component_id=related_component_id,
        initiated_by_user_id=initiated_by_user_id,
        initiated_by_name=initiated_by_name,
        meta={
            "ui_location": (
                "backend app/modules/control_plane/tenant_registry/; "
                "frontend/src/modules/controlPlane/"
            ),
        },
    ):
        added += 1
        journal_lines.append(_TENANT_REGISTRY_V1_CHANGELOG_DESCRIPTION)

    return added, journal_lines


SYSTEM_ENTITY_REGISTRY_V1_CHANGELOG_SLUG = "system-entity-registry-v1-20260610"

_SYSTEM_ENTITY_REGISTRY_V1_CHANGELOG_DESCRIPTION = (
    "System Entity Registry v1: SYSTEM_ENTITY_CATALOG для 7 ADR-007 entities; "
    "audit_all_system_entities + generate_system_entity_compliance_report; "
    "CLI scripts/audit_system_entities.py; агрегация audit_plan_root_anchors, "
    "audit_default_quick_form_views, audit_workspace_home_entities, "
    "audit_navigation_system_items без переноса бизнес-логики."
)


def _ensure_system_entity_registry_v1_dashboard_notes(
    db: Session,
    *,
    initiated_by_user_id: int | None,
    initiated_by_name: str | None,
) -> tuple[int, list[str]]:
    component = (
        db.query(PlatformComponent)
        .filter(PlatformComponent.slug == "object-platform")
        .one_or_none()
    )
    related_component_id = component.id if component is not None else None
    added = 0
    journal_lines: list[str] = []

    if _add_activity(
        db,
        slug=SYSTEM_ENTITY_REGISTRY_V1_CHANGELOG_SLUG,
        title="System Entity Registry v1",
        description=_SYSTEM_ENTITY_REGISTRY_V1_CHANGELOG_DESCRIPTION,
        result=_SYSTEM_ENTITY_REGISTRY_V1_CHANGELOG_DESCRIPTION,
        activity_type=PlatformActivityType.MILESTONE.value,
        related_component_id=related_component_id,
        initiated_by_user_id=initiated_by_user_id,
        initiated_by_name=initiated_by_name,
        meta={
            "ui_location": (
                "backend app/modules/platform/system_entity_registry/; "
                "docs/architecture/system-entity-registry.md; ADR-007"
            ),
        },
    ):
        added += 1
        journal_lines.append(_SYSTEM_ENTITY_REGISTRY_V1_CHANGELOG_DESCRIPTION)

    return added, journal_lines


NAVIGATION_SYSTEM_ITEMS_ENSURE_CHANGELOG_SLUG = "navigation-system-items-ensure-20260610"

_NAVIGATION_SYSTEM_ITEMS_ENSURE_CHANGELOG_DESCRIPTION = (
    "Navigation System Items Ensure: system_key как источник истины для designer system menu "
    "и workspace placements; pg_advisory_xact_lock; reconcile дубликатов; partial unique index "
    "(portal_id, system_key); recovery metadata и orphan placement cleanup."
)


def _ensure_navigation_system_items_ensure_dashboard_notes(
    db: Session,
    *,
    initiated_by_user_id: int | None,
    initiated_by_name: str | None,
) -> tuple[int, list[str]]:
    component = (
        db.query(PlatformComponent)
        .filter(PlatformComponent.slug == "control-plane")
        .one_or_none()
    )
    related_component_id = component.id if component is not None else None
    added = 0
    journal_lines: list[str] = []

    if _add_activity(
        db,
        slug=NAVIGATION_SYSTEM_ITEMS_ENSURE_CHANGELOG_SLUG,
        title="Navigation System Items Ensure",
        description=_NAVIGATION_SYSTEM_ITEMS_ENSURE_CHANGELOG_DESCRIPTION,
        result=_NAVIGATION_SYSTEM_ITEMS_ENSURE_CHANGELOG_DESCRIPTION,
        activity_type=PlatformActivityType.MILESTONE.value,
        related_component_id=related_component_id,
        initiated_by_user_id=initiated_by_user_id,
        initiated_by_name=initiated_by_name,
        meta={
            "ui_location": (
                "backend navigation/system_registry/registry.py; "
                "navigation/service.py; designer/workspaces/service.py"
            ),
        },
    ):
        added += 1
        journal_lines.append(_NAVIGATION_SYSTEM_ITEMS_ENSURE_CHANGELOG_DESCRIPTION)

    return added, journal_lines


PLAN_VIEW_CYCLE_GUARD_CHANGELOG_SLUG = "plan-view-cycle-guard-20260610"

_PLAN_VIEW_CYCLE_GUARD_CHANGELOG_DESCRIPTION = (
    "Plan View Cycle Guard: buildPlanTree защищён от циклов (visited/active stack), "
    "self-parent и system-to-system relation edges отфильтрованы; system records не "
    "рендерятся как пользовательские узлы; fallback-сообщение при цикле; исправлены "
    "corrupt relation instances tenant 1 / idei / ierarhiya_idey."
)


def _ensure_plan_view_cycle_guard_dashboard_notes(
    db: Session,
    *,
    initiated_by_user_id: int | None,
    initiated_by_name: str | None,
) -> tuple[int, list[str]]:
    component = (
        db.query(PlatformComponent)
        .filter(PlatformComponent.slug == "object-card")
        .one_or_none()
    )
    related_component_id = component.id if component is not None else None
    added = 0
    journal_lines: list[str] = []

    if _add_activity(
        db,
        slug=PLAN_VIEW_CYCLE_GUARD_CHANGELOG_SLUG,
        title="Plan View Cycle Guard",
        description=_PLAN_VIEW_CYCLE_GUARD_CHANGELOG_DESCRIPTION,
        result=_PLAN_VIEW_CYCLE_GUARD_CHANGELOG_DESCRIPTION,
        activity_type=PlatformActivityType.MILESTONE.value,
        related_component_id=related_component_id,
        initiated_by_user_id=initiated_by_user_id,
        initiated_by_name=initiated_by_name,
        meta={
            "ui_location": (
                "Office Plan View / buildPlanTree / ObjectPlanView; "
                "/portal/{tenantId}/workspaces/..."
            ),
        },
    ):
        added += 1
        journal_lines.append(_PLAN_VIEW_CYCLE_GUARD_CHANGELOG_DESCRIPTION)

    return added, journal_lines


RUNTIME_SYSTEM_RECORDS_CHANGELOG_SLUG = "runtime-system-records-20260610"

_RUNTIME_SYSTEM_RECORDS_CHANGELOG_DESCRIPTION = (
    "Runtime System Records: колонка runtime_entities.is_system; Plan Root "
    "(__plan_tree_root__#*) создаётся как системная запись; user surfaces "
    "(Object Table, search, lookup, relation picker, entity card) скрывают System Records; "
    "Plan View и hierarchy engine продолжают использовать якорь через internal API."
)


def _ensure_runtime_system_records_dashboard_notes(
    db: Session,
    *,
    initiated_by_user_id: int | None,
    initiated_by_name: str | None,
) -> tuple[int, list[str]]:
    component = (
        db.query(PlatformComponent)
        .filter(PlatformComponent.slug == "runtime-entity")
        .one_or_none()
    )
    related_component_id = component.id if component is not None else None
    added = 0
    journal_lines: list[str] = []

    if _add_activity(
        db,
        slug=RUNTIME_SYSTEM_RECORDS_CHANGELOG_SLUG,
        title="Runtime System Records",
        description=_RUNTIME_SYSTEM_RECORDS_CHANGELOG_DESCRIPTION,
        result=_RUNTIME_SYSTEM_RECORDS_CHANGELOG_DESCRIPTION,
        activity_type=PlatformActivityType.MILESTONE.value,
        related_component_id=related_component_id,
        initiated_by_user_id=initiated_by_user_id,
        initiated_by_name=initiated_by_name,
        meta={
            "ui_location": (
                "Office Object Table, search, relation picker, entity card; "
                "backend runtime query/search/entities APIs"
            ),
        },
    ):
        added += 1
        journal_lines.append(_RUNTIME_SYSTEM_RECORDS_CHANGELOG_DESCRIPTION)

    return added, journal_lines


REMOVED_SYSTEM_MENU_ITEMS_CHANGELOG_SLUG = "control-plane-removed-system-menu-items-20260610"

_REMOVED_SYSTEM_MENU_ITEMS_CHANGELOG_DESCRIPTION = (
    "Removed System Menu Items: из левого меню убраны системные пункты — Office «Мои задачи»; "
    "Studio «Связи», «Вкладки», «Навигация», «Публикация». Генерация удалена в DesignerShell, "
    "AppSidebarRenderer и navigation service; фильтрация legacy-пунктов из API для всех tenant."
)


def _ensure_removed_system_menu_items_dashboard_notes(
    db: Session,
    *,
    initiated_by_user_id: int | None,
    initiated_by_name: str | None,
) -> tuple[int, list[str]]:
    component = (
        db.query(PlatformComponent)
        .filter(PlatformComponent.slug == "control-plane")
        .one_or_none()
    )
    related_component_id = component.id if component is not None else None
    added = 0
    journal_lines: list[str] = []

    if _add_activity(
        db,
        slug=REMOVED_SYSTEM_MENU_ITEMS_CHANGELOG_SLUG,
        title="Removed System Menu Items",
        description=_REMOVED_SYSTEM_MENU_ITEMS_CHANGELOG_DESCRIPTION,
        result=_REMOVED_SYSTEM_MENU_ITEMS_CHANGELOG_DESCRIPTION,
        activity_type=PlatformActivityType.MILESTONE.value,
        related_component_id=related_component_id,
        initiated_by_user_id=initiated_by_user_id,
        initiated_by_name=initiated_by_name,
        meta={
            "ui_location": (
                "Office AppSidebar, Studio DesignerShell sidebar; "
                "/portal/{tenantId}, /designer/tenant/{tenantId}"
            ),
        },
    ):
        added += 1
        journal_lines.append(_REMOVED_SYSTEM_MENU_ITEMS_CHANGELOG_DESCRIPTION)

    return added, journal_lines


TENANT_DELETE_MVP_CHANGELOG_SLUG = "control-plane-tenant-delete-mvp-20260609"

_TENANT_DELETE_MVP_CHANGELOG_DESCRIPTION = (
    "Tenant Delete MVP: сервис delete_tenant полностью удаляет portal и связанную структуру "
    "(pages, navigation, designer catalog, workspaces, runtime data) в одной транзакции; "
    "DELETE /portals/{id}; UI: Студия → Администрирование → Тенанты — действие «Удалить» "
    "в списке и карточке с подтверждением по названию; portal 1 защищён."
)


def _ensure_tenant_delete_mvp_dashboard_notes(
    db: Session,
    *,
    initiated_by_user_id: int | None,
    initiated_by_name: str | None,
) -> tuple[int, list[str]]:
    component = (
        db.query(PlatformComponent)
        .filter(PlatformComponent.slug == "control-plane")
        .one_or_none()
    )
    related_component_id = component.id if component is not None else None
    added = 0
    journal_lines: list[str] = []

    if _add_activity(
        db,
        slug=TENANT_DELETE_MVP_CHANGELOG_SLUG,
        title="Tenant Delete MVP",
        description=_TENANT_DELETE_MVP_CHANGELOG_DESCRIPTION,
        result=_TENANT_DELETE_MVP_CHANGELOG_DESCRIPTION,
        activity_type=PlatformActivityType.MILESTONE.value,
        related_component_id=related_component_id,
        initiated_by_user_id=initiated_by_user_id,
        initiated_by_name=initiated_by_name,
        meta={"ui_location": "Студия → Администрирование → Тенанты"},
    ):
        added += 1
        journal_lines.append(_TENANT_DELETE_MVP_CHANGELOG_DESCRIPTION)

    return added, journal_lines


def _ensure_tenant_management_ui_dashboard_notes(
    db: Session,
    *,
    initiated_by_user_id: int | None,
    initiated_by_name: str | None,
) -> tuple[int, list[str]]:
    component = (
        db.query(PlatformComponent)
        .filter(PlatformComponent.slug == "control-plane")
        .one_or_none()
    )
    related_component_id = component.id if component is not None else None
    added = 0
    journal_lines: list[str] = []

    if _add_activity(
        db,
        slug=TENANT_MANAGEMENT_UI_CHANGELOG_SLUG,
        title="Control Plane: Tenant Management UI",
        description=_TENANT_MANAGEMENT_UI_CHANGELOG_DESCRIPTION,
        result=_TENANT_MANAGEMENT_UI_CHANGELOG_DESCRIPTION,
        activity_type=PlatformActivityType.MILESTONE.value,
        related_component_id=related_component_id,
        initiated_by_user_id=initiated_by_user_id,
        initiated_by_name=initiated_by_name,
        meta={"ui_location": "Управление платформой → Тенанты"},
    ):
        added += 1
        journal_lines.append(_TENANT_MANAGEMENT_UI_CHANGELOG_DESCRIPTION)

    return added, journal_lines


def _ensure_customer_companies_mvp_dashboard_notes(
    db: Session,
    *,
    initiated_by_user_id: int | None,
    initiated_by_name: str | None,
) -> tuple[int, list[str]]:
    component = (
        db.query(PlatformComponent)
        .filter(PlatformComponent.slug == "control-plane")
        .one_or_none()
    )
    related_component_id = component.id if component is not None else None
    added = 0
    journal_lines: list[str] = []

    if _add_activity(
        db,
        slug=CUSTOMER_COMPANIES_MVP_CHANGELOG_SLUG,
        title="Control Plane: MVP customer_companies",
        description=_CUSTOMER_COMPANIES_MVP_CHANGELOG_DESCRIPTION,
        result=_CUSTOMER_COMPANIES_MVP_CHANGELOG_DESCRIPTION,
        activity_type=PlatformActivityType.MILESTONE.value,
        related_component_id=related_component_id,
        initiated_by_user_id=initiated_by_user_id,
        initiated_by_name=initiated_by_name,
        meta={"ui_location": "Управление платформой → Клиенты"},
    ):
        added += 1
        journal_lines.append(_CUSTOMER_COMPANIES_MVP_CHANGELOG_DESCRIPTION)

    return added, journal_lines


def _ensure_field_placeholder_support_dashboard_notes(
    db: Session,
    *,
    initiated_by_user_id: int | None,
    initiated_by_name: str | None,
) -> tuple[int, list[str]]:
    stage = (
        db.query(PlatformImplementationStage)
        .filter(PlatformImplementationStage.slug == "designer-foundation")
        .one_or_none()
    )
    related_stage_id = stage.id if stage is not None else None
    added = 0
    journal_lines: list[str] = []

    if _add_activity(
        db,
        slug=FIELD_PLACEHOLDER_SUPPORT_CHANGELOG_SLUG,
        title="Field placeholder: подсказка в формах ввода",
        description=_FIELD_PLACEHOLDER_SUPPORT_CHANGELOG_DESCRIPTION,
        result=_FIELD_PLACEHOLDER_SUPPORT_CHANGELOG_DESCRIPTION,
        activity_type=PlatformActivityType.MILESTONE.value,
        related_stage_id=related_stage_id,
        initiated_by_user_id=initiated_by_user_id,
        initiated_by_name=initiated_by_name,
    ):
        added += 1
        journal_lines.append(_FIELD_PLACEHOLDER_SUPPORT_CHANGELOG_DESCRIPTION)

    return added, journal_lines


OFFICE_PLAN_OBJECT_TAB_CONTRACT_CHANGELOG_SLUG = "office-plan-object-tab-contract-routing-20260607"

_OFFICE_PLAN_OBJECT_TAB_CONTRACT_CHANGELOG_DESCRIPTION = (
    "Office Plan: requestedObjectTabKey выбирает published contract вкладки (architecture), "
    "а не default_table; hierarchyRelationKey доходит до ObjectPlanView; empty state данных."
)


def _ensure_office_plan_object_tab_contract_dashboard_notes(
    db: Session,
    *,
    initiated_by_user_id: int | None,
    initiated_by_name: str | None,
) -> tuple[int, list[str]]:
    stage = (
        db.query(PlatformImplementationStage)
        .filter(PlatformImplementationStage.slug == "designer-foundation")
        .one_or_none()
    )
    related_stage_id = stage.id if stage is not None else None
    added = 0
    journal_lines: list[str] = []

    if _add_activity(
        db,
        slug=OFFICE_PLAN_OBJECT_TAB_CONTRACT_CHANGELOG_SLUG,
        title="Office Plan: contract routing по object tab key",
        description=_OFFICE_PLAN_OBJECT_TAB_CONTRACT_CHANGELOG_DESCRIPTION,
        result=_OFFICE_PLAN_OBJECT_TAB_CONTRACT_CHANGELOG_DESCRIPTION,
        activity_type=PlatformActivityType.MILESTONE.value,
        related_stage_id=related_stage_id,
        initiated_by_user_id=initiated_by_user_id,
        initiated_by_name=initiated_by_name,
    ):
        added += 1
        journal_lines.append(_OFFICE_PLAN_OBJECT_TAB_CONTRACT_CHANGELOG_DESCRIPTION)

    return added, journal_lines


OFFICE_PLAN_VIEW_HOOKS_CHANGELOG_SLUG = "office-plan-view-hooks-order-20260607"

_OFFICE_PLAN_VIEW_HOOKS_CHANGELOG_DESCRIPTION = (
    "ObjectPlanViewConfigured: hooks до conditional return; usePlanHierarchy.enabled; "
    "relationsLoading skeleton; Plan debug через planViewDebug (import.meta.env.DEV + SHOW_PLAN_DEBUG)."
)


def _ensure_office_plan_view_hooks_dashboard_notes(
    db: Session,
    *,
    initiated_by_user_id: int | None,
    initiated_by_name: str | None,
) -> tuple[int, list[str]]:
    stage = (
        db.query(PlatformImplementationStage)
        .filter(PlatformImplementationStage.slug == "designer-foundation")
        .one_or_none()
    )
    related_stage_id = stage.id if stage is not None else None
    added = 0
    journal_lines: list[str] = []

    if _add_activity(
        db,
        slug=OFFICE_PLAN_VIEW_HOOKS_CHANGELOG_SLUG,
        title="Office Plan: исправлен порядок React hooks",
        description=_OFFICE_PLAN_VIEW_HOOKS_CHANGELOG_DESCRIPTION,
        result=_OFFICE_PLAN_VIEW_HOOKS_CHANGELOG_DESCRIPTION,
        activity_type=PlatformActivityType.MILESTONE.value,
        related_stage_id=related_stage_id,
        initiated_by_user_id=initiated_by_user_id,
        initiated_by_name=initiated_by_name,
    ):
        added += 1
        journal_lines.append(_OFFICE_PLAN_VIEW_HOOKS_CHANGELOG_DESCRIPTION)

    return added, journal_lines


PLAN_VIEW_ORPHAN_RECORDS_CHANGELOG_SLUG = "plan-view-orphan-records-root-nodes-20260607"

_PLAN_VIEW_ORPHAN_RECORDS_CHANGELOG_DESCRIPTION = (
    "Plan Office: empty state по planEntityCount (records), не по relation instances; "
    "несвязанные записи — корневые узлы; buildPlanTree.test orphan/parent/child."
)


def _ensure_plan_view_orphan_records_dashboard_notes(
    db: Session,
    *,
    initiated_by_user_id: int | None,
    initiated_by_name: str | None,
) -> tuple[int, list[str]]:
    stage = (
        db.query(PlatformImplementationStage)
        .filter(PlatformImplementationStage.slug == "designer-foundation")
        .one_or_none()
    )
    related_stage_id = stage.id if stage is not None else None
    added = 0
    journal_lines: list[str] = []

    if _add_activity(
        db,
        slug=PLAN_VIEW_ORPHAN_RECORDS_CHANGELOG_SLUG,
        title="Plan: корневые записи без relation instances",
        description=_PLAN_VIEW_ORPHAN_RECORDS_CHANGELOG_DESCRIPTION,
        result=_PLAN_VIEW_ORPHAN_RECORDS_CHANGELOG_DESCRIPTION,
        activity_type=PlatformActivityType.MILESTONE.value,
        related_stage_id=related_stage_id,
        initiated_by_user_id=initiated_by_user_id,
        initiated_by_name=initiated_by_name,
    ):
        added += 1
        journal_lines.append(_PLAN_VIEW_ORPHAN_RECORDS_CHANGELOG_DESCRIPTION)

    return added, journal_lines


OBJECT_TAB_MENU_IN_TAB_HISTORY_SLUG = "object-tab-menu-in-tab-20260607"
OBJECT_TAB_MENU_IN_TAB_CHANGELOG_SLUG = "object-tab-menu-in-tab-changelog-20260607"

_OBJECT_TAB_MENU_IN_TAB_HISTORY_DESCRIPTION = (
    "Object Tab Settings: настройка «Меню во вкладке» (menuInTab) — перенос "
    "Object Context Menu из заголовка объекта в название активной вкладки для "
    "всех типов представлений."
)

_OBJECT_TAB_MENU_IN_TAB_CHANGELOG_DESCRIPTION = (
    "Studio → Свойства вкладки → «Меню во вкладке» (ниже «Активное представление»); "
    "settings_json.tabSettings.menuInTab; Office скрывает блок «Название объекта ▾» "
    "и показывает единый ObjectContextMenuTrigger в активной вкладке."
)


def _ensure_object_tab_menu_in_tab_dashboard_notes(
    db: Session,
    *,
    initiated_by_user_id: int | None,
    initiated_by_name: str | None,
) -> tuple[int, list[str]]:
    stage = (
        db.query(PlatformImplementationStage)
        .filter(PlatformImplementationStage.slug == "designer-foundation")
        .one_or_none()
    )
    related_stage_id = stage.id if stage is not None else None
    added = 0
    journal_lines: list[str] = []

    if _add_activity(
        db,
        slug=OBJECT_TAB_MENU_IN_TAB_HISTORY_SLUG,
        title="Object Tab: настройка «Меню во вкладке»",
        description=_OBJECT_TAB_MENU_IN_TAB_HISTORY_DESCRIPTION,
        result=_OBJECT_TAB_MENU_IN_TAB_CHANGELOG_DESCRIPTION,
        activity_type=PlatformActivityType.MILESTONE.value,
        related_stage_id=related_stage_id,
        initiated_by_user_id=initiated_by_user_id,
        initiated_by_name=initiated_by_name,
    ):
        added += 1

    if _add_activity(
        db,
        slug=OBJECT_TAB_MENU_IN_TAB_CHANGELOG_SLUG,
        title="Журнал изменений: «Меню во вкладке»",
        description=_OBJECT_TAB_MENU_IN_TAB_CHANGELOG_DESCRIPTION,
        result=_OBJECT_TAB_MENU_IN_TAB_CHANGELOG_DESCRIPTION,
        activity_type=PlatformActivityType.MILESTONE.value,
        related_stage_id=related_stage_id,
        initiated_by_user_id=initiated_by_user_id,
        initiated_by_name=initiated_by_name,
    ):
        added += 1
        journal_lines.append(_OBJECT_TAB_MENU_IN_TAB_CHANGELOG_DESCRIPTION)

    return added, journal_lines


OBJECT_TAB_MENU_IN_TAB_FIX_CHANGELOG_SLUG = "object-tab-menu-in-tab-fix-20260607"

_OBJECT_TAB_MENU_IN_TAB_FIX_CHANGELOG_DESCRIPTION = (
    "Fix menuInTab: Studio publish сохраняет dirty вкладки перед publish; "
    "Office перечитывает published catalog после publish; "
    "parse settings_json string; preserve tabSettings в publish contract."
)


def _ensure_object_tab_menu_in_tab_fix_dashboard_notes(
    db: Session,
    *,
    initiated_by_user_id: int | None,
    initiated_by_name: str | None,
) -> tuple[int, list[str]]:
    stage = (
        db.query(PlatformImplementationStage)
        .filter(PlatformImplementationStage.slug == "designer-foundation")
        .one_or_none()
    )
    related_stage_id = stage.id if stage is not None else None
    added = 0
    journal_lines: list[str] = []

    if _add_activity(
        db,
        slug=OBJECT_TAB_MENU_IN_TAB_FIX_CHANGELOG_SLUG,
        title="Fix: «Меню во вкладке» доходит до Office",
        description=_OBJECT_TAB_MENU_IN_TAB_FIX_CHANGELOG_DESCRIPTION,
        result=_OBJECT_TAB_MENU_IN_TAB_FIX_CHANGELOG_DESCRIPTION,
        activity_type=PlatformActivityType.MILESTONE.value,
        related_stage_id=related_stage_id,
        initiated_by_user_id=initiated_by_user_id,
        initiated_by_name=initiated_by_name,
    ):
        added += 1
        journal_lines.append(_OBJECT_TAB_MENU_IN_TAB_FIX_CHANGELOG_DESCRIPTION)

    return added, journal_lines


VIEW_PROPERTIES_PANEL_STUDIO_VIEW_TYPES_FIX_SLUG = (
    "view-properties-panel-studio-view-types-fix-20260607"
)

_VIEW_PROPERTIES_PANEL_STUDIO_VIEW_TYPES_FIX_DESCRIPTION = (
    "Bugfix Studio: восстановлен импорт STUDIO_VIEW_TYPES и PlanViewSettingsPanel "
    "в ViewPropertiesPanel после добавления «Меню во вкладке»; menuInTab остаётся "
    "универсальным для всех типов вкладок."
)


def _ensure_view_properties_panel_studio_view_types_fix_dashboard_notes(
    db: Session,
    *,
    initiated_by_user_id: int | None,
    initiated_by_name: str | None,
) -> tuple[int, list[str]]:
    stage = (
        db.query(PlatformImplementationStage)
        .filter(PlatformImplementationStage.slug == "designer-foundation")
        .one_or_none()
    )
    related_stage_id = stage.id if stage is not None else None
    added = 0
    journal_lines: list[str] = []

    if _add_activity(
        db,
        slug=VIEW_PROPERTIES_PANEL_STUDIO_VIEW_TYPES_FIX_SLUG,
        title="Bugfix: ViewPropertiesPanel STUDIO_VIEW_TYPES",
        description=_VIEW_PROPERTIES_PANEL_STUDIO_VIEW_TYPES_FIX_DESCRIPTION,
        result=_VIEW_PROPERTIES_PANEL_STUDIO_VIEW_TYPES_FIX_DESCRIPTION,
        activity_type=PlatformActivityType.MILESTONE.value,
        related_stage_id=related_stage_id,
        initiated_by_user_id=initiated_by_user_id,
        initiated_by_name=initiated_by_name,
    ):
        added += 1
        journal_lines.append(_VIEW_PROPERTIES_PANEL_STUDIO_VIEW_TYPES_FIX_DESCRIPTION)

    return added, journal_lines


OBJECT_TAB_MENU_IN_TAB_RUNTIME_FIX_SLUG = "object-tab-menu-in-tab-runtime-fix-20260607"

_OBJECT_TAB_MENU_IN_TAB_RUNTIME_FIX_DESCRIPTION = (
    "Fix menuInTab runtime: tabSettings сохраняются в update_view и publish normalize; "
    "Office header читает activeTab.menuInTab; диагностика MENU_IN_TAB_* за debug flag."
)


def _ensure_object_tab_menu_in_tab_runtime_fix_dashboard_notes(
    db: Session,
    *,
    initiated_by_user_id: int | None,
    initiated_by_name: str | None,
) -> tuple[int, list[str]]:
    stage = (
        db.query(PlatformImplementationStage)
        .filter(PlatformImplementationStage.slug == "designer-foundation")
        .one_or_none()
    )
    related_stage_id = stage.id if stage is not None else None
    added = 0
    journal_lines: list[str] = []

    if _add_activity(
        db,
        slug=OBJECT_TAB_MENU_IN_TAB_RUNTIME_FIX_SLUG,
        title="Fix: menuInTab в Office runtime",
        description=_OBJECT_TAB_MENU_IN_TAB_RUNTIME_FIX_DESCRIPTION,
        result=_OBJECT_TAB_MENU_IN_TAB_RUNTIME_FIX_DESCRIPTION,
        activity_type=PlatformActivityType.MILESTONE.value,
        related_stage_id=related_stage_id,
        initiated_by_user_id=initiated_by_user_id,
        initiated_by_name=initiated_by_name,
    ):
        added += 1
        journal_lines.append(_OBJECT_TAB_MENU_IN_TAB_RUNTIME_FIX_DESCRIPTION)

    return added, journal_lines


OBJECT_TAB_MENU_IN_TAB_LAYOUT_FIX_SLUG = "object-tab-menu-in-tab-layout-fix-20260607"

_OBJECT_TAB_MENU_IN_TAB_LAYOUT_FIX_DESCRIPTION = (
    "Bugfix menuInTab layout: Office переносит меню во вкладку (Архитектура ▾); "
    "при menuInTab=true collapse пустого object header — контент начинается сразу "
    "под строкой вкладок."
)


def _ensure_object_tab_menu_in_tab_layout_fix_dashboard_notes(
    db: Session,
    *,
    initiated_by_user_id: int | None,
    initiated_by_name: str | None,
) -> tuple[int, list[str]]:
    stage = (
        db.query(PlatformImplementationStage)
        .filter(PlatformImplementationStage.slug == "designer-foundation")
        .one_or_none()
    )
    related_stage_id = stage.id if stage is not None else None
    added = 0
    journal_lines: list[str] = []

    if _add_activity(
        db,
        slug=OBJECT_TAB_MENU_IN_TAB_LAYOUT_FIX_SLUG,
        title="Bugfix: menuInTab layout в Office",
        description=_OBJECT_TAB_MENU_IN_TAB_LAYOUT_FIX_DESCRIPTION,
        result=_OBJECT_TAB_MENU_IN_TAB_LAYOUT_FIX_DESCRIPTION,
        activity_type=PlatformActivityType.MILESTONE.value,
        related_stage_id=related_stage_id,
        initiated_by_user_id=initiated_by_user_id,
        initiated_by_name=initiated_by_name,
    ):
        added += 1
        journal_lines.append(_OBJECT_TAB_MENU_IN_TAB_LAYOUT_FIX_DESCRIPTION)

    return added, journal_lines


OBJECT_TAB_MENU_IN_TAB_TRIGGER_SYNC_FIX_SLUG = (
    "object-tab-menu-in-tab-trigger-sync-fix-20260607"
)

_OBJECT_TAB_MENU_IN_TAB_TRIGGER_SYNC_FIX_DESCRIPTION = (
    "Bugfix menuInTab: Office рендерит ObjectContextMenuTrigger во вкладке по "
    "resolvedActiveTab.menuInTab и resolvedActiveKey; устранён рассинхрон "
    "resolvedActiveTab и tabs.map (tab.menuInTab)."
)


def _ensure_object_tab_menu_in_tab_trigger_sync_fix_dashboard_notes(
    db: Session,
    *,
    initiated_by_user_id: int | None,
    initiated_by_name: str | None,
) -> tuple[int, list[str]]:
    stage = (
        db.query(PlatformImplementationStage)
        .filter(PlatformImplementationStage.slug == "designer-foundation")
        .one_or_none()
    )
    related_stage_id = stage.id if stage is not None else None
    added = 0
    journal_lines: list[str] = []

    if _add_activity(
        db,
        slug=OBJECT_TAB_MENU_IN_TAB_TRIGGER_SYNC_FIX_SLUG,
        title="Bugfix: menuInTab trigger во вкладке",
        description=_OBJECT_TAB_MENU_IN_TAB_TRIGGER_SYNC_FIX_DESCRIPTION,
        result=_OBJECT_TAB_MENU_IN_TAB_TRIGGER_SYNC_FIX_DESCRIPTION,
        activity_type=PlatformActivityType.MILESTONE.value,
        related_stage_id=related_stage_id,
        initiated_by_user_id=initiated_by_user_id,
        initiated_by_name=initiated_by_name,
    ):
        added += 1
        journal_lines.append(_OBJECT_TAB_MENU_IN_TAB_TRIGGER_SYNC_FIX_DESCRIPTION)

    return added, journal_lines


OBJECT_TAB_MENU_IN_TAB_WORKSPACE_TAB_FIX_SLUG = (
    "object-tab-menu-in-tab-workspace-tab-fix-20260607"
)

_OBJECT_TAB_MENU_IN_TAB_WORKSPACE_TAB_FIX_DESCRIPTION = (
    "Bugfix menuInTab: меню во вкладке пространства (WorkspaceRuntimeTabsBar) "
    "при hideObjectTabBar; bridge publishPortalObjectViewHeader; удалены window debug flags."
)


def _ensure_object_tab_menu_in_tab_workspace_tab_fix_dashboard_notes(
    db: Session,
    *,
    initiated_by_user_id: int | None,
    initiated_by_name: str | None,
) -> tuple[int, list[str]]:
    stage = (
        db.query(PlatformImplementationStage)
        .filter(PlatformImplementationStage.slug == "designer-foundation")
        .one_or_none()
    )
    related_stage_id = stage.id if stage is not None else None
    added = 0
    journal_lines: list[str] = []

    if _add_activity(
        db,
        slug=OBJECT_TAB_MENU_IN_TAB_WORKSPACE_TAB_FIX_SLUG,
        title="Bugfix: menuInTab во вкладке workspace",
        description=_OBJECT_TAB_MENU_IN_TAB_WORKSPACE_TAB_FIX_DESCRIPTION,
        result=_OBJECT_TAB_MENU_IN_TAB_WORKSPACE_TAB_FIX_DESCRIPTION,
        activity_type=PlatformActivityType.MILESTONE.value,
        related_stage_id=related_stage_id,
        initiated_by_user_id=initiated_by_user_id,
        initiated_by_name=initiated_by_name,
    ):
        added += 1
        journal_lines.append(_OBJECT_TAB_MENU_IN_TAB_WORKSPACE_TAB_FIX_DESCRIPTION)

    return added, journal_lines


PLAN_VIEW_TARGET_UI_CHANGELOG_SLUG = "plan-view-target-ui-20260607"

_PLAN_VIEW_TARGET_UI_CHANGELOG_DESCRIPTION = (
    "Plan target UI: три зоны (дерево 35% + карточка 65% + нижняя панель 30%); "
    "drag-and-drop reparent через Relation Engine; rollup статусов/готовности; "
    "вкладки Активности/Комментарии/История/Файлы/Связи/Задачи; "
    "Office → Object Tab → План."
)


def _ensure_plan_view_target_ui_dashboard_notes(
    db: Session,
    *,
    initiated_by_user_id: int | None,
    initiated_by_name: str | None,
) -> tuple[int, list[str]]:
    stage = (
        db.query(PlatformImplementationStage)
        .filter(PlatformImplementationStage.slug == "designer-foundation")
        .one_or_none()
    )
    related_stage_id = stage.id if stage is not None else None
    added = 0
    journal_lines: list[str] = []

    if _add_activity(
        db,
        slug=PLAN_VIEW_TARGET_UI_CHANGELOG_SLUG,
        title="Plan: целевой интерфейс (дерево + карточка + вкладки)",
        description=_PLAN_VIEW_TARGET_UI_CHANGELOG_DESCRIPTION,
        result=_PLAN_VIEW_TARGET_UI_CHANGELOG_DESCRIPTION,
        activity_type=PlatformActivityType.MILESTONE.value,
        related_stage_id=related_stage_id,
        initiated_by_user_id=initiated_by_user_id,
        initiated_by_name=initiated_by_name,
    ):
        added += 1
        journal_lines.append(_PLAN_VIEW_TARGET_UI_CHANGELOG_DESCRIPTION)

    return added, journal_lines


PLAN_SELF_RELATION_UNIVERSAL_CHANGELOG_SLUG = "plan-self-relation-universal-empty-states-20260607"

_PLAN_SELF_RELATION_UNIVERSAL_CHANGELOG_DESCRIPTION = (
    "Plan self-relation universal: isSelfRelationDefinition по source/target object type; "
    "Plan использует hierarchyRelationKey из contract (не task_subtask); "
    "раздельные empty states настройки и данных; предупреждение для one_to_one."
)


def _ensure_plan_self_relation_universal_dashboard_notes(
    db: Session,
    *,
    initiated_by_user_id: int | None,
    initiated_by_name: str | None,
) -> tuple[int, list[str]]:
    stage = (
        db.query(PlatformImplementationStage)
        .filter(PlatformImplementationStage.slug == "designer-foundation")
        .one_or_none()
    )
    related_stage_id = stage.id if stage is not None else None
    added = 0
    journal_lines: list[str] = []

    if _add_activity(
        db,
        slug=PLAN_SELF_RELATION_UNIVERSAL_CHANGELOG_SLUG,
        title="Plan: универсальная self-relation и empty states",
        description=_PLAN_SELF_RELATION_UNIVERSAL_CHANGELOG_DESCRIPTION,
        result=_PLAN_SELF_RELATION_UNIVERSAL_CHANGELOG_DESCRIPTION,
        activity_type=PlatformActivityType.MILESTONE.value,
        related_stage_id=related_stage_id,
        initiated_by_user_id=initiated_by_user_id,
        initiated_by_name=initiated_by_name,
    ):
        added += 1
        journal_lines.append(_PLAN_SELF_RELATION_UNIVERSAL_CHANGELOG_DESCRIPTION)

    return added, journal_lines


PLAN_VIEW_PUBLISH_RUNTIME_CHANGELOG_SLUG = "plan-view-publish-runtime-settings-20260607"

_PLAN_VIEW_PUBLISH_RUNTIME_CHANGELOG_DESCRIPTION = (
    "Plan view publish/runtime: objectView.presentation.plan сохраняется в draft, "
    "публикуется в catalog snapshot и читается Office; scaffold при create/publish; "
    "Save вкладки Plan из header Studio."
)


def _ensure_plan_view_publish_runtime_dashboard_notes(
    db: Session,
    *,
    initiated_by_user_id: int | None,
    initiated_by_name: str | None,
) -> tuple[int, list[str]]:
    stage = (
        db.query(PlatformImplementationStage)
        .filter(PlatformImplementationStage.slug == "designer-foundation")
        .one_or_none()
    )
    related_stage_id = stage.id if stage is not None else None
    added = 0
    journal_lines: list[str] = []

    if _add_activity(
        db,
        slug=PLAN_VIEW_PUBLISH_RUNTIME_CHANGELOG_SLUG,
        title="Plan view: публикация и runtime-настройки",
        description=_PLAN_VIEW_PUBLISH_RUNTIME_CHANGELOG_DESCRIPTION,
        result=_PLAN_VIEW_PUBLISH_RUNTIME_CHANGELOG_DESCRIPTION,
        activity_type=PlatformActivityType.MILESTONE.value,
        related_stage_id=related_stage_id,
        initiated_by_user_id=initiated_by_user_id,
        initiated_by_name=initiated_by_name,
    ):
        added += 1
        journal_lines.append(_PLAN_VIEW_PUBLISH_RUNTIME_CHANGELOG_DESCRIPTION)

    return added, journal_lines


STUDIO_OBJECT_VIEW_DRAFT_PREVIEW_SYNC_CHANGELOG_SLUG = (
    "studio-object-view-draft-preview-sync-20260607"
)

_STUDIO_OBJECT_VIEW_DRAFT_PREVIEW_SYNC_CHANGELOG_DESCRIPTION = (
    "Studio Preview draft sync: после создания вкладки обновляются ObjectTypePreviewTabContext "
    "и RuntimePreviewTab (schemaRevision); Save активен для Studio draft; публикация не обязательна."
)


def _ensure_studio_object_view_draft_preview_sync_dashboard_notes(
    db: Session,
    *,
    initiated_by_user_id: int | None,
    initiated_by_name: str | None,
) -> tuple[int, list[str]]:
    stage = (
        db.query(PlatformImplementationStage)
        .filter(PlatformImplementationStage.slug == "designer-foundation")
        .one_or_none()
    )
    related_stage_id = stage.id if stage is not None else None
    added = 0
    journal_lines: list[str] = []

    if _add_activity(
        db,
        slug=STUDIO_OBJECT_VIEW_DRAFT_PREVIEW_SYNC_CHANGELOG_SLUG,
        title="Studio Preview: синхронизация draft-вкладок после создания",
        description=_STUDIO_OBJECT_VIEW_DRAFT_PREVIEW_SYNC_CHANGELOG_DESCRIPTION,
        result=_STUDIO_OBJECT_VIEW_DRAFT_PREVIEW_SYNC_CHANGELOG_DESCRIPTION,
        activity_type=PlatformActivityType.MILESTONE.value,
        related_stage_id=related_stage_id,
        initiated_by_user_id=initiated_by_user_id,
        initiated_by_name=initiated_by_name,
    ):
        added += 1
        journal_lines.append(_STUDIO_OBJECT_VIEW_DRAFT_PREVIEW_SYNC_CHANGELOG_DESCRIPTION)

    return added, journal_lines


PLATFORM_MODAL_HELP_CHANGELOG_SLUG = "platform-modal-help-hover-card-20260607"

_PLATFORM_MODAL_HELP_CHANGELOG_DESCRIPTION = (
    "PlatformModalHelp: единая всплывающая справка в footer (hover/focus/Escape), "
    "portal-карточка без изменения высоты footer; Create Tab Modal — текст «Создание вкладки»."
)


def _ensure_platform_modal_help_dashboard_notes(
    db: Session,
    *,
    initiated_by_user_id: int | None,
    initiated_by_name: str | None,
) -> tuple[int, list[str]]:
    stage = (
        db.query(PlatformImplementationStage)
        .filter(PlatformImplementationStage.slug == "designer-foundation")
        .one_or_none()
    )
    related_stage_id = stage.id if stage is not None else None
    added = 0
    journal_lines: list[str] = []

    if _add_activity(
        db,
        slug=PLATFORM_MODAL_HELP_CHANGELOG_SLUG,
        title="PlatformModalHelp: всплывающая справка в footer",
        description=_PLATFORM_MODAL_HELP_CHANGELOG_DESCRIPTION,
        result=_PLATFORM_MODAL_HELP_CHANGELOG_DESCRIPTION,
        activity_type=PlatformActivityType.MILESTONE.value,
        related_stage_id=related_stage_id,
        initiated_by_user_id=initiated_by_user_id,
        initiated_by_name=initiated_by_name,
    ):
        added += 1
        journal_lines.append(_PLATFORM_MODAL_HELP_CHANGELOG_DESCRIPTION)

    return added, journal_lines


PLATFORM_ACCENT_ZONES_CHANGELOG_SLUG = "platform-accent-zones-studio-office-20260607"

_PLATFORM_ACCENT_ZONES_CHANGELOG_DESCRIPTION = (
    "Studio/Office accent zones: data-platform-zone на body и PlatformModal; "
    "semantic tokens --platform-accent (Studio purple #7c3aed, Office blue #2563ff); "
    "Create Tab Modal и footer PlatformModal наследуют тему без хардкода."
)


def _ensure_platform_accent_zones_dashboard_notes(
    db: Session,
    *,
    initiated_by_user_id: int | None,
    initiated_by_name: str | None,
) -> tuple[int, list[str]]:
    stage = (
        db.query(PlatformImplementationStage)
        .filter(PlatformImplementationStage.slug == "designer-foundation")
        .one_or_none()
    )
    related_stage_id = stage.id if stage is not None else None
    added = 0
    journal_lines: list[str] = []

    if _add_activity(
        db,
        slug=PLATFORM_ACCENT_ZONES_CHANGELOG_SLUG,
        title="Studio/Office: цветовые зоны акцента (purple/blue)",
        description=_PLATFORM_ACCENT_ZONES_CHANGELOG_DESCRIPTION,
        result=_PLATFORM_ACCENT_ZONES_CHANGELOG_DESCRIPTION,
        activity_type=PlatformActivityType.MILESTONE.value,
        related_stage_id=related_stage_id,
        initiated_by_user_id=initiated_by_user_id,
        initiated_by_name=initiated_by_name,
    ):
        added += 1
        journal_lines.append(_PLATFORM_ACCENT_ZONES_CHANGELOG_DESCRIPTION)

    return added, journal_lines


CREATE_RELATION_DEFINITION_MODAL_FOOTER_CHANGELOG_SLUG = (
    "create-relation-definition-modal-footer-20260607"
)

_CREATE_RELATION_DEFINITION_MODAL_FOOTER_CHANGELOG_DESCRIPTION = (
    "Create Relation Modal UX: фиксированный footer PlatformModal "
    "[Отмена][Создать связь], scroll только в body, minHeight 480px; "
    "Studio → Object Type → Relations → Создать связь."
)


def _ensure_create_relation_definition_modal_footer_dashboard_notes(
    db: Session,
    *,
    initiated_by_user_id: int | None,
    initiated_by_name: str | None,
) -> tuple[int, list[str]]:
    stage = (
        db.query(PlatformImplementationStage)
        .filter(PlatformImplementationStage.slug == "designer-foundation")
        .one_or_none()
    )
    related_stage_id = stage.id if stage is not None else None
    added = 0
    journal_lines: list[str] = []

    if _add_activity(
        db,
        slug=CREATE_RELATION_DEFINITION_MODAL_FOOTER_CHANGELOG_SLUG,
        title="Create Relation Modal: footer и «Создать связь»",
        description=_CREATE_RELATION_DEFINITION_MODAL_FOOTER_CHANGELOG_DESCRIPTION,
        result=_CREATE_RELATION_DEFINITION_MODAL_FOOTER_CHANGELOG_DESCRIPTION,
        activity_type=PlatformActivityType.MILESTONE.value,
        related_stage_id=related_stage_id,
        initiated_by_user_id=initiated_by_user_id,
        initiated_by_name=initiated_by_name,
    ):
        added += 1
        journal_lines.append(_CREATE_RELATION_DEFINITION_MODAL_FOOTER_CHANGELOG_DESCRIPTION)

    return added, journal_lines


RELATION_FIELD_AUTO_ROLE_CHANGELOG_SLUG = "relation-field-auto-role-20260607"

_RELATION_FIELD_AUTO_ROLE_CHANGELOG_DESCRIPTION = (
    "Bugfix relation field: роль и кардинальность определяются автоматически по "
    "relation definition; Create Field Modal больше не отправляет неверный role; "
    "Studio → Object Type → Fields → Создать поле → Связь."
)


def _ensure_relation_field_auto_role_dashboard_notes(
    db: Session,
    *,
    initiated_by_user_id: int | None,
    initiated_by_name: str | None,
) -> tuple[int, list[str]]:
    stage = (
        db.query(PlatformImplementationStage)
        .filter(PlatformImplementationStage.slug == "designer-foundation")
        .one_or_none()
    )
    related_stage_id = stage.id if stage is not None else None
    added = 0
    journal_lines: list[str] = []

    if _add_activity(
        db,
        slug=RELATION_FIELD_AUTO_ROLE_CHANGELOG_SLUG,
        title="Relation field: auto role/cardinality (422 fix)",
        description=_RELATION_FIELD_AUTO_ROLE_CHANGELOG_DESCRIPTION,
        result=_RELATION_FIELD_AUTO_ROLE_CHANGELOG_DESCRIPTION,
        activity_type=PlatformActivityType.MILESTONE.value,
        related_stage_id=related_stage_id,
        initiated_by_user_id=initiated_by_user_id,
        initiated_by_name=initiated_by_name,
    ):
        added += 1
        journal_lines.append(_RELATION_FIELD_AUTO_ROLE_CHANGELOG_DESCRIPTION)

    return added, journal_lines


_OBJECT_TABLE_EXCEL_IMPORT_DEFAULT_VALUES_CHANGELOG_DESCRIPTION = (
    "Excel Import: обязательные поля на шаге «Колонки» — источник «Колонка Excel» "
    "или «Значение по умолчанию»; defaultValues-сервис подставляет значение во все "
    "создаваемые записи, валидация не требует колонку в Excel."
)


def _ensure_object_table_excel_import_default_values_dashboard_notes(
    db: Session,
    *,
    initiated_by_user_id: int | None,
    initiated_by_name: str | None,
) -> tuple[int, list[str]]:
    stage = (
        db.query(PlatformImplementationStage)
        .filter(PlatformImplementationStage.slug == "object-table-ut-parity")
        .one_or_none()
    )
    related_stage_id = stage.id if stage is not None else None
    added = 0
    journal_lines: list[str] = []

    if _add_activity(
        db,
        slug=OBJECT_TABLE_EXCEL_IMPORT_DEFAULT_VALUES_CHANGELOG_SLUG,
        title="Excel Import: default values для обязательных полей",
        description=_OBJECT_TABLE_EXCEL_IMPORT_DEFAULT_VALUES_CHANGELOG_DESCRIPTION,
        result=_OBJECT_TABLE_EXCEL_IMPORT_DEFAULT_VALUES_CHANGELOG_DESCRIPTION,
        activity_type=PlatformActivityType.MILESTONE.value,
        related_stage_id=related_stage_id,
        initiated_by_user_id=initiated_by_user_id,
        initiated_by_name=initiated_by_name,
    ):
        added += 1
        journal_lines.append(_OBJECT_TABLE_EXCEL_IMPORT_DEFAULT_VALUES_CHANGELOG_DESCRIPTION)

    return added, journal_lines


OBJECT_TABLE_EXCEL_IMPORT_REVIEW_UX_CHANGELOG_SLUG = (
    "object-table-excel-import-review-ux-20260606"
)

_OBJECT_TABLE_EXCEL_IMPORT_REVIEW_UX_CHANGELOG_DESCRIPTION = (
    "Excel Import UX: шаг «Проверка» объясняет несопоставленные обязательные поля, "
    "показывает подсказку при нуле валидных строк и кнопку «Исправить сопоставление»; "
    "footer [Назад][Исправить][Импорт] выровнен справа."
)


def _ensure_object_table_excel_import_review_ux_dashboard_notes(
    db: Session,
    *,
    initiated_by_user_id: int | None,
    initiated_by_name: str | None,
) -> tuple[int, list[str]]:
    stage = (
        db.query(PlatformImplementationStage)
        .filter(PlatformImplementationStage.slug == "object-table-ut-parity")
        .one_or_none()
    )
    related_stage_id = stage.id if stage is not None else None
    added = 0
    journal_lines: list[str] = []

    if _add_activity(
        db,
        slug=OBJECT_TABLE_EXCEL_IMPORT_REVIEW_UX_CHANGELOG_SLUG,
        title="Excel Import: UX шага «Проверка»",
        description=_OBJECT_TABLE_EXCEL_IMPORT_REVIEW_UX_CHANGELOG_DESCRIPTION,
        result=_OBJECT_TABLE_EXCEL_IMPORT_REVIEW_UX_CHANGELOG_DESCRIPTION,
        activity_type=PlatformActivityType.MILESTONE.value,
        related_stage_id=related_stage_id,
        initiated_by_user_id=initiated_by_user_id,
        initiated_by_name=initiated_by_name,
    ):
        added += 1
        journal_lines.append(_OBJECT_TABLE_EXCEL_IMPORT_REVIEW_UX_CHANGELOG_DESCRIPTION)

    return added, journal_lines


OBJECT_TABLE_EXCEL_IMPORT_VALUE_MAPPING_AUTH_API_FIX_CHANGELOG_SLUG = (
    "object-table-excel-import-value-mapping-auth-api-fix-20260606"
)

_OBJECT_TABLE_EXCEL_IMPORT_VALUE_MAPPING_AUTH_API_FIX_CHANGELOG_DESCRIPTION = (
    "Excel Import bugfix: loadImportUsersForSelect импортирует getUsers из "
    "frontend/src/api/authApi.js — Vite снова собирает frontend, шаг "
    "«Сопоставление значений» загружает каталог пользователей."
)


def _ensure_object_table_excel_import_value_mapping_auth_api_fix_dashboard_notes(
    db: Session,
    *,
    initiated_by_user_id: int | None,
    initiated_by_name: str | None,
) -> tuple[int, list[str]]:
    stage = (
        db.query(PlatformImplementationStage)
        .filter(PlatformImplementationStage.slug == "object-table-ut-parity")
        .one_or_none()
    )
    related_stage_id = stage.id if stage is not None else None
    added = 0
    journal_lines: list[str] = []

    if _add_activity(
        db,
        slug=OBJECT_TABLE_EXCEL_IMPORT_VALUE_MAPPING_AUTH_API_FIX_CHANGELOG_SLUG,
        title="Excel Import: fix authApi import для value mapping",
        description=_OBJECT_TABLE_EXCEL_IMPORT_VALUE_MAPPING_AUTH_API_FIX_CHANGELOG_DESCRIPTION,
        result=_OBJECT_TABLE_EXCEL_IMPORT_VALUE_MAPPING_AUTH_API_FIX_CHANGELOG_DESCRIPTION,
        activity_type=PlatformActivityType.MILESTONE.value,
        related_stage_id=related_stage_id,
        initiated_by_user_id=initiated_by_user_id,
        initiated_by_name=initiated_by_name,
    ):
        added += 1
        journal_lines.append(
            _OBJECT_TABLE_EXCEL_IMPORT_VALUE_MAPPING_AUTH_API_FIX_CHANGELOG_DESCRIPTION
        )

    return added, journal_lines


OBJECT_TABLE_RELATION_FILTER_HISTORY_SLUG = (
    "object-table-relation-filter-20260606"
)
OBJECT_TABLE_RELATION_FILTER_CHANGELOG_SLUG = (
    "object-table-relation-filter-changelog-20260606"
)

_OBJECT_TABLE_RELATION_FILTER_HISTORY_DESCRIPTION = (
    "Object Table: MVP-фильтрация по полям типа «Связь» — операторы равно / не равно / "
    "заполнено / не заполнено, выбор связанной записи по названию в модалке фильтров."
)

_OBJECT_TABLE_RELATION_FILTER_CHANGELOG_DESCRIPTION = (
    "Фильтрация связей выполняется на backend через runtime_relation_instances "
    "(без value_json); UI selector ищет записи целевого типа и восстанавливает title "
    "сохранённых и быстрых фильтров."
)


def _ensure_object_table_relation_filter_dashboard_notes(
    db: Session,
    *,
    initiated_by_user_id: int | None,
    initiated_by_name: str | None,
) -> tuple[int, list[str]]:
    stage = (
        db.query(PlatformImplementationStage)
        .filter(PlatformImplementationStage.slug == "object-table-ut-parity")
        .one_or_none()
    )
    related_stage_id = stage.id if stage is not None else None
    added = 0
    journal_lines: list[str] = []

    if _add_activity(
        db,
        slug=OBJECT_TABLE_RELATION_FILTER_HISTORY_SLUG,
        title="Object Table: фильтрация по связям (MVP)",
        description=_OBJECT_TABLE_RELATION_FILTER_HISTORY_DESCRIPTION,
        result=_OBJECT_TABLE_RELATION_FILTER_CHANGELOG_DESCRIPTION,
        activity_type=PlatformActivityType.MILESTONE.value,
        related_stage_id=related_stage_id,
        initiated_by_user_id=initiated_by_user_id,
        initiated_by_name=initiated_by_name,
    ):
        added += 1

    if _add_activity(
        db,
        slug=OBJECT_TABLE_RELATION_FILTER_CHANGELOG_SLUG,
        title="Журнал изменений: фильтрация по связям Object Table",
        description=_OBJECT_TABLE_RELATION_FILTER_CHANGELOG_DESCRIPTION,
        result=_OBJECT_TABLE_RELATION_FILTER_CHANGELOG_DESCRIPTION,
        activity_type=PlatformActivityType.MILESTONE.value,
        related_stage_id=related_stage_id,
        initiated_by_user_id=initiated_by_user_id,
        initiated_by_name=initiated_by_name,
    ):
        added += 1
        journal_lines.append(_OBJECT_TABLE_RELATION_FILTER_CHANGELOG_DESCRIPTION)

    return added, journal_lines


OBJECT_TABLE_MULTI_SORT_HISTORY_SLUG = "object-table-multi-sort-20260605"
OBJECT_TABLE_MULTI_SORT_CHANGELOG_SLUG = "object-table-multi-sort-changelog-20260605"

_OBJECT_TABLE_MULTI_SORT_HISTORY_DESCRIPTION = (
    "Object Table: многоколоночная сортировка в Object View — несколько уровней "
    "ORDER BY, панель «Сортировки», Shift+клик по заголовку, сохранение в представлении."
)

_OBJECT_TABLE_MULTI_SORT_CHANGELOG_DESCRIPTION = (
    "Добавлена многоколоночная сортировка Object Table: query.sort.rules[], "
    "runtime sorts API, панель управления порядком, совместимость со старыми представлениями."
)


def _ensure_object_table_multi_sort_dashboard_notes(
    db: Session,
    *,
    initiated_by_user_id: int | None,
    initiated_by_name: str | None,
) -> tuple[int, list[str]]:
    stage = (
        db.query(PlatformImplementationStage)
        .filter(PlatformImplementationStage.slug == "object-table-ut-parity")
        .one_or_none()
    )
    related_stage_id = stage.id if stage is not None else None
    added = 0
    journal_lines: list[str] = []

    if _add_activity(
        db,
        slug=OBJECT_TABLE_MULTI_SORT_HISTORY_SLUG,
        title="Object Table: многоколоночная сортировка",
        description=_OBJECT_TABLE_MULTI_SORT_HISTORY_DESCRIPTION,
        result=_OBJECT_TABLE_MULTI_SORT_CHANGELOG_DESCRIPTION,
        activity_type=PlatformActivityType.MILESTONE.value,
        related_stage_id=related_stage_id,
        initiated_by_user_id=initiated_by_user_id,
        initiated_by_name=initiated_by_name,
    ):
        added += 1

    if _add_activity(
        db,
        slug=OBJECT_TABLE_MULTI_SORT_CHANGELOG_SLUG,
        title="Журнал изменений: многоколоночная сортировка Object Table",
        description=_OBJECT_TABLE_MULTI_SORT_CHANGELOG_DESCRIPTION,
        result=_OBJECT_TABLE_MULTI_SORT_CHANGELOG_DESCRIPTION,
        activity_type=PlatformActivityType.MILESTONE.value,
        related_stage_id=related_stage_id,
        initiated_by_user_id=initiated_by_user_id,
        initiated_by_name=initiated_by_name,
    ):
        added += 1
        journal_lines.append(_OBJECT_TABLE_MULTI_SORT_CHANGELOG_DESCRIPTION)

    return added, journal_lines


def _average_readiness(values: dict[str, int | None]) -> int | None:

    readiness_values = [value for value in values.values() if value is not None]

    if not readiness_values:

        return None

    return round(sum(readiness_values) / len(readiness_values))





def _snapshot_stage_work(stage: PlatformImplementationStage) -> dict[str, object]:

    return {

        "readiness": stage.cached_readiness,

        "completed": parse_json_list(stage.completed_items),

        "current": parse_json_list(stage.current_tasks),

        "title": stage.title,

    }





def _collect_stage_work_changes(

    previous_stage_work: dict[str, dict[str, object]],

    analysis,

) -> list[str]:

    previous = previous_stage_work.get(analysis.slug, {})

    previous_completed = set(previous.get("completed", []))

    previous_current = set(previous.get("current", []))

    changes: list[str] = []



    for work in sorted(set(analysis.completed_items) - previous_completed):

        changes.append(f'{analysis.title}: "{work}" → done')



    for work in sorted(set(analysis.current_tasks) - previous_current):

        if work not in analysis.completed_items:

            changes.append(f'{analysis.title}: "{work}" → in progress')



    previous_readiness = previous.get("readiness")

    if previous_readiness is not None and previous_readiness != analysis.readiness:

        changes.append(

            f"{analysis.title}: readiness {previous_readiness}% → {analysis.readiness}%"

        )



    return changes





def refresh_platform_dashboard(db: Session, repo_root=None, initiated_by=None) -> RefreshResult:

    ctx = build_scan_context(repo_root)

    now = utc_now()

    naive_now = now.replace(tzinfo=None)



    initiated_by_user_id = getattr(initiated_by, "id", None)

    initiated_by_name = _resolve_initiated_by_name(initiated_by)



    previous_components = {

        item.slug: item.cached_readiness

        for item in db.query(PlatformComponent).all()

    }

    previous_stages = {

        item.slug: item.cached_readiness

        for item in db.query(PlatformImplementationStage).all()

    }

    previous_stage_work = {

        item.slug: _snapshot_stage_work(item)

        for item in db.query(PlatformImplementationStage).all()

    }

    overall_readiness_before = _average_readiness(previous_components)

    fingerprint = compute_analyzer_fingerprint(ctx.repo_root)

    changed_work_items: list[str] = []

    components = analyze_components(ctx)

    stages = analyze_stages(ctx, components)

    activities_added = 0



    quality_issues_open = (

        db.query(QualityIssue)

        .filter(QualityIssue.status != QualityIssueStatus.CLOSED.value)

        .count()

    )

    quality_issues_total = db.query(QualityIssue).count()



    db.query(PlatformTask).delete()



    for analysis in components:

        component = db.query(PlatformComponent).filter(PlatformComponent.slug == analysis.slug).one_or_none()

        if component is None:

            component = PlatformComponent(slug=analysis.slug, title=analysis.title)

            db.add(component)



        component.title = analysis.title

        component.description = analysis.description

        component.status = analysis.status

        component.cached_readiness = analysis.readiness

        component.completed_items = dump_json_list(analysis.completed_items)

        component.remaining_items = dump_json_list(analysis.remaining_items)

        component.dependencies = dump_json_list(analysis.dependencies)

        component.architecture_debt = dump_json_list(analysis.architecture_debt)

        component.updated_at = naive_now

        db.flush()



        for evidence in analysis.evidence:

            if evidence.weight <= 0:

                continue

            db.add(

                PlatformTask(

                    title=evidence.label,

                    description=evidence.key,

                    component_id=component.id,

                    status=PlatformTaskStatus.DONE.value

                    if evidence.passed

                    else PlatformTaskStatus.PLANNED.value,

                    priority=PlatformTaskPriority.MEDIUM.value,

                    created_at=naive_now,

                    updated_at=naive_now,

                    closed_at=naive_now if evidence.passed else None,

                )

            )



        old_readiness = previous_components.get(analysis.slug)

        if old_readiness is not None and old_readiness != analysis.readiness:

            activities_added += _add_activity(

                db,

                slug=f"readiness-component-{analysis.slug}-{now.strftime('%Y%m%d%H%M%S%f')}",

                title=f'Готовность контура "{analysis.title}" изменена',

                description=f"Было: {old_readiness}%\nСтало: {analysis.readiness}%",

                result="Dashboard Analyzer пересчитал готовность архитектурного контура.",

                activity_type=PlatformActivityType.READINESS_COMPONENT.value,

                meta={

                    "entity_kind": "component",

                    "entity_slug": analysis.slug,

                    "readiness_before": old_readiness,

                    "readiness_after": analysis.readiness,

                },

                related_component_id=component.id,

                initiated_by_user_id=initiated_by_user_id,

                initiated_by_name=initiated_by_name,

            )



    for analysis in stages:

        if analysis.slug == YASII_IMPLEMENTATION_STAGE_SLUG:

            continue

        stage = (

            db.query(PlatformImplementationStage)

            .filter(PlatformImplementationStage.slug == analysis.slug)

            .one_or_none()

        )

        if stage is None:

            stage = PlatformImplementationStage(slug=analysis.slug, title=analysis.title)

            db.add(stage)



        stage.title = analysis.title

        stage.description = analysis.description

        stage.status = analysis.status

        stage.cached_readiness = analysis.readiness

        stage.order_index = analysis.order_index

        stage.current_position = analysis.current_position

        stage.completed_items = dump_json_list(analysis.completed_items)

        stage.remaining_items = dump_json_list(analysis.remaining_items)

        stage.current_tasks = dump_json_list(analysis.current_tasks)

        stage.next_tasks = dump_json_list(analysis.next_tasks)

        stage.blockers = dump_json_list(analysis.blockers)

        stage.completion_criteria = dump_json_list(analysis.completion_criteria)

        stage.updated_at = naive_now

        db.flush()



        for task_title in analysis.completed_items:

            db.add(

                PlatformTask(

                    title=task_title,

                    description="roadmap_work",

                    stage_id=stage.id,

                    status=PlatformTaskStatus.DONE.value,

                    priority=PlatformTaskPriority.MEDIUM.value,

                    created_at=naive_now,

                    updated_at=naive_now,

                    closed_at=naive_now,

                )

            )

        for task_title in analysis.current_tasks:

            db.add(

                PlatformTask(

                    title=task_title,

                    description="roadmap_work",

                    stage_id=stage.id,

                    status=PlatformTaskStatus.IN_PROGRESS.value,

                    priority=PlatformTaskPriority.MEDIUM.value,

                    created_at=naive_now,

                    updated_at=naive_now,

                )

            )

        for task_title in analysis.next_tasks:

            db.add(

                PlatformTask(

                    title=task_title,

                    description="roadmap_work",

                    stage_id=stage.id,

                    status=PlatformTaskStatus.PLANNED.value,

                    priority=PlatformTaskPriority.MEDIUM.value,

                    created_at=naive_now,

                    updated_at=naive_now,

                )

            )



        changed_work_items.extend(_collect_stage_work_changes(previous_stage_work, analysis))



        old_readiness = previous_stages.get(analysis.slug)

        if old_readiness is not None and old_readiness != analysis.readiness:

            activities_added += _add_activity(

                db,

                slug=f"readiness-stage-{analysis.slug}-{now.strftime('%Y%m%d%H%M%S%f')}",

                title=f'Готовность этапа "{analysis.title}" изменена',

                description=f"Было: {old_readiness}%\nСтало: {analysis.readiness}%",

                result="Dashboard Analyzer пересчитал прогресс этапа roadmap.",

                activity_type=PlatformActivityType.READINESS_STAGE.value,

                meta={

                    "entity_kind": "stage",

                    "entity_slug": analysis.slug,

                    "readiness_before": old_readiness,

                    "readiness_after": analysis.readiness,

                },

                related_stage_id=stage.id,

                initiated_by_user_id=initiated_by_user_id,

                initiated_by_name=initiated_by_name,

            )



    for adr in ctx.docs.adr_items:

        activities_added += _add_activity(

            db,

            slug=f"adr-{adr['slug']}",

            title=f"Архитектурное решение: {adr['title']}",

            description=f"Документ {adr['path']} со статусом {adr['status']}.",

            result="Решение учтено Dashboard Analyzer при расчёте платформы.",

            activity_type=PlatformActivityType.DECISION.value,

            initiated_by_user_id=initiated_by_user_id,

            initiated_by_name=initiated_by_name,

        )



    for issue in db.query(QualityIssue).filter(QualityIssue.status == QualityIssueStatus.CLOSED.value).all():

        activities_added += _add_activity(

            db,

            slug=f"quality-closed-{issue.id}",

            title=f"Проблема качества закрыта: {issue.title}",

            description=issue.current_behavior or issue.description or "",

            result="Проблема качества закрыта и учтена в состоянии платформы.",

            activity_type=PlatformActivityType.QUALITY.value,

            related_issue_id=issue.id,

            initiated_by_user_id=initiated_by_user_id,

            initiated_by_name=initiated_by_name,

        )



    readiness_values = [item.readiness for item in components if item.readiness is not None]

    overall = round(sum(readiness_values) / len(readiness_values)) if readiness_values else None



    visibility_notes_added, visibility_journal_lines = (
        _ensure_page_visibility_single_source_dashboard_notes(
            db,
            initiated_by_user_id=initiated_by_user_id,
            initiated_by_name=initiated_by_name,
        )
    )
    activities_added += visibility_notes_added
    if visibility_journal_lines:
        changed_work_items = [*changed_work_items, *visibility_journal_lines]

    pub_notes_added, pub_journal_lines = _ensure_page_publication_places_dashboard_notes(
        db,
        initiated_by_user_id=initiated_by_user_id,
        initiated_by_name=initiated_by_name,
    )
    activities_added += pub_notes_added
    if pub_journal_lines:
        changed_work_items = [*changed_work_items, *pub_journal_lines]

    normalization_notes_added, normalization_journal_lines = (
        _ensure_page_status_normalization_dashboard_notes(
            db,
            initiated_by_user_id=initiated_by_user_id,
            initiated_by_name=initiated_by_name,
        )
    )
    activities_added += normalization_notes_added
    if normalization_journal_lines:
        changed_work_items = [*changed_work_items, *normalization_journal_lines]

    notes_added, journal_lines = _ensure_relation_field_type_dashboard_notes(
        db,
        initiated_by_user_id=initiated_by_user_id,
        initiated_by_name=initiated_by_name,
    )
    activities_added += notes_added
    if journal_lines:
        changed_work_items = [*changed_work_items, *journal_lines]

    office_views_notes_added, office_views_journal_lines = (
        _ensure_office_user_table_views_column_order_dashboard_notes(
            db,
            initiated_by_user_id=initiated_by_user_id,
            initiated_by_name=initiated_by_name,
        )
    )
    activities_added += office_views_notes_added
    if office_views_journal_lines:
        changed_work_items = [*changed_work_items, *office_views_journal_lines]

    office_default_notes_added, office_default_journal_lines = (
        _ensure_office_user_table_views_default_dashboard_notes(
            db,
            initiated_by_user_id=initiated_by_user_id,
            initiated_by_name=initiated_by_name,
        )
    )
    activities_added += office_default_notes_added
    if office_default_journal_lines:
        changed_work_items = [*changed_work_items, *office_default_journal_lines]

    office_tab_key_notes_added, office_tab_key_journal_lines = (
        _ensure_office_user_table_views_tab_key_fix_dashboard_notes(
            db,
            initiated_by_user_id=initiated_by_user_id,
            initiated_by_name=initiated_by_name,
        )
    )
    activities_added += office_tab_key_notes_added
    if office_tab_key_journal_lines:
        changed_work_items = [*changed_work_items, *office_tab_key_journal_lines]

    office_column_visibility_notes_added, office_column_visibility_journal_lines = (
        _ensure_office_user_table_views_column_visibility_dashboard_notes(
            db,
            initiated_by_user_id=initiated_by_user_id,
            initiated_by_name=initiated_by_name,
        )
    )
    activities_added += office_column_visibility_notes_added
    if office_column_visibility_journal_lines:
        changed_work_items = [
            *changed_work_items,
            *office_column_visibility_journal_lines,
        ]

    office_unsaved_guard_notes_added, office_unsaved_guard_journal_lines = (
        _ensure_office_user_view_unsaved_guard_modal_dashboard_notes(
            db,
            initiated_by_user_id=initiated_by_user_id,
            initiated_by_name=initiated_by_name,
        )
    )
    activities_added += office_unsaved_guard_notes_added
    if office_unsaved_guard_journal_lines:
        changed_work_items = [
            *changed_work_items,
            *office_unsaved_guard_journal_lines,
        ]

    object_record_number_notes_added, object_record_number_journal_lines = (
        _ensure_object_engine_record_number_dashboard_notes(
            db,
            initiated_by_user_id=initiated_by_user_id,
            initiated_by_name=initiated_by_name,
        )
    )
    activities_added += object_record_number_notes_added
    if object_record_number_journal_lines:
        changed_work_items = [
            *changed_work_items,
            *object_record_number_journal_lines,
        ]

    object_record_number_fix_added, object_record_number_fix_journal_lines = (
        _ensure_object_engine_record_number_fix_dashboard_notes(
            db,
            initiated_by_user_id=initiated_by_user_id,
            initiated_by_name=initiated_by_name,
        )
    )
    activities_added += object_record_number_fix_added
    if object_record_number_fix_journal_lines:
        changed_work_items = [
            *changed_work_items,
            *object_record_number_fix_journal_lines,
        ]

    hierarchy_delete_added, hierarchy_delete_journal_lines = (
        _ensure_object_engine_hierarchy_delete_dashboard_notes(
            db,
            initiated_by_user_id=initiated_by_user_id,
            initiated_by_name=initiated_by_name,
        )
    )
    activities_added += hierarchy_delete_added
    if hierarchy_delete_journal_lines:
        changed_work_items = [
            *changed_work_items,
            *hierarchy_delete_journal_lines,
        ]

    row_menu_added, row_menu_journal_lines = _ensure_object_engine_row_menu_dashboard_notes(
        db,
        initiated_by_user_id=initiated_by_user_id,
        initiated_by_name=initiated_by_name,
    )
    activities_added += row_menu_added
    if row_menu_journal_lines:
        changed_work_items = [
            *changed_work_items,
            *row_menu_journal_lines,
        ]

    hierarchy_labels_added, hierarchy_labels_journal_lines = (
        _ensure_object_engine_hierarchy_labels_dashboard_notes(
            db,
            initiated_by_user_id=initiated_by_user_id,
            initiated_by_name=initiated_by_name,
        )
    )
    activities_added += hierarchy_labels_added
    if hierarchy_labels_journal_lines:
        changed_work_items = [
            *changed_work_items,
            *hierarchy_labels_journal_lines,
        ]

    hierarchy_labels_publish_fix_added, hierarchy_labels_publish_fix_journal_lines = (
        _ensure_object_engine_hierarchy_labels_publish_state_fix_note(
            db,
            initiated_by_user_id=initiated_by_user_id,
            initiated_by_name=initiated_by_name,
        )
    )
    activities_added += hierarchy_labels_publish_fix_added
    if hierarchy_labels_publish_fix_journal_lines:
        changed_work_items = [
            *changed_work_items,
            *hierarchy_labels_publish_fix_journal_lines,
        ]

    bulk_selection_added, bulk_selection_journal_lines = (
        _ensure_object_engine_table_bulk_selection_dashboard_notes(
            db,
            initiated_by_user_id=initiated_by_user_id,
            initiated_by_name=initiated_by_name,
        )
    )
    activities_added += bulk_selection_added
    if bulk_selection_journal_lines:
        changed_work_items = [
            *changed_work_items,
            *bulk_selection_journal_lines,
        ]

    bulk_delete_added, bulk_delete_journal_lines = (
        _ensure_object_engine_table_bulk_delete_dashboard_notes(
            db,
            initiated_by_user_id=initiated_by_user_id,
            initiated_by_name=initiated_by_name,
        )
    )
    activities_added += bulk_delete_added
    if bulk_delete_journal_lines:
        changed_work_items = [
            *changed_work_items,
            *bulk_delete_journal_lines,
        ]

    bulk_delete_labels_added, bulk_delete_labels_journal_lines = (
        _ensure_object_engine_table_bulk_delete_labels_dashboard_note(
            db,
            initiated_by_user_id=initiated_by_user_id,
            initiated_by_name=initiated_by_name,
        )
    )
    activities_added += bulk_delete_labels_added
    if bulk_delete_labels_journal_lines:
        changed_work_items = [
            *changed_work_items,
            *bulk_delete_labels_journal_lines,
        ]

    representation_chip_added, representation_chip_journal_lines = (
        _ensure_object_engine_table_representation_chip_style_dashboard_note(
            db,
            initiated_by_user_id=initiated_by_user_id,
            initiated_by_name=initiated_by_name,
        )
    )
    activities_added += representation_chip_added
    if representation_chip_journal_lines:
        changed_work_items = [
            *changed_work_items,
            *representation_chip_journal_lines,
        ]

    representation_layout_added, representation_layout_journal_lines = (
        _ensure_object_engine_table_representation_layout_fix_dashboard_note(
            db,
            initiated_by_user_id=initiated_by_user_id,
            initiated_by_name=initiated_by_name,
        )
    )
    activities_added += representation_layout_added
    if representation_layout_journal_lines:
        changed_work_items = [
            *changed_work_items,
            *representation_layout_journal_lines,
        ]

    toolbar_height_added, toolbar_height_journal_lines = (
        _ensure_object_engine_table_toolbar_height_dashboard_note(
            db,
            initiated_by_user_id=initiated_by_user_id,
            initiated_by_name=initiated_by_name,
        )
    )
    activities_added += toolbar_height_added
    if toolbar_height_journal_lines:
        changed_work_items = [
            *changed_work_items,
            *toolbar_height_journal_lines,
        ]

    filters_modal_added, filters_modal_journal_lines = (
        _ensure_object_engine_table_filters_modal_dashboard_note(
            db,
            initiated_by_user_id=initiated_by_user_id,
            initiated_by_name=initiated_by_name,
        )
    )
    activities_added += filters_modal_added
    if filters_modal_journal_lines:
        changed_work_items = [
            *changed_work_items,
            *filters_modal_journal_lines,
        ]

    filters_typed_added, filters_typed_journal_lines = (
        _ensure_object_engine_table_filters_typed_editors_dashboard_note(
            db,
            initiated_by_user_id=initiated_by_user_id,
            initiated_by_name=initiated_by_name,
        )
    )
    activities_added += filters_typed_added
    if filters_typed_journal_lines:
        changed_work_items = [
            *changed_work_items,
            *filters_typed_journal_lines,
        ]

    filters_operators_added, filters_operators_journal_lines = (
        _ensure_object_engine_table_filters_operators_dashboard_note(
            db,
            initiated_by_user_id=initiated_by_user_id,
            initiated_by_name=initiated_by_name,
        )
    )
    activities_added += filters_operators_added
    if filters_operators_journal_lines:
        changed_work_items = [
            *changed_work_items,
            *filters_operators_journal_lines,
        ]

    filters_stabilization_added, filters_stabilization_journal_lines = (
        _ensure_object_engine_table_filters_operators_stabilization_dashboard_notes(
            db,
            initiated_by_user_id=initiated_by_user_id,
            initiated_by_name=initiated_by_name,
        )
    )
    activities_added += filters_stabilization_added
    if filters_stabilization_journal_lines:
        changed_work_items = [
            *changed_work_items,
            *filters_stabilization_journal_lines,
        ]

    filters_phase3_added, filters_phase3_journal_lines = (
        _ensure_object_engine_table_filters_phase3_dashboard_notes(
            db,
            initiated_by_user_id=initiated_by_user_id,
            initiated_by_name=initiated_by_name,
        )
    )
    activities_added += filters_phase3_added
    if filters_phase3_journal_lines:
        changed_work_items = [
            *changed_work_items,
            *filters_phase3_journal_lines,
        ]

    quick_filters_overflow_added, quick_filters_overflow_journal_lines = (
        _ensure_object_engine_table_quick_filters_overflow_dashboard_notes(
            db,
            initiated_by_user_id=initiated_by_user_id,
            initiated_by_name=initiated_by_name,
        )
    )
    activities_added += quick_filters_overflow_added
    if quick_filters_overflow_journal_lines:
        changed_work_items = [
            *changed_work_items,
            *quick_filters_overflow_journal_lines,
        ]

    quick_filters_layering_added, quick_filters_layering_journal_lines = (
        _ensure_object_engine_table_quick_filters_layering_dashboard_notes(
            db,
            initiated_by_user_id=initiated_by_user_id,
            initiated_by_name=initiated_by_name,
        )
    )
    activities_added += quick_filters_layering_added
    if quick_filters_layering_journal_lines:
        changed_work_items = [
            *changed_work_items,
            *quick_filters_layering_journal_lines,
        ]

    saved_filters_unification_added, saved_filters_unification_journal_lines = (
        _ensure_object_engine_table_saved_filters_unification_dashboard_notes(
            db,
            initiated_by_user_id=initiated_by_user_id,
            initiated_by_name=initiated_by_name,
        )
    )
    activities_added += saved_filters_unification_added
    if saved_filters_unification_journal_lines:
        changed_work_items = [
            *changed_work_items,
            *saved_filters_unification_journal_lines,
        ]

    title_field_visibility_added, title_field_visibility_journal_lines = (
        _ensure_object_engine_table_title_field_visibility_dashboard_notes(
            db,
            initiated_by_user_id=initiated_by_user_id,
            initiated_by_name=initiated_by_name,
        )
    )
    activities_added += title_field_visibility_added
    if title_field_visibility_journal_lines:
        changed_work_items = [
            *changed_work_items,
            *title_field_visibility_journal_lines,
        ]

    ut_parity_dashboard_added, ut_parity_dashboard_journal_lines = (
        _ensure_object_table_ut_parity_dashboard_notes(
            db,
            initiated_by_user_id=initiated_by_user_id,
            initiated_by_name=initiated_by_name,
        )
    )
    activities_added += ut_parity_dashboard_added
    if ut_parity_dashboard_journal_lines:
        changed_work_items = [
            *changed_work_items,
            *ut_parity_dashboard_journal_lines,
        ]

    owner_detail_panel_added, owner_detail_panel_journal_lines = (
        _ensure_owner_stage_detail_panel_dashboard_notes(
            db,
            initiated_by_user_id=initiated_by_user_id,
            initiated_by_name=initiated_by_name,
        )
    )
    activities_added += owner_detail_panel_added
    if owner_detail_panel_journal_lines:
        changed_work_items = [
            *changed_work_items,
            *owner_detail_panel_journal_lines,
        ]

    link_field_added, link_field_journal_lines = (
        _ensure_object_table_link_field_type_dashboard_notes(
            db,
            initiated_by_user_id=initiated_by_user_id,
            initiated_by_name=initiated_by_name,
        )
    )
    activities_added += link_field_added
    if link_field_journal_lines:
        changed_work_items = [
            *changed_work_items,
            *link_field_journal_lines,
        ]

    checklist_added, checklist_journal_lines = (
        _ensure_object_table_entity_card_checklist_dashboard_notes(
            db,
            initiated_by_user_id=initiated_by_user_id,
            initiated_by_name=initiated_by_name,
        )
    )
    activities_added += checklist_added
    if checklist_journal_lines:
        changed_work_items = [
            *changed_work_items,
            *checklist_journal_lines,
        ]

    relation_filter_added, relation_filter_journal_lines = (
        _ensure_object_table_relation_filter_dashboard_notes(
            db,
            initiated_by_user_id=initiated_by_user_id,
            initiated_by_name=initiated_by_name,
        )
    )
    activities_added += relation_filter_added
    if relation_filter_journal_lines:
        changed_work_items = [
            *changed_work_items,
            *relation_filter_journal_lines,
        ]

    object_context_menu_added, object_context_menu_journal_lines = (
        _ensure_object_context_menu_dashboard_notes(
            db,
            initiated_by_user_id=initiated_by_user_id,
            initiated_by_name=initiated_by_name,
        )
    )
    activities_added += object_context_menu_added
    if object_context_menu_journal_lines:
        changed_work_items = [
            *changed_work_items,
            *object_context_menu_journal_lines,
        ]

    excel_export_added, excel_export_journal_lines = (
        _ensure_object_table_excel_export_dashboard_notes(
            db,
            initiated_by_user_id=initiated_by_user_id,
            initiated_by_name=initiated_by_name,
        )
    )
    activities_added += excel_export_added
    if excel_export_journal_lines:
        changed_work_items = [
            *changed_work_items,
            *excel_export_journal_lines,
        ]

    excel_export_fix_added, excel_export_fix_journal_lines = (
        _ensure_object_table_excel_export_fix_dashboard_notes(
            db,
            initiated_by_user_id=initiated_by_user_id,
            initiated_by_name=initiated_by_name,
        )
    )
    activities_added += excel_export_fix_added
    if excel_export_fix_journal_lines:
        changed_work_items = [
            *changed_work_items,
            *excel_export_fix_journal_lines,
        ]

    excel_export_hierarchy_labels_added, excel_export_hierarchy_labels_journal_lines = (
        _ensure_object_table_excel_export_hierarchy_labels_dashboard_notes(
            db,
            initiated_by_user_id=initiated_by_user_id,
            initiated_by_name=initiated_by_name,
        )
    )
    activities_added += excel_export_hierarchy_labels_added
    if excel_export_hierarchy_labels_journal_lines:
        changed_work_items = [
            *changed_work_items,
            *excel_export_hierarchy_labels_journal_lines,
        ]

    excel_export_hierarchy_column_ux_added, excel_export_hierarchy_column_ux_journal_lines = (
        _ensure_object_table_excel_export_hierarchy_column_ux_dashboard_notes(
            db,
            initiated_by_user_id=initiated_by_user_id,
            initiated_by_name=initiated_by_name,
        )
    )
    activities_added += excel_export_hierarchy_column_ux_added
    if excel_export_hierarchy_column_ux_journal_lines:
        changed_work_items = [
            *changed_work_items,
            *excel_export_hierarchy_column_ux_journal_lines,
        ]

    excel_import_added, excel_import_journal_lines = (
        _ensure_object_table_excel_import_dashboard_notes(
            db,
            initiated_by_user_id=initiated_by_user_id,
            initiated_by_name=initiated_by_name,
        )
    )
    activities_added += excel_import_added
    if excel_import_journal_lines:
        changed_work_items = [
            *changed_work_items,
            *excel_import_journal_lines,
        ]

    excel_import_wizard_ux_added, excel_import_wizard_ux_journal_lines = (
        _ensure_object_table_excel_import_wizard_ux_dashboard_notes(
            db,
            initiated_by_user_id=initiated_by_user_id,
            initiated_by_name=initiated_by_name,
        )
    )
    activities_added += excel_import_wizard_ux_added
    if excel_import_wizard_ux_journal_lines:
        changed_work_items = [
            *changed_work_items,
            *excel_import_wizard_ux_journal_lines,
        ]

    excel_import_wizard_compact_ux_added, excel_import_wizard_compact_ux_journal_lines = (
        _ensure_object_table_excel_import_wizard_compact_ux_dashboard_notes(
            db,
            initiated_by_user_id=initiated_by_user_id,
            initiated_by_name=initiated_by_name,
        )
    )
    activities_added += excel_import_wizard_compact_ux_added
    if excel_import_wizard_compact_ux_journal_lines:
        changed_work_items = [
            *changed_work_items,
            *excel_import_wizard_compact_ux_journal_lines,
        ]

    excel_import_wizard_clean_ux_added, excel_import_wizard_clean_ux_journal_lines = (
        _ensure_object_table_excel_import_wizard_clean_ux_dashboard_notes(
            db,
            initiated_by_user_id=initiated_by_user_id,
            initiated_by_name=initiated_by_name,
        )
    )
    activities_added += excel_import_wizard_clean_ux_added
    if excel_import_wizard_clean_ux_journal_lines:
        changed_work_items = [
            *changed_work_items,
            *excel_import_wizard_clean_ux_journal_lines,
        ]

    excel_import_value_mapping_added, excel_import_value_mapping_journal_lines = (
        _ensure_object_table_excel_import_value_mapping_dashboard_notes(
            db,
            initiated_by_user_id=initiated_by_user_id,
            initiated_by_name=initiated_by_name,
        )
    )
    activities_added += excel_import_value_mapping_added
    if excel_import_value_mapping_journal_lines:
        changed_work_items = [
            *changed_work_items,
            *excel_import_value_mapping_journal_lines,
        ]

    excel_import_default_values_added, excel_import_default_values_journal_lines = (
        _ensure_object_table_excel_import_default_values_dashboard_notes(
            db,
            initiated_by_user_id=initiated_by_user_id,
            initiated_by_name=initiated_by_name,
        )
    )
    activities_added += excel_import_default_values_added
    if excel_import_default_values_journal_lines:
        changed_work_items = [
            *changed_work_items,
            *excel_import_default_values_journal_lines,
        ]

    (
        create_field_modal_default_value_added,
        create_field_modal_default_value_journal_lines,
    ) = _ensure_create_field_modal_default_value_dashboard_notes(
        db,
        initiated_by_user_id=initiated_by_user_id,
        initiated_by_name=initiated_by_name,
    )
    activities_added += create_field_modal_default_value_added
    if create_field_modal_default_value_journal_lines:
        changed_work_items = [
            *changed_work_items,
            *create_field_modal_default_value_journal_lines,
        ]

    (
        platform_modal_footer_layout_added,
        platform_modal_footer_layout_journal_lines,
    ) = _ensure_platform_modal_footer_layout_dashboard_notes(
        db,
        initiated_by_user_id=initiated_by_user_id,
        initiated_by_name=initiated_by_name,
    )
    activities_added += platform_modal_footer_layout_added
    if platform_modal_footer_layout_journal_lines:
        changed_work_items = [
            *changed_work_items,
            *platform_modal_footer_layout_journal_lines,
        ]

    (
        platform_modal_resize_added,
        platform_modal_resize_journal_lines,
    ) = _ensure_platform_modal_resize_regression_dashboard_notes(
        db,
        initiated_by_user_id=initiated_by_user_id,
        initiated_by_name=initiated_by_name,
    )
    activities_added += platform_modal_resize_added
    if platform_modal_resize_journal_lines:
        changed_work_items = [
            *changed_work_items,
            *platform_modal_resize_journal_lines,
        ]

    (
        platform_modal_min_width_added,
        platform_modal_min_width_journal_lines,
    ) = _ensure_platform_modal_standard_min_width_dashboard_notes(
        db,
        initiated_by_user_id=initiated_by_user_id,
        initiated_by_name=initiated_by_name,
    )
    activities_added += platform_modal_min_width_added
    if platform_modal_min_width_journal_lines:
        changed_work_items = [
            *changed_work_items,
            *platform_modal_min_width_journal_lines,
        ]

    (
        platform_modal_min_width_300_added,
        platform_modal_min_width_300_journal_lines,
    ) = _ensure_platform_modal_min_width_300_dashboard_notes(
        db,
        initiated_by_user_id=initiated_by_user_id,
        initiated_by_name=initiated_by_name,
    )
    activities_added += platform_modal_min_width_300_added
    if platform_modal_min_width_300_journal_lines:
        changed_work_items = [
            *changed_work_items,
            *platform_modal_min_width_300_journal_lines,
        ]

    (
        platform_accent_zones_added,
        platform_accent_zones_journal_lines,
    ) = _ensure_platform_accent_zones_dashboard_notes(
        db,
        initiated_by_user_id=initiated_by_user_id,
        initiated_by_name=initiated_by_name,
    )
    activities_added += platform_accent_zones_added
    if platform_accent_zones_journal_lines:
        changed_work_items = [
            *changed_work_items,
            *platform_accent_zones_journal_lines,
        ]

    (
        quick_create_accent_added,
        quick_create_accent_journal_lines,
    ) = _ensure_platform_quick_create_office_accent_dashboard_notes(
        db,
        initiated_by_user_id=initiated_by_user_id,
        initiated_by_name=initiated_by_name,
    )
    activities_added += quick_create_accent_added
    if quick_create_accent_journal_lines:
        changed_work_items = [
            *changed_work_items,
            *quick_create_accent_journal_lines,
        ]

    (
        office_record_create_resize_added,
        office_record_create_resize_journal_lines,
    ) = _ensure_office_object_record_create_modal_resize_dashboard_notes(
        db,
        initiated_by_user_id=initiated_by_user_id,
        initiated_by_name=initiated_by_name,
    )
    activities_added += office_record_create_resize_added
    if office_record_create_resize_journal_lines:
        changed_work_items = [
            *changed_work_items,
            *office_record_create_resize_journal_lines,
        ]

    (
        platform_modal_help_added,
        platform_modal_help_journal_lines,
    ) = _ensure_platform_modal_help_dashboard_notes(
        db,
        initiated_by_user_id=initiated_by_user_id,
        initiated_by_name=initiated_by_name,
    )
    activities_added += platform_modal_help_added
    if platform_modal_help_journal_lines:
        changed_work_items = [
            *changed_work_items,
            *platform_modal_help_journal_lines,
        ]

    (
        studio_view_draft_preview_added,
        studio_view_draft_preview_journal_lines,
    ) = _ensure_studio_object_view_draft_preview_sync_dashboard_notes(
        db,
        initiated_by_user_id=initiated_by_user_id,
        initiated_by_name=initiated_by_name,
    )
    activities_added += studio_view_draft_preview_added
    if studio_view_draft_preview_journal_lines:
        changed_work_items = [
            *changed_work_items,
            *studio_view_draft_preview_journal_lines,
        ]

    (
        plan_view_renderer_added,
        plan_view_renderer_journal_lines,
    ) = _ensure_plan_view_renderer_routing_dashboard_notes(
        db,
        initiated_by_user_id=initiated_by_user_id,
        initiated_by_name=initiated_by_name,
    )
    activities_added += plan_view_renderer_added
    if plan_view_renderer_journal_lines:
        changed_work_items = [
            *changed_work_items,
            *plan_view_renderer_journal_lines,
        ]

    (
        field_placeholder_added,
        field_placeholder_journal_lines,
    ) = _ensure_field_placeholder_support_dashboard_notes(
        db,
        initiated_by_user_id=initiated_by_user_id,
        initiated_by_name=initiated_by_name,
    )
    activities_added += field_placeholder_added
    if field_placeholder_journal_lines:
        changed_work_items = [
            *changed_work_items,
            *field_placeholder_journal_lines,
        ]

    (
        customer_companies_mvp_added,
        customer_companies_mvp_journal_lines,
    ) = _ensure_customer_companies_mvp_dashboard_notes(
        db,
        initiated_by_user_id=initiated_by_user_id,
        initiated_by_name=initiated_by_name,
    )
    activities_added += customer_companies_mvp_added
    if customer_companies_mvp_journal_lines:
        changed_work_items = [
            *changed_work_items,
            *customer_companies_mvp_journal_lines,
        ]

    (
        tenant_management_ui_added,
        tenant_management_ui_journal_lines,
    ) = _ensure_tenant_management_ui_dashboard_notes(
        db,
        initiated_by_user_id=initiated_by_user_id,
        initiated_by_name=initiated_by_name,
    )
    activities_added += tenant_management_ui_added
    if tenant_management_ui_journal_lines:
        changed_work_items = [
            *changed_work_items,
            *tenant_management_ui_journal_lines,
        ]

    (
        tenant_context_navigation_added,
        tenant_context_navigation_journal_lines,
    ) = _ensure_tenant_context_navigation_dashboard_notes(
        db,
        initiated_by_user_id=initiated_by_user_id,
        initiated_by_name=initiated_by_name,
    )
    activities_added += tenant_context_navigation_added
    if tenant_context_navigation_journal_lines:
        changed_work_items = [
            *changed_work_items,
            *tenant_context_navigation_journal_lines,
        ]

    (
        tenant_structure_clone_mvp_added,
        tenant_structure_clone_mvp_journal_lines,
    ) = _ensure_tenant_structure_clone_mvp_dashboard_notes(
        db,
        initiated_by_user_id=initiated_by_user_id,
        initiated_by_name=initiated_by_name,
    )
    activities_added += tenant_structure_clone_mvp_added
    if tenant_structure_clone_mvp_journal_lines:
        changed_work_items = [
            *changed_work_items,
            *tenant_structure_clone_mvp_journal_lines,
        ]

    (
        bootstrap_source_platform_template_added,
        bootstrap_source_platform_template_journal_lines,
    ) = _ensure_bootstrap_source_platform_template_dashboard_notes(
        db,
        initiated_by_user_id=initiated_by_user_id,
        initiated_by_name=initiated_by_name,
    )
    activities_added += bootstrap_source_platform_template_added
    if bootstrap_source_platform_template_journal_lines:
        changed_work_items = [
            *changed_work_items,
            *bootstrap_source_platform_template_journal_lines,
        ]

    (
        tenant_environment_badge_added,
        tenant_environment_badge_journal_lines,
    ) = _ensure_tenant_environment_badge_dashboard_notes(
        db,
        initiated_by_user_id=initiated_by_user_id,
        initiated_by_name=initiated_by_name,
    )
    activities_added += tenant_environment_badge_added
    if tenant_environment_badge_journal_lines:
        changed_work_items = [
            *changed_work_items,
            *tenant_environment_badge_journal_lines,
        ]

    (
        plan_root_anchor_uniqueness_added,
        plan_root_anchor_uniqueness_journal_lines,
    ) = _ensure_plan_root_anchor_uniqueness_dashboard_notes(
        db,
        initiated_by_user_id=initiated_by_user_id,
        initiated_by_name=initiated_by_name,
    )
    activities_added += plan_root_anchor_uniqueness_added
    if plan_root_anchor_uniqueness_journal_lines:
        changed_work_items = [
            *changed_work_items,
            *plan_root_anchor_uniqueness_journal_lines,
        ]

    (
        default_quick_form_ensure_added,
        default_quick_form_ensure_journal_lines,
    ) = _ensure_default_quick_form_ensure_dashboard_notes(
        db,
        initiated_by_user_id=initiated_by_user_id,
        initiated_by_name=initiated_by_name,
    )
    activities_added += default_quick_form_ensure_added
    if default_quick_form_ensure_journal_lines:
        changed_work_items = [
            *changed_work_items,
            *default_quick_form_ensure_journal_lines,
        ]

    (
        workspace_home_ensure_added,
        workspace_home_ensure_journal_lines,
    ) = _ensure_workspace_home_ensure_dashboard_notes(
        db,
        initiated_by_user_id=initiated_by_user_id,
        initiated_by_name=initiated_by_name,
    )
    activities_added += workspace_home_ensure_added
    if workspace_home_ensure_journal_lines:
        changed_work_items = [
            *changed_work_items,
            *workspace_home_ensure_journal_lines,
        ]

    (
        navigation_system_items_ensure_added,
        navigation_system_items_ensure_journal_lines,
    ) = _ensure_navigation_system_items_ensure_dashboard_notes(
        db,
        initiated_by_user_id=initiated_by_user_id,
        initiated_by_name=initiated_by_name,
    )
    activities_added += navigation_system_items_ensure_added
    if navigation_system_items_ensure_journal_lines:
        changed_work_items = [
            *changed_work_items,
            *navigation_system_items_ensure_journal_lines,
        ]

    (
        system_entity_registry_v1_added,
        system_entity_registry_v1_journal_lines,
    ) = _ensure_system_entity_registry_v1_dashboard_notes(
        db,
        initiated_by_user_id=initiated_by_user_id,
        initiated_by_name=initiated_by_name,
    )
    activities_added += system_entity_registry_v1_added
    if system_entity_registry_v1_journal_lines:
        changed_work_items = [
            *changed_work_items,
            *system_entity_registry_v1_journal_lines,
        ]

    (
        tenant_environment_model_added,
        tenant_environment_model_journal_lines,
    ) = _ensure_tenant_environment_model_dashboard_notes(
        db,
        initiated_by_user_id=initiated_by_user_id,
        initiated_by_name=initiated_by_name,
    )
    activities_added += tenant_environment_model_added
    if tenant_environment_model_journal_lines:
        changed_work_items = [
            *changed_work_items,
            *tenant_environment_model_journal_lines,
        ]

    (
        ui_storage_tenant_isolation_p0p1_added,
        ui_storage_tenant_isolation_p0p1_journal_lines,
    ) = _ensure_ui_storage_tenant_isolation_p0p1_dashboard_notes(
        db,
        initiated_by_user_id=initiated_by_user_id,
        initiated_by_name=initiated_by_name,
    )
    activities_added += ui_storage_tenant_isolation_p0p1_added
    if ui_storage_tenant_isolation_p0p1_journal_lines:
        changed_work_items = [
            *changed_work_items,
            *ui_storage_tenant_isolation_p0p1_journal_lines,
        ]

    (
        ui_storage_tenant_isolation_p2_added,
        ui_storage_tenant_isolation_p2_journal_lines,
    ) = _ensure_ui_storage_tenant_isolation_p2_dashboard_notes(
        db,
        initiated_by_user_id=initiated_by_user_id,
        initiated_by_name=initiated_by_name,
    )
    activities_added += ui_storage_tenant_isolation_p2_added
    if ui_storage_tenant_isolation_p2_journal_lines:
        changed_work_items = [
            *changed_work_items,
            *ui_storage_tenant_isolation_p2_journal_lines,
        ]

    (
        tenant_registry_v1_added,
        tenant_registry_v1_journal_lines,
    ) = _ensure_tenant_registry_v1_dashboard_notes(
        db,
        initiated_by_user_id=initiated_by_user_id,
        initiated_by_name=initiated_by_name,
    )
    activities_added += tenant_registry_v1_added
    if tenant_registry_v1_journal_lines:
        changed_work_items = [
            *changed_work_items,
            *tenant_registry_v1_journal_lines,
        ]

    (
        control_plane_shell_phase1_added,
        control_plane_shell_phase1_journal_lines,
    ) = _ensure_control_plane_shell_phase1_dashboard_notes(
        db,
        initiated_by_user_id=initiated_by_user_id,
        initiated_by_name=initiated_by_name,
    )
    activities_added += control_plane_shell_phase1_added
    if control_plane_shell_phase1_journal_lines:
        changed_work_items = [
            *changed_work_items,
            *control_plane_shell_phase1_journal_lines,
        ]

    (
        platform_tenant_admin_split_added,
        platform_tenant_admin_split_journal_lines,
    ) = _ensure_platform_tenant_admin_split_dashboard_notes(
        db,
        initiated_by_user_id=initiated_by_user_id,
        initiated_by_name=initiated_by_name,
    )
    activities_added += platform_tenant_admin_split_added
    if platform_tenant_admin_split_journal_lines:
        changed_work_items = [
            *changed_work_items,
            *platform_tenant_admin_split_journal_lines,
        ]

    (
        clients_ux_refactor_added,
        clients_ux_refactor_journal_lines,
    ) = _ensure_clients_ux_refactor_dashboard_notes(
        db,
        initiated_by_user_id=initiated_by_user_id,
        initiated_by_name=initiated_by_name,
    )
    activities_added += clients_ux_refactor_added
    if clients_ux_refactor_journal_lines:
        changed_work_items = [
            *changed_work_items,
            *clients_ux_refactor_journal_lines,
        ]

    (
        control_plane_independence_audit_added,
        control_plane_independence_audit_journal_lines,
    ) = _ensure_control_plane_independence_audit_dashboard_notes(
        db,
        initiated_by_user_id=initiated_by_user_id,
        initiated_by_name=initiated_by_name,
    )
    activities_added += control_plane_independence_audit_added
    if control_plane_independence_audit_journal_lines:
        changed_work_items = [
            *changed_work_items,
            *control_plane_independence_audit_journal_lines,
        ]

    (
        plan_view_cycle_guard_added,
        plan_view_cycle_guard_journal_lines,
    ) = _ensure_plan_view_cycle_guard_dashboard_notes(
        db,
        initiated_by_user_id=initiated_by_user_id,
        initiated_by_name=initiated_by_name,
    )
    activities_added += plan_view_cycle_guard_added
    if plan_view_cycle_guard_journal_lines:
        changed_work_items = [
            *changed_work_items,
            *plan_view_cycle_guard_journal_lines,
        ]

    (
        runtime_system_records_added,
        runtime_system_records_journal_lines,
    ) = _ensure_runtime_system_records_dashboard_notes(
        db,
        initiated_by_user_id=initiated_by_user_id,
        initiated_by_name=initiated_by_name,
    )
    activities_added += runtime_system_records_added
    if runtime_system_records_journal_lines:
        changed_work_items = [
            *changed_work_items,
            *runtime_system_records_journal_lines,
        ]

    (
        removed_system_menu_items_added,
        removed_system_menu_items_journal_lines,
    ) = _ensure_removed_system_menu_items_dashboard_notes(
        db,
        initiated_by_user_id=initiated_by_user_id,
        initiated_by_name=initiated_by_name,
    )
    activities_added += removed_system_menu_items_added
    if removed_system_menu_items_journal_lines:
        changed_work_items = [
            *changed_work_items,
            *removed_system_menu_items_journal_lines,
        ]

    (
        tenant_delete_mvp_added,
        tenant_delete_mvp_journal_lines,
    ) = _ensure_tenant_delete_mvp_dashboard_notes(
        db,
        initiated_by_user_id=initiated_by_user_id,
        initiated_by_name=initiated_by_name,
    )
    activities_added += tenant_delete_mvp_added
    if tenant_delete_mvp_journal_lines:
        changed_work_items = [
            *changed_work_items,
            *tenant_delete_mvp_journal_lines,
        ]

    (
        plan_view_publish_runtime_added,
        plan_view_publish_runtime_journal_lines,
    ) = _ensure_plan_view_publish_runtime_dashboard_notes(
        db,
        initiated_by_user_id=initiated_by_user_id,
        initiated_by_name=initiated_by_name,
    )
    activities_added += plan_view_publish_runtime_added
    if plan_view_publish_runtime_journal_lines:
        changed_work_items = [
            *changed_work_items,
            *plan_view_publish_runtime_journal_lines,
        ]

    (
        plan_self_relation_added,
        plan_self_relation_journal_lines,
    ) = _ensure_plan_self_relation_universal_dashboard_notes(
        db,
        initiated_by_user_id=initiated_by_user_id,
        initiated_by_name=initiated_by_name,
    )
    activities_added += plan_self_relation_added
    if plan_self_relation_journal_lines:
        changed_work_items = [
            *changed_work_items,
            *plan_self_relation_journal_lines,
        ]

    (
        office_plan_tab_added,
        office_plan_tab_journal_lines,
    ) = _ensure_office_plan_object_tab_contract_dashboard_notes(
        db,
        initiated_by_user_id=initiated_by_user_id,
        initiated_by_name=initiated_by_name,
    )
    activities_added += office_plan_tab_added
    if office_plan_tab_journal_lines:
        changed_work_items = [
            *changed_work_items,
            *office_plan_tab_journal_lines,
        ]

    (
        office_plan_hooks_added,
        office_plan_hooks_journal_lines,
    ) = _ensure_office_plan_view_hooks_dashboard_notes(
        db,
        initiated_by_user_id=initiated_by_user_id,
        initiated_by_name=initiated_by_name,
    )
    activities_added += office_plan_hooks_added
    if office_plan_hooks_journal_lines:
        changed_work_items = [
            *changed_work_items,
            *office_plan_hooks_journal_lines,
        ]

    (
        plan_orphan_records_added,
        plan_orphan_records_journal_lines,
    ) = _ensure_plan_view_orphan_records_dashboard_notes(
        db,
        initiated_by_user_id=initiated_by_user_id,
        initiated_by_name=initiated_by_name,
    )
    activities_added += plan_orphan_records_added
    if plan_orphan_records_journal_lines:
        changed_work_items = [
            *changed_work_items,
            *plan_orphan_records_journal_lines,
        ]

    (
        plan_target_ui_added,
        plan_target_ui_journal_lines,
    ) = _ensure_plan_view_target_ui_dashboard_notes(
        db,
        initiated_by_user_id=initiated_by_user_id,
        initiated_by_name=initiated_by_name,
    )
    activities_added += plan_target_ui_added
    if plan_target_ui_journal_lines:
        changed_work_items = [
            *changed_work_items,
            *plan_target_ui_journal_lines,
        ]

    (
        object_tab_menu_in_tab_added,
        object_tab_menu_in_tab_journal_lines,
    ) = _ensure_object_tab_menu_in_tab_dashboard_notes(
        db,
        initiated_by_user_id=initiated_by_user_id,
        initiated_by_name=initiated_by_name,
    )
    activities_added += object_tab_menu_in_tab_added
    if object_tab_menu_in_tab_journal_lines:
        changed_work_items = [
            *changed_work_items,
            *object_tab_menu_in_tab_journal_lines,
        ]

    (
        object_tab_menu_in_tab_fix_added,
        object_tab_menu_in_tab_fix_journal_lines,
    ) = _ensure_object_tab_menu_in_tab_fix_dashboard_notes(
        db,
        initiated_by_user_id=initiated_by_user_id,
        initiated_by_name=initiated_by_name,
    )
    activities_added += object_tab_menu_in_tab_fix_added
    if object_tab_menu_in_tab_fix_journal_lines:
        changed_work_items = [
            *changed_work_items,
            *object_tab_menu_in_tab_fix_journal_lines,
        ]

    (
        view_properties_panel_fix_added,
        view_properties_panel_fix_journal_lines,
    ) = _ensure_view_properties_panel_studio_view_types_fix_dashboard_notes(
        db,
        initiated_by_user_id=initiated_by_user_id,
        initiated_by_name=initiated_by_name,
    )
    activities_added += view_properties_panel_fix_added
    if view_properties_panel_fix_journal_lines:
        changed_work_items = [
            *changed_work_items,
            *view_properties_panel_fix_journal_lines,
        ]

    (
        object_tab_menu_in_tab_runtime_fix_added,
        object_tab_menu_in_tab_runtime_fix_journal_lines,
    ) = _ensure_object_tab_menu_in_tab_runtime_fix_dashboard_notes(
        db,
        initiated_by_user_id=initiated_by_user_id,
        initiated_by_name=initiated_by_name,
    )
    activities_added += object_tab_menu_in_tab_runtime_fix_added
    if object_tab_menu_in_tab_runtime_fix_journal_lines:
        changed_work_items = [
            *changed_work_items,
            *object_tab_menu_in_tab_runtime_fix_journal_lines,
        ]

    (
        object_tab_menu_in_tab_layout_fix_added,
        object_tab_menu_in_tab_layout_fix_journal_lines,
    ) = _ensure_object_tab_menu_in_tab_layout_fix_dashboard_notes(
        db,
        initiated_by_user_id=initiated_by_user_id,
        initiated_by_name=initiated_by_name,
    )
    activities_added += object_tab_menu_in_tab_layout_fix_added
    if object_tab_menu_in_tab_layout_fix_journal_lines:
        changed_work_items = [
            *changed_work_items,
            *object_tab_menu_in_tab_layout_fix_journal_lines,
        ]

    (
        object_tab_menu_in_tab_trigger_sync_fix_added,
        object_tab_menu_in_tab_trigger_sync_fix_journal_lines,
    ) = _ensure_object_tab_menu_in_tab_trigger_sync_fix_dashboard_notes(
        db,
        initiated_by_user_id=initiated_by_user_id,
        initiated_by_name=initiated_by_name,
    )
    activities_added += object_tab_menu_in_tab_trigger_sync_fix_added
    if object_tab_menu_in_tab_trigger_sync_fix_journal_lines:
        changed_work_items = [
            *changed_work_items,
            *object_tab_menu_in_tab_trigger_sync_fix_journal_lines,
        ]

    (
        object_tab_menu_in_tab_workspace_tab_fix_added,
        object_tab_menu_in_tab_workspace_tab_fix_journal_lines,
    ) = _ensure_object_tab_menu_in_tab_workspace_tab_fix_dashboard_notes(
        db,
        initiated_by_user_id=initiated_by_user_id,
        initiated_by_name=initiated_by_name,
    )
    activities_added += object_tab_menu_in_tab_workspace_tab_fix_added
    if object_tab_menu_in_tab_workspace_tab_fix_journal_lines:
        changed_work_items = [
            *changed_work_items,
            *object_tab_menu_in_tab_workspace_tab_fix_journal_lines,
        ]

    (
        create_relation_modal_footer_added,
        create_relation_modal_footer_journal_lines,
    ) = _ensure_create_relation_definition_modal_footer_dashboard_notes(
        db,
        initiated_by_user_id=initiated_by_user_id,
        initiated_by_name=initiated_by_name,
    )
    activities_added += create_relation_modal_footer_added
    if create_relation_modal_footer_journal_lines:
        changed_work_items = [
            *changed_work_items,
            *create_relation_modal_footer_journal_lines,
        ]

    relation_field_auto_role_added, relation_field_auto_role_journal_lines = (
        _ensure_relation_field_auto_role_dashboard_notes(
            db,
            initiated_by_user_id=initiated_by_user_id,
            initiated_by_name=initiated_by_name,
        )
    )
    activities_added += relation_field_auto_role_added
    if relation_field_auto_role_journal_lines:
        changed_work_items = [
            *changed_work_items,
            *relation_field_auto_role_journal_lines,
        ]

    (
        excel_import_default_values_fix_added,
        excel_import_default_values_fix_journal_lines,
    ) = _ensure_object_table_excel_import_default_values_fix_dashboard_notes(
        db,
        initiated_by_user_id=initiated_by_user_id,
        initiated_by_name=initiated_by_name,
    )
    activities_added += excel_import_default_values_fix_added
    if excel_import_default_values_fix_journal_lines:
        changed_work_items = [
            *changed_work_items,
            *excel_import_default_values_fix_journal_lines,
        ]

    excel_import_review_ux_added, excel_import_review_ux_journal_lines = (
        _ensure_object_table_excel_import_review_ux_dashboard_notes(
            db,
            initiated_by_user_id=initiated_by_user_id,
            initiated_by_name=initiated_by_name,
        )
    )
    activities_added += excel_import_review_ux_added
    if excel_import_review_ux_journal_lines:
        changed_work_items = [
            *changed_work_items,
            *excel_import_review_ux_journal_lines,
        ]

    (
        excel_import_value_mapping_auth_api_fix_added,
        excel_import_value_mapping_auth_api_fix_journal_lines,
    ) = _ensure_object_table_excel_import_value_mapping_auth_api_fix_dashboard_notes(
        db,
        initiated_by_user_id=initiated_by_user_id,
        initiated_by_name=initiated_by_name,
    )
    activities_added += excel_import_value_mapping_auth_api_fix_added
    if excel_import_value_mapping_auth_api_fix_journal_lines:
        changed_work_items = [
            *changed_work_items,
            *excel_import_value_mapping_auth_api_fix_journal_lines,
        ]

    title_hierarchy_ux_added, title_hierarchy_ux_journal_lines = (
        _ensure_object_table_title_hierarchy_number_ux_dashboard_notes(
            db,
            initiated_by_user_id=initiated_by_user_id,
            initiated_by_name=initiated_by_name,
        )
    )
    activities_added += title_hierarchy_ux_added
    if title_hierarchy_ux_journal_lines:
        changed_work_items = [
            *changed_work_items,
            *title_hierarchy_ux_journal_lines,
        ]

    selection_tree_toggle_ux_added, selection_tree_toggle_ux_journal_lines = (
        _ensure_object_table_selection_tree_toggle_ux_dashboard_notes(
            db,
            initiated_by_user_id=initiated_by_user_id,
            initiated_by_name=initiated_by_name,
        )
    )
    activities_added += selection_tree_toggle_ux_added
    if selection_tree_toggle_ux_journal_lines:
        changed_work_items = [
            *changed_work_items,
            *selection_tree_toggle_ux_journal_lines,
        ]

    selection_tree_expand_all_fix_added, selection_tree_expand_all_fix_journal_lines = (
        _ensure_object_table_selection_tree_expand_all_fix_dashboard_notes(
            db,
            initiated_by_user_id=initiated_by_user_id,
            initiated_by_name=initiated_by_name,
        )
    )
    activities_added += selection_tree_expand_all_fix_added
    if selection_tree_expand_all_fix_journal_lines:
        changed_work_items = [
            *changed_work_items,
            *selection_tree_expand_all_fix_journal_lines,
        ]

    studio_preview_parity_added, studio_preview_parity_journal_lines = (
        _ensure_object_table_studio_preview_parity_dashboard_notes(
            db,
            initiated_by_user_id=initiated_by_user_id,
            initiated_by_name=initiated_by_name,
        )
    )
    activities_added += studio_preview_parity_added
    if studio_preview_parity_journal_lines:
        changed_work_items = [
            *changed_work_items,
            *studio_preview_parity_journal_lines,
        ]

    studio_preview_context_added, studio_preview_context_journal_lines = (
        _ensure_studio_preview_business_context_ux_dashboard_notes(
            db,
            initiated_by_user_id=initiated_by_user_id,
            initiated_by_name=initiated_by_name,
        )
    )
    activities_added += studio_preview_context_added
    if studio_preview_context_journal_lines:
        changed_work_items = [
            *changed_work_items,
            *studio_preview_context_journal_lines,
        ]

    studio_preview_tab_selector_added, studio_preview_tab_selector_journal_lines = (
        _ensure_studio_preview_tab_selector_ux_dashboard_notes(
            db,
            initiated_by_user_id=initiated_by_user_id,
            initiated_by_name=initiated_by_name,
        )
    )
    activities_added += studio_preview_tab_selector_added
    if studio_preview_tab_selector_journal_lines:
        changed_work_items = [
            *changed_work_items,
            *studio_preview_tab_selector_journal_lines,
        ]

    studio_preview_tab_bar_added, studio_preview_tab_bar_journal_lines = (
        _ensure_studio_preview_tab_bar_ux_dashboard_notes(
            db,
            initiated_by_user_id=initiated_by_user_id,
            initiated_by_name=initiated_by_name,
        )
    )
    activities_added += studio_preview_tab_bar_added
    if studio_preview_tab_bar_journal_lines:
        changed_work_items = [
            *changed_work_items,
            *studio_preview_tab_bar_journal_lines,
        ]

    studio_preview_mock_data_added, studio_preview_mock_data_journal_lines = (
        _ensure_studio_preview_mock_data_dashboard_notes(
            db,
            initiated_by_user_id=initiated_by_user_id,
            initiated_by_name=initiated_by_name,
        )
    )
    activities_added += studio_preview_mock_data_added
    if studio_preview_mock_data_journal_lines:
        changed_work_items = [
            *changed_work_items,
            *studio_preview_mock_data_journal_lines,
        ]

    object_plan_view_added, object_plan_view_journal_lines = (
        _ensure_object_plan_view_dashboard_notes(
            db,
            initiated_by_user_id=initiated_by_user_id,
            initiated_by_name=initiated_by_name,
        )
    )
    activities_added += object_plan_view_added
    if object_plan_view_journal_lines:
        changed_work_items = [
            *changed_work_items,
            *object_plan_view_journal_lines,
        ]

    object_view_arch_added, object_view_arch_journal_lines = (
        _ensure_object_view_architecture_dashboard_notes(
            db,
            initiated_by_user_id=initiated_by_user_id,
            initiated_by_name=initiated_by_name,
        )
    )
    activities_added += object_view_arch_added
    if object_view_arch_journal_lines:
        changed_work_items = [
            *changed_work_items,
            *object_view_arch_journal_lines,
        ]

    studio_object_type_header_icon_added, studio_object_type_header_icon_journal_lines = (
        _ensure_studio_object_type_header_icon_dashboard_notes(
            db,
            initiated_by_user_id=initiated_by_user_id,
            initiated_by_name=initiated_by_name,
        )
    )
    activities_added += studio_object_type_header_icon_added
    if studio_object_type_header_icon_journal_lines:
        changed_work_items = [
            *changed_work_items,
            *studio_object_type_header_icon_journal_lines,
        ]

    studio_object_type_actions_menu_added, studio_object_type_actions_menu_journal_lines = (
        _ensure_studio_object_type_actions_menu_dashboard_notes(
            db,
            initiated_by_user_id=initiated_by_user_id,
            initiated_by_name=initiated_by_name,
        )
    )
    activities_added += studio_object_type_actions_menu_added
    if studio_object_type_actions_menu_journal_lines:
        changed_work_items = [
            *changed_work_items,
            *studio_object_type_actions_menu_journal_lines,
        ]

    object_type_office_nav_cleanup_added, object_type_office_nav_cleanup_journal_lines = (
        _ensure_object_type_office_nav_cleanup_dashboard_notes(
            db,
            initiated_by_user_id=initiated_by_user_id,
            initiated_by_name=initiated_by_name,
        )
    )
    activities_added += object_type_office_nav_cleanup_added
    if object_type_office_nav_cleanup_journal_lines:
        changed_work_items = [
            *changed_work_items,
            *object_type_office_nav_cleanup_journal_lines,
        ]

    object_type_cascade_delete_added, object_type_cascade_delete_journal_lines = (
        _ensure_object_type_cascade_delete_dashboard_notes(
            db,
            initiated_by_user_id=initiated_by_user_id,
            initiated_by_name=initiated_by_name,
        )
    )
    activities_added += object_type_cascade_delete_added
    if object_type_cascade_delete_journal_lines:
        changed_work_items = [
            *changed_work_items,
            *object_type_cascade_delete_journal_lines,
        ]

    object_type_delete_fix_added, object_type_delete_fix_journal_lines = (
        _ensure_object_type_delete_fix_dashboard_notes(
            db,
            initiated_by_user_id=initiated_by_user_id,
            initiated_by_name=initiated_by_name,
        )
    )
    activities_added += object_type_delete_fix_added
    if object_type_delete_fix_journal_lines:
        changed_work_items = [
            *changed_work_items,
            *object_type_delete_fix_journal_lines,
        ]

    studio_preview_demo_badge_added, studio_preview_demo_badge_journal_lines = (
        _ensure_studio_preview_demo_data_toolbar_badge_dashboard_notes(
            db,
            initiated_by_user_id=initiated_by_user_id,
            initiated_by_name=initiated_by_name,
        )
    )
    activities_added += studio_preview_demo_badge_added
    if studio_preview_demo_badge_journal_lines:
        changed_work_items = [
            *changed_work_items,
            *studio_preview_demo_badge_journal_lines,
        ]

    multi_sort_added, multi_sort_journal_lines = (
        _ensure_object_table_multi_sort_dashboard_notes(
            db,
            initiated_by_user_id=initiated_by_user_id,
            initiated_by_name=initiated_by_name,
        )
    )
    activities_added += multi_sort_added
    if multi_sort_journal_lines:
        changed_work_items = [
            *changed_work_items,
            *multi_sort_journal_lines,
        ]

    dashboard_meta = {

        "components_count": len(components),

        "stages_count": len(stages),

        "quality_issues_open": quality_issues_open,

        "quality_issues_total": quality_issues_total,

        "analyzer_version": fingerprint.version,

        "analyzer_hash": fingerprint.hash,

        "overall_readiness_before": overall_readiness_before,

        "overall_readiness_after": overall,

        "changed_work_items": changed_work_items,

    }

    activities_added += _add_activity(

        db,

        slug=f"dashboard-refresh-{now.strftime('%Y%m%d%H%M%S%f')}",

        title="Dashboard обновлён",

        description=(

            f"Общая готовность: {overall_readiness_before if overall_readiness_before is not None else '—'}%"

            f" → {overall if overall is not None else '—'}%"

        ),

        result=_format_dashboard_refresh_result(

            components_count=len(components),

            stages_count=len(stages),

            quality_issues_open=quality_issues_open,

            overall_readiness_before=overall_readiness_before,

            overall_readiness_after=overall,

            changed_work_items=changed_work_items,

            initiated_by_name=initiated_by_name,

        ),

        activity_type=PlatformActivityType.DASHBOARD_REFRESH.value,

        meta=dashboard_meta,

        initiated_by_user_id=initiated_by_user_id,

        initiated_by_name=initiated_by_name,

    )



    meta = ensure_dashboard_meta(db)

    meta.analyzer_version = fingerprint.version

    meta.analyzer_hash = fingerprint.hash

    meta.refreshed_at = naive_now

    meta.overall_readiness = overall

    sync_yasii_track(db, ctx)

    db.commit()



    return RefreshResult(

        components_count=len(components),

        stages_count=len(stages),

        activities_added=activities_added,

        overall_readiness=overall,

        quality_issues_open=quality_issues_open,

        refreshed_at=serialize_utc_datetime(now) or "",

        analyzer_version=fingerprint.version,

        analyzer_hash=fingerprint.hash,

    )





def _add_activity(

    db: Session,

    *,

    slug: str,

    title: str,

    description: str,

    result: str,

    activity_type: str,

    meta: dict | None = None,

    initiated_by_user_id: int | None = None,

    initiated_by_name: str | None = None,

    related_component_id: int | None = None,

    related_stage_id: int | None = None,

    related_issue_id: int | None = None,

) -> int:

    existing = db.query(PlatformActivity).filter(PlatformActivity.slug == slug).one_or_none()

    if existing:

        return 0



    created_at = utc_now().replace(tzinfo=None)



    db.add(

        PlatformActivity(

            slug=slug,

            title=title,

            description=description,

            result=result,

            type=activity_type,

            meta_json=json.dumps(meta, ensure_ascii=False) if meta else None,

            initiated_by_user_id=initiated_by_user_id,

            initiated_by_name=initiated_by_name,

            created_at=created_at,

            related_component_id=related_component_id,

            related_stage_id=related_stage_id,

            related_issue_id=related_issue_id,

        )

    )

    return 1


