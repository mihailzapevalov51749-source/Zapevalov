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


