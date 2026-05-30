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

    if initiated_by_name:

        lines.append(f"Инициатор: {initiated_by_name}")

    return "\n".join(lines)





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


