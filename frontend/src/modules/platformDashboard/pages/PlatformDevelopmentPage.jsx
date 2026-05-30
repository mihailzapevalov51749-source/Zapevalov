import { useCallback, useEffect, useMemo, useState } from "react";
import { NavLink, Navigate, useLocation, useParams } from "react-router-dom";

import { getApiErrorMessage } from "../../designer/api/platformApiClient";
import RefreshIconButton from "../../../shared/ui/RefreshIconButton";
import * as platformDashboardApi from "../api/platformDashboardApi";
import * as qualityIssuesApi from "../api/qualityIssuesApi";
import { formatAbsoluteDateTime, formatDateTimeAudit, formatRelativeDateTime, parseApiDateTime } from "../utils/formatDateTime";
import {
  getHistorySortTitle,
  getNextHistorySortDirection,
  readHistorySortDirection,
  writeHistorySortDirection,
} from "../utils/historySortPreference";
import TableSortToggleButton from "../../../shared/viewEngine/TableSortToggleButton";

import "./platformDevelopmentPage.css";

const PRIORITY_LABELS = {
  high: "Высокий",
  medium: "Средний",
  low: "Низкий",
};

const ISSUE_RESOLUTION_LABELS = {
  new: "Не исправлено",
  analyzing: "Не исправлено",
  in_progress: "Не исправлено",
  in_review: "Не исправлено",
  closed: "Исправлено",
};

const AI_FIX_STATUS_LABELS = {
  not_started: "Не начато",
  plan_ready: "План готов",
  approved: "Исправление разрешено",
  in_progress: "В работе",
  review: "На проверке",
  done: "Готово",
};

const AREA_LABELS = {
  navigation: "Навигация",
  cards: "Карточки",
  views: "Представления",
  publish: "Публикация",
  notifications: "Уведомления",
  access: "Права доступа",
  architecture: "Архитектура",
  other: "Другое",
};

const AREA_OPTIONS = [
  { value: "navigation", label: "Навигация" },
  { value: "cards", label: "Карточки" },
  { value: "views", label: "Представления" },
  { value: "publish", label: "Публикация" },
  { value: "notifications", label: "Уведомления" },
  { value: "access", label: "Права доступа" },
  { value: "architecture", label: "Архитектура" },
  { value: "other", label: "Другое" },
];

const ARCHITECTURE_STATUS_LABELS = {
  planned: "Запланировано",
  in_progress: "В работе",
  review: "На проверке",
  done: "Завершено",
  blocked: "Заблокировано",
};

const PHASE_STATUS_LABELS = {
  planned: "Запланировано",
  in_progress: "В работе",
  review: "На проверке",
  done: "Завершено",
  blocked: "Заблокировано",
};

const ACTIVITY_TYPE_LABELS = {
  dashboard_refresh: "Обновление Dashboard",
  readiness_component: "Готовность контура",
  readiness_stage: "Готовность этапа",
  decision: "ADR",
  quality: "Качество",
  analysis: "Анализ",
  milestone: "Веха",
};

function getActivityTypeLabel(type) {
  return ACTIVITY_TYPE_LABELS[type] || type || "—";
}

function formatReadiness(readiness) {
  if (readiness == null || Number.isNaN(readiness)) {
    return "Нет данных для расчёта";
  }

  return `${readiness}%`;
}

function formatReadinessMeta(readiness) {
  if (readiness == null || Number.isNaN(readiness)) {
    return "—";
  }

  return `${readiness}%`;
}

function getContourDisplayTitle(contour) {
  if (!contour) {
    return "—";
  }

  return contour.title || "—";
}

function getPhaseDisplayTitle(phase) {
  if (!phase) {
    return "—";
  }

  return phase.title || "—";
}

function resolveDefaultExpandedPhaseId(phases) {
  return (
    phases.find((phase) => phase.current_position)?.id
    ?? phases.find((phase) => phase.status === "in_progress")?.id
    ?? phases[0]?.id
    ?? null
  );
}

function resolveDefaultContourId(contours) {
  return (
    contours.find((contour) => contour.status === "in_progress")?.id
    ?? contours[0]?.id
    ?? null
  );
}

function resolveDefaultHistoryId(events) {
  return events[0]?.id ?? null;
}

function resolveDefaultIssueId(issues) {
  const openIssue = issues.find((issue) => !isClosedStatus(issue.status));
  return openIssue?.id ?? issues[0]?.id ?? null;
}

function getAiFixStatusLabel(status) {
  return AI_FIX_STATUS_LABELS[status] || "Не начато";
}

function getQualityStatusLabel(status) {
  if (!status) {
    return "Не исправлено";
  }

  if (typeof status === "string") {
    return ISSUE_RESOLUTION_LABELS[status] || status;
  }

  if (typeof status === "object") {
    return (
      status.uiValue
      || status.label
      || getQualityStatusLabel(status.apiValue || status.value)
    );
  }

  return "Не исправлено";
}

function getQualityStatusValue(status) {
  if (!status) {
    return "new";
  }

  if (typeof status === "string") {
    return status;
  }

  if (typeof status === "object") {
    return status.apiValue || status.value || "new";
  }

  return "new";
}

function getIssueResolutionLabel(status) {
  return getQualityStatusLabel(status);
}

function getContourCompletedWork(contour) {
  return contour.completed_items || [];
}

function getContourRemainingWork(contour) {
  return contour.remaining_items || [];
}

function MasterDetailsWorkspace({
  title,
  titleAddon = null,
  masterLabel,
  detailLabel,
  headerActions = null,
  master,
  detail,
  className = "",
}) {
  return (
    <div className={`platform-dev__workspace${className ? ` ${className}` : ""}`}>
      <div className="platform-dev__workspace-header">
        <div className="platform-dev__workspace-title-row">
          <h2 className="platform-dev__workspace-title">{title}</h2>
          {titleAddon}
        </div>
        {headerActions}
      </div>
      <div className="platform-dev__workspace-body">
        <aside className="platform-dev__master-panel" aria-label={masterLabel}>
          {master}
        </aside>
        <section className="platform-dev__detail-panel" aria-label={detailLabel}>
          {detail}
        </section>
      </div>
    </div>
  );
}

function MasterList({ children }) {
  return (
    <div className="platform-dev__master-list" role="list">
      {children}
    </div>
  );
}

function MasterListItem({ selected, onClick, title, meta, subtitle = null }) {
  return (
    <button
      type="button"
      role="listitem"
      className={`platform-dev__master-item${selected ? " is-selected" : ""}`}
      onClick={onClick}
      aria-pressed={selected}
    >
      <span className="platform-dev__master-item-marker" aria-hidden="true">
        {selected ? "▶" : " "}
      </span>
      <span className="platform-dev__master-item-content">
        <span className="platform-dev__master-item-title">{title}</span>
        {subtitle ? <span className="platform-dev__master-item-subtitle">{subtitle}</span> : null}
      </span>
      {meta != null ? <span className="platform-dev__master-item-meta">{meta}</span> : null}
    </button>
  );
}

function DetailEmptyState({ message }) {
  return (
    <div className="platform-dev__detail-empty">
      <p>{message}</p>
    </div>
  );
}

function DetailField({ label, children }) {
  return (
    <div className="platform-dev__detail-field">
      <p className="platform-dev__detail-field-label">{label}</p>
      <div className="platform-dev__detail-field-value">{children}</div>
    </div>
  );
}

function DetailFieldList({ label, items }) {
  if (!items?.length) {
    return null;
  }

  return (
    <DetailField label={label}>
      <ul className="platform-dev__detail-list">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </DetailField>
  );
}

function ImplementationPhaseDetailsPanel({ phase }) {
  return (
    <div className="platform-dev__detail-view">
      <h3 className="platform-dev__detail-view-title">{getPhaseDisplayTitle(phase)}</h3>

      <div className="platform-dev__detail-fields">
        <DetailField label="Цель этапа">
          <p>{phase.description || "Не указано."}</p>
        </DetailField>
        <DetailField label="Готовность этапа">
          <p>{formatReadiness(phase.readiness)}</p>
        </DetailField>
        <DetailFieldList label="Завершённые работы этапа" items={phase.completed_items} />
        <DetailFieldList label="Текущие работы этапа" items={phase.current_tasks} />
        <DetailFieldList label="Следующие работы этапа" items={phase.next_tasks} />
        <DetailFieldList label="Блокеры этапа" items={phase.blockers} />
        <DetailFieldList label="Критерий завершения этапа" items={phase.completion_criteria} />
      </div>
    </div>
  );
}

function ArchitectureMasterList({ contours, selectedContourId, onSelectContour }) {
  if (contours.length === 0) {
    return <p className="platform-dev__master-status">Компонентов пока нет.</p>;
  }

  return (
    <MasterList>
      {contours.map((contour) => (
        <MasterListItem
          key={contour.id}
          selected={selectedContourId === contour.id}
          onClick={() => onSelectContour(contour.id)}
          title={getContourDisplayTitle(contour)}
          meta={formatReadinessMeta(contour.readiness)}
        />
      ))}
    </MasterList>
  );
}

function ImplementationMasterList({ phases, selectedPhaseId, onSelectPhase }) {
  if (phases.length === 0) {
    return <p className="platform-dev__master-status">Этапов пока нет.</p>;
  }

  return (
    <MasterList>
      {phases.map((phase) => (
        <MasterListItem
          key={phase.id}
          selected={selectedPhaseId === phase.id}
          onClick={() => onSelectPhase(phase.id)}
          title={getPhaseDisplayTitle(phase)}
          subtitle={phase.current_position ? "Текущий этап" : null}
          meta={formatReadinessMeta(phase.readiness)}
        />
      ))}
    </MasterList>
  );
}

function ArchitectureContourDetailsPanel({ contour }) {
  if (!contour) {
    return <DetailEmptyState message="Выберите компонент платформы в списке слева." />;
  }

  const relatedIssues = contour.related_issues || [];

  return (
    <div className="platform-dev__detail-view">
      <h3 className="platform-dev__detail-view-title">{getContourDisplayTitle(contour)}</h3>

      <div className="platform-dev__detail-fields">
        <DetailField label="Статус">
          <p>{ARCHITECTURE_STATUS_LABELS[contour.status] || contour.status}</p>
        </DetailField>
        <DetailField label="Техническая реализованность">
          <p>{formatReadiness(contour.readiness)}</p>
        </DetailField>
        <DetailField label="Описание">
          <p>{contour.description || "Не указано."}</p>
        </DetailField>
        <DetailFieldList label="Что реализовано" items={getContourCompletedWork(contour)} />
        <DetailFieldList label="Что осталось реализовать" items={getContourRemainingWork(contour)} />
        <DetailFieldList label="Зависимости" items={contour.dependencies} />
        <DetailFieldList label="Архитектурный долг" items={contour.architecture_debt} />
        {relatedIssues.length > 0 ? (
          <DetailField label="Связанные проблемы качества">
            <ul className="platform-dev__detail-list">
              {relatedIssues.map((issue) => (
                <li key={issue.id}>
                  {formatIssueId(issue.id)} — {issue.title} ({getIssueResolutionLabel(issue.status)})
                </li>
              ))}
            </ul>
          </DetailField>
        ) : (
          <DetailField label="Связанные проблемы качества">
            <p>Открытых связанных проблем нет.</p>
          </DetailField>
        )}
      </div>
    </div>
  );
}

function QualityMasterList({
  issues,
  selectedIssueId,
  onSelectIssue,
  isLoading,
  hasError,
}) {
  if (isLoading) {
    return <p className="platform-dev__master-status">Загрузка проблем...</p>;
  }

  if (hasError) {
    return <p className="platform-dev__master-status">Список проблем недоступен.</p>;
  }

  if (issues.length === 0) {
    return <p className="platform-dev__master-status">Проблем пока нет.</p>;
  }

  return (
    <MasterList>
      {issues.map((issue) => (
        <MasterListItem
          key={issue.id}
          selected={selectedIssueId === issue.id}
          onClick={() => onSelectIssue(issue.id)}
          title={issue.title}
          subtitle={formatIssueId(issue.id)}
          meta={getIssueResolutionLabel(issue.status)}
        />
      ))}
    </MasterList>
  );
}

function QualityIssueDetailsPanel({ issue, onIssueUpdated }) {
  const [isPreparingFix, setIsPreparingFix] = useState(false);
  const [isApprovingFix, setIsApprovingFix] = useState(false);
  const [fixActionError, setFixActionError] = useState("");
  const [resolutionDraft, setResolutionDraft] = useState("open");
  const [isSavingResolution, setIsSavingResolution] = useState(false);
  const [resolutionError, setResolutionError] = useState("");
  const [statusHistory, setStatusHistory] = useState([]);
  const [isLoadingStatusHistory, setIsLoadingStatusHistory] = useState(false);

  useEffect(() => {
    if (!issue?.id) {
      setResolutionDraft("open");
      setStatusHistory([]);
      return undefined;
    }

    setResolutionDraft(getIssueResolutionValue(issue.status));
    setResolutionError("");

    let cancelled = false;

    (async () => {
      setIsLoadingStatusHistory(true);

      try {
        const items = await qualityIssuesApi.listQualityIssueStatusHistory(issue.id);

        if (!cancelled) {
          setStatusHistory(Array.isArray(items) ? items : []);
        }
      } catch {
        if (!cancelled) {
          setStatusHistory([]);
        }
      } finally {
        if (!cancelled) {
          setIsLoadingStatusHistory(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [issue?.id, issue?.status]);

  if (!issue) {
    return <DetailEmptyState message="Выберите проблему в списке слева." />;
  }

  const aiFixStatus = issue.ai_fix_status || "not_started";
  const hasFixPlan = Boolean(issue.ai_fix_user_plan);
  const isFixApproved = aiFixStatus === "approved" || Boolean(issue.ai_fix_approved_at);
  const canPrepareFix = !hasFixPlan && !isFixApproved;
  const canApproveFix = aiFixStatus === "plan_ready" && hasFixPlan && !isFixApproved;
  const resolutionPatch = buildStatusPatchForResolution(
    resolutionDraft,
    issue.status,
  );
  const canSaveResolution = Boolean(resolutionPatch) && !isSavingResolution;

  const handlePrepareFix = async () => {
    setIsPreparingFix(true);
    setFixActionError("");

    try {
      const updatedIssue = await qualityIssuesApi.prepareQualityIssueFix(issue.id);
      onIssueUpdated(updatedIssue);
    } catch (error) {
      setFixActionError(
        getApiErrorMessage(error, "Не удалось подготовить план исправления"),
      );
    } finally {
      setIsPreparingFix(false);
    }
  };

  const handleApproveFix = async () => {
    setIsApprovingFix(true);
    setFixActionError("");

    try {
      const updatedIssue = await qualityIssuesApi.approveQualityIssueFix(issue.id);
      onIssueUpdated(updatedIssue);
    } catch (error) {
      setFixActionError(
        getApiErrorMessage(error, "Не удалось разрешить исправление"),
      );
    } finally {
      setIsApprovingFix(false);
    }
  };

  const handleSaveResolution = async () => {
    if (!resolutionPatch) {
      return;
    }

    setIsSavingResolution(true);
    setResolutionError("");

    try {
      const updatedIssue = await qualityIssuesApi.updateQualityIssue(
        issue.id,
        resolutionPatch,
      );
      onIssueUpdated(updatedIssue);

      const historyItems = await qualityIssuesApi.listQualityIssueStatusHistory(
        issue.id,
      );
      setStatusHistory(Array.isArray(historyItems) ? historyItems : []);
    } catch (error) {
      setResolutionError(
        getApiErrorMessage(error, "Не удалось сохранить статус"),
      );
    } finally {
      setIsSavingResolution(false);
    }
  };

  return (
    <div className="platform-dev__detail-view platform-dev__detail-view--issue">
      <p className="platform-dev__detail-view-id">{formatIssueId(issue.id)}</p>
      <h3 className="platform-dev__detail-view-title">{issue.title}</h3>

      <div className="platform-dev__detail-fields">
        <DetailField label="Что происходит сейчас">
          <p>{issue.current_behavior || issue.description || "Не указано."}</p>
        </DetailField>
        <DetailField label="Как должно быть">
          <p>{issue.expected_behavior || "Не указано."}</p>
        </DetailField>
        {issue.comment ? (
          <DetailField label="Комментарий">
            <p>{issue.comment}</p>
          </DetailField>
        ) : null}
        <DetailField label="Статус">
          <div className="platform-dev__issue-status-editor">
            <select
              className="platform-dev__issue-status-select"
              value={resolutionDraft}
              onChange={(event) => setResolutionDraft(event.target.value)}
              disabled={isSavingResolution}
            >
              {ISSUE_RESOLUTION_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <button
              type="button"
              className="platform-dev__btn platform-dev__btn--secondary platform-dev__issue-status-save"
              onClick={handleSaveResolution}
              disabled={!canSaveResolution}
            >
              {isSavingResolution ? "Сохранение..." : "Сохранить"}
            </button>
          </div>
          {resolutionError ? (
            <p className="platform-dev__quality-error">{resolutionError}</p>
          ) : null}
        </DetailField>
        <DetailField label="История статуса">
          {isLoadingStatusHistory ? (
            <p>Загрузка истории...</p>
          ) : statusHistory.length === 0 ? (
            <p>Изменений статуса пока нет.</p>
          ) : (
            <ul className="platform-dev__issue-status-history">
              {statusHistory.map((entry) => (
                <li key={entry.id} className="platform-dev__issue-status-history-item">
                  <div className="platform-dev__issue-status-history-date">
                    {formatIssueStatusHistoryAt(entry.created_at)}
                  </div>
                  <div className="platform-dev__issue-status-history-text">
                    Статус изменён: {getQualityStatusLabel(entry.from_label)} → {getQualityStatusLabel(entry.to_label)}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </DetailField>
        <DetailField label="Дата создания">
          <p>{formatIssueCreatedAt(issue.created_at)}</p>
        </DetailField>
        <DetailField label="Область">
          <p>{AREA_LABELS[issue.area] || issue.area}</p>
        </DetailField>
      </div>

      <section className="platform-dev__ai-fix">
        <h4 className="platform-dev__ai-fix-title">ИИ-исправление</h4>

        {isFixApproved ? (
          <p className="platform-dev__ai-fix-status platform-dev__ai-fix-status--approved">
            Исправление разрешено
          </p>
        ) : null}

        {hasFixPlan ? (
          <p className="platform-dev__ai-fix-note">ИИ-план исправления подготовлен</p>
        ) : null}

        {hasFixPlan ? (
          <div className="platform-dev__fix-plan">
            <h5 className="platform-dev__fix-plan-title">План исправления</h5>
            <div className="platform-dev__fix-plan-section">
              <p className="platform-dev__fix-plan-section-title">Что будет исправлено</p>
              <pre className="platform-dev__fix-plan-text">{issue.ai_fix_user_plan}</pre>
            </div>
            {issue.ai_fix_technical_plan ? (
              <details className="platform-dev__fix-plan-technical">
                <summary>Технический план</summary>
                <pre className="platform-dev__fix-plan-text">{issue.ai_fix_technical_plan}</pre>
              </details>
            ) : null}
          </div>
        ) : null}

        {fixActionError ? (
          <p className="platform-dev__quality-error">{fixActionError}</p>
        ) : null}

        <div className="platform-dev__ai-fix-actions">
          {canPrepareFix ? (
            <button
              type="button"
              className="platform-dev__btn platform-dev__btn--primary platform-dev__quality-action-btn"
              onClick={handlePrepareFix}
              disabled={isPreparingFix || isApprovingFix}
            >
              {isPreparingFix ? "Подготовка..." : "Подготовить исправление"}
            </button>
          ) : null}
          {canApproveFix ? (
            <button
              type="button"
              className="platform-dev__btn platform-dev__btn--primary platform-dev__quality-action-btn"
              onClick={handleApproveFix}
              disabled={isPreparingFix || isApprovingFix}
            >
              {isApprovingFix ? "Сохранение..." : "Разрешить исправление"}
            </button>
          ) : null}
        </div>

        {aiFixStatus !== "not_started" ? (
          <DetailField label="Статус ИИ-исправления">
            <p>{getAiFixStatusLabel(aiFixStatus)}</p>
          </DetailField>
        ) : null}
      </section>
    </div>
  );
}

function HistoryMasterList({ events, selectedEventId, onSelectEvent }) {
  if (events.length === 0) {
    return <p className="platform-dev__master-status">Событий пока нет.</p>;
  }

  return (
    <MasterList>
      {events.map((event) => (
        <MasterListItem
          key={event.id}
          selected={selectedEventId === event.id}
          onClick={() => onSelectEvent(event.id)}
          title={formatActivityDate(event.created_at)}
          subtitle={`${getActivityTypeLabel(event.type)} · ${event.title}`}
        />
      ))}
    </MasterList>
  );
}

function HistoryEventDetailsPanel({ event }) {
  if (!event) {
    return <DetailEmptyState message="Выберите событие в списке слева." />;
  }

  const timeAudit = formatDateTimeAudit(event.created_at);
  const meta = event.meta || {};

  return (
    <div className="platform-dev__detail-view">
      <time className="platform-dev__detail-view-date" dateTime={event.created_at}>
        {formatActivityDate(event.created_at)}
      </time>
      <h3 className="platform-dev__detail-view-title">{event.title}</h3>

      <div className="platform-dev__detail-fields">
        <DetailField label="Тип события">
          <p>{getActivityTypeLabel(event.type)}</p>
        </DetailField>
        {event.description ? (
          <DetailField label="Описание">
            <p className="platform-dev__detail-multiline">{event.description}</p>
          </DetailField>
        ) : null}
        {event.result ? (
          <DetailField label="Детали">
            <p className="platform-dev__detail-multiline">{event.result}</p>
          </DetailField>
        ) : null}
        {event.initiated_by_name ? (
          <DetailField label="Инициатор">
            <p>{event.initiated_by_name}</p>
          </DetailField>
        ) : null}
        {meta.components_count != null ? (
          <DetailField label="Компонентов">
            <p>{meta.components_count}</p>
          </DetailField>
        ) : null}
        {meta.stages_count != null ? (
          <DetailField label="Этапов">
            <p>{meta.stages_count}</p>
          </DetailField>
        ) : null}
        {meta.quality_issues_open != null ? (
          <DetailField label="Проблем качества">
            <p>{meta.quality_issues_open}</p>
          </DetailField>
        ) : null}
        {meta.readiness_before != null && meta.readiness_after != null ? (
          <DetailField label="Изменение готовности">
            <p>
              Было: {meta.readiness_before}% → Стало: {meta.readiness_after}%
            </p>
          </DetailField>
        ) : null}
        <DetailField label="Аудит времени">
          <ul className="platform-dev__detail-list platform-dev__detail-list--audit">
            <li>ID: {event.id}</li>
            <li>Тип (API): {event.type || "—"}</li>
            <li>Текст: {event.title}</li>
            <li>created_at (API / БД): {timeAudit.apiValue}</li>
            <li>created_at (UI): {timeAudit.uiValue}</li>
          </ul>
        </DetailField>
      </div>
    </div>
  );
}

const PLATFORM_TABS = [
  { key: "architecture", label: "Архитектура" },
  { key: "implementation", label: "Реализация" },
  { key: "quality", label: "Качество" },
  { key: "history", label: "История" },
];

function resolvePlatformTabKey(pathname) {
  const match = pathname.match(/\/platform\/([^/?]+)/);
  return match?.[1] || null;
}

function formatActivityDate(value) {
  return formatRelativeDateTime(value);
}

function formatManifestUpdatedAt(value) {
  return formatRelativeDateTime(value);
}

function formatIssueCreatedAt(value) {
  if (!value) {
    return "—";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function formatIssueId(id) {
  return `QP-${String(id).padStart(3, "0")}`;
}

function isClosedStatus(status) {
  return getQualityStatusValue(status) === "closed";
}

const ISSUE_RESOLUTION_OPTIONS = [
  { value: "open", label: "Не исправлено" },
  { value: "fixed", label: "Исправлено" },
];

function getIssueResolutionValue(status) {
  return isClosedStatus(status) ? "fixed" : "open";
}

function buildStatusPatchForResolution(resolutionValue, currentStatus) {
  if (resolutionValue === "fixed") {
    if (isClosedStatus(currentStatus)) {
      return null;
    }

    return { status: "closed" };
  }

  if (resolutionValue === "open") {
    if (!isClosedStatus(currentStatus)) {
      return null;
    }

    return { status: "new" };
  }

  return null;
}

function formatIssueStatusHistoryAt(value) {
  return formatAbsoluteDateTime(value) || "—";
}

function AddQualityIssueModal({ open, onClose, onSubmit, isSubmitting, submitError }) {
  const [title, setTitle] = useState("");
  const [currentBehavior, setCurrentBehavior] = useState("");
  const [expectedBehavior, setExpectedBehavior] = useState("");
  const [comment, setComment] = useState("");
  const [area, setArea] = useState("other");

  if (!open) {
    return null;
  }

  const handleSubmit = async (event) => {
    event.preventDefault();

    const trimmedTitle = title.trim();
    const trimmedCurrentBehavior = currentBehavior.trim();
    const trimmedExpectedBehavior = expectedBehavior.trim();

    if (!trimmedTitle || !trimmedCurrentBehavior || !trimmedExpectedBehavior) {
      return;
    }

    try {
      await onSubmit({
        title: trimmedTitle,
        area,
        current_behavior: trimmedCurrentBehavior,
        expected_behavior: trimmedExpectedBehavior,
        comment: comment.trim() || null,
        detected_place: "Studio",
        priority: "medium",
        description: trimmedCurrentBehavior,
      });

      setTitle("");
      setCurrentBehavior("");
      setExpectedBehavior("");
      setComment("");
      setArea("other");
    } catch {
      // Ошибка отображается в submitError, форму не сбрасываем.
    }
  };

  return (
    <div
      className="platform-dev__modal-overlay"
      onMouseDown={onClose}
      role="presentation"
    >
      <div
        className="platform-dev__modal"
        onMouseDown={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="platform-quality-modal-title"
      >
        <h3 id="platform-quality-modal-title" className="platform-dev__modal-title">
          Добавить проблему качества
        </h3>

        <form onSubmit={handleSubmit}>
          <div className="platform-dev__field">
            <label htmlFor="quality-title">Название проблемы</label>
            <input
              id="quality-title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Кратко опишите проблему"
              required
              disabled={isSubmitting}
            />
          </div>

          <div className="platform-dev__field">
            <label htmlFor="quality-current-behavior">Что происходит сейчас</label>
            <textarea
              id="quality-current-behavior"
              value={currentBehavior}
              onChange={(event) => setCurrentBehavior(event.target.value)}
              placeholder="Опишите текущее нежелательное поведение"
              required
              disabled={isSubmitting}
            />
          </div>

          <div className="platform-dev__field">
            <label htmlFor="quality-expected-behavior">Как должно быть</label>
            <textarea
              id="quality-expected-behavior"
              value={expectedBehavior}
              onChange={(event) => setExpectedBehavior(event.target.value)}
              placeholder="Опишите ожидаемое поведение"
              required
              disabled={isSubmitting}
            />
          </div>

          <div className="platform-dev__field">
            <label htmlFor="quality-comment">Комментарий</label>
            <textarea
              id="quality-comment"
              value={comment}
              onChange={(event) => setComment(event.target.value)}
              placeholder="Дополнительный контекст для проверки"
              disabled={isSubmitting}
            />
          </div>

          <div className="platform-dev__field">
            <label htmlFor="quality-area">Область</label>
            <select
              id="quality-area"
              value={area}
              onChange={(event) => setArea(event.target.value)}
              disabled={isSubmitting}
            >
              {AREA_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {submitError ? (
            <p className="platform-dev__quality-error">{submitError}</p>
          ) : null}

          <div className="platform-dev__modal-actions">
            <button
              type="button"
              className="platform-dev__btn"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Отмена
            </button>
            <button
              type="submit"
              className="platform-dev__btn platform-dev__btn--primary"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Сохранение..." : "Добавить"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function PlatformDevelopmentPage() {
  const { tenantId } = useParams();
  const location = useLocation();
  const activeTabKey = resolvePlatformTabKey(location.pathname);
  const isKnownTab = PLATFORM_TABS.some((tab) => tab.key === activeTabKey);
  const platformBasePath = `/designer/tenant/${tenantId}/platform`;

  const [platformComponents, setPlatformComponents] = useState([]);
  const [implementationStages, setImplementationStages] = useState([]);
  const [platformTasks, setPlatformTasks] = useState([]);
  const [platformActivities, setPlatformActivities] = useState([]);
  const [dashboardSummary, setDashboardSummary] = useState(null);
  const [isLoadingDashboard, setIsLoadingDashboard] = useState(true);
  const [isRefreshingDashboard, setIsRefreshingDashboard] = useState(false);
  const [dashboardError, setDashboardError] = useState("");
  const [refreshError, setRefreshError] = useState("");
  const [refreshSuccessMessage, setRefreshSuccessMessage] = useState("");

  const [qualityIssues, setQualityIssues] = useState([]);
  const [isLoadingIssues, setIsLoadingIssues] = useState(true);
  const [issuesError, setIssuesError] = useState("");
  const [isAddIssueOpen, setIsAddIssueOpen] = useState(false);
  const [isSubmittingIssue, setIsSubmittingIssue] = useState(false);
  const [submitIssueError, setSubmitIssueError] = useState("");

  const loadDashboardData = useCallback(async ({ silent = false } = {}) => {
    if (!silent) {
      setIsLoadingDashboard(true);
    }
    setDashboardError("");

    try {
      const [summary, components, stages, tasks, activities] = await Promise.all([
        platformDashboardApi.getPlatformDashboardSummary(),
        platformDashboardApi.listPlatformComponents(),
        platformDashboardApi.listPlatformStages(),
        platformDashboardApi.listPlatformTasks(),
        platformDashboardApi.listPlatformActivities(),
      ]);

      setDashboardSummary(summary);
      setPlatformComponents(Array.isArray(components) ? components : []);
      setImplementationStages(Array.isArray(stages) ? stages : []);
      setPlatformTasks(Array.isArray(tasks) ? tasks : []);
      setPlatformActivities(Array.isArray(activities) ? activities : []);
    } catch (error) {
      setDashboardError(
        getApiErrorMessage(error, "Не удалось загрузить данные Platform Dashboard"),
      );
      if (!silent) {
        setDashboardSummary(null);
        setPlatformComponents([]);
        setImplementationStages([]);
        setPlatformTasks([]);
        setPlatformActivities([]);
      }
    } finally {
      if (!silent) {
        setIsLoadingDashboard(false);
      }
    }
  }, []);

  const handleRefreshDashboard = async () => {
    setIsRefreshingDashboard(true);
    setRefreshError("");
    setRefreshSuccessMessage("");

    try {
      const refreshResult = await platformDashboardApi.refreshPlatformDashboard();

      setDashboardSummary((previous) => ({
        ...(previous || {}),
        last_updated: refreshResult.refreshed_at,
        refreshed_at: refreshResult.refreshed_at,
        overall_readiness: refreshResult.overall_readiness ?? previous?.overall_readiness,
        components_count: refreshResult.components_count ?? previous?.components_count,
        stages_count: refreshResult.stages_count ?? previous?.stages_count,
        analyzer_version: refreshResult.analyzer_version,
        analyzer_hash: refreshResult.analyzer_hash,
        current_analyzer_hash: refreshResult.current_analyzer_hash,
        is_stale: false,
      }));

      await loadDashboardData({ silent: true });
      setRefreshSuccessMessage("✓ Данные обновлены");
    } catch (error) {
      setRefreshError(
        getApiErrorMessage(error, "Не удалось обновить данные Dashboard"),
      );
    } finally {
      setIsRefreshingDashboard(false);
    }
  };

  useEffect(() => {
    if (!refreshSuccessMessage) {
      return undefined;
    }

    const timer = window.setTimeout(() => {
      setRefreshSuccessMessage("");
    }, 2500);

    return () => window.clearTimeout(timer);
  }, [refreshSuccessMessage]);

  const loadQualityIssues = useCallback(async () => {
    setIsLoadingIssues(true);
    setIssuesError("");

    try {
      const items = await qualityIssuesApi.listQualityIssues();
      setQualityIssues(Array.isArray(items) ? items : []);
    } catch (error) {
      setIssuesError(
        getApiErrorMessage(error, "Не удалось загрузить проблемы качества"),
      );
      setQualityIssues([]);
    } finally {
      setIsLoadingIssues(false);
    }
  }, []);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  useEffect(() => {
    loadQualityIssues();
  }, [loadQualityIssues]);

  const [expandedPhaseId, setExpandedPhaseId] = useState(null);
  const [selectedContourId, setSelectedContourId] = useState(null);
  const [selectedIssueId, setSelectedIssueId] = useState(null);
  const [selectedHistoryId, setSelectedHistoryId] = useState(null);
  const [historySortDirection, setHistorySortDirection] = useState(readHistorySortDirection);

  useEffect(() => {
    if (implementationStages.length === 0) {
      setExpandedPhaseId(null);
      return;
    }

    setExpandedPhaseId((previous) => {
      if (previous != null && implementationStages.some((phase) => phase.id === previous)) {
        return previous;
      }

      return resolveDefaultExpandedPhaseId(implementationStages);
    });
  }, [implementationStages]);

  useEffect(() => {
    if (platformComponents.length === 0) {
      setSelectedContourId(null);
      return;
    }

    setSelectedContourId((previous) => {
      if (previous != null && platformComponents.some((contour) => contour.id === previous)) {
        return previous;
      }

      return resolveDefaultContourId(platformComponents);
    });
  }, [platformComponents]);

  const handleSelectImplementationPhase = (phaseId) => {
    setExpandedPhaseId(phaseId);
  };

  const selectedImplementationPhase = useMemo(
    () => implementationStages.find((phase) => phase.id === expandedPhaseId) ?? null,
    [implementationStages, expandedPhaseId],
  );

  const selectedContour = useMemo(
    () => platformComponents.find((contour) => contour.id === selectedContourId) ?? null,
    [platformComponents, selectedContourId],
  );

  const selectedQualityIssue = useMemo(
    () => qualityIssues.find((issue) => issue.id === selectedIssueId) ?? null,
    [qualityIssues, selectedIssueId],
  );

  const sortedPlatformHistory = useMemo(() => {
    return [...platformActivities].sort((left, right) => {
      const leftTime = parseApiDateTime(left.created_at)?.getTime() ?? 0;
      const rightTime = parseApiDateTime(right.created_at)?.getTime() ?? 0;

      if (leftTime === rightTime) {
        return (right.id ?? 0) - (left.id ?? 0);
      }

      return historySortDirection === "desc" ? rightTime - leftTime : leftTime - rightTime;
    });
  }, [platformActivities, historySortDirection]);

  const handleToggleHistorySort = useCallback(() => {
    setHistorySortDirection((previous) => {
      const nextDirection = getNextHistorySortDirection(previous);
      writeHistorySortDirection(nextDirection);
      return nextDirection;
    });
  }, []);

  const selectedHistoryEvent = useMemo(
    () => sortedPlatformHistory.find((event) => event.id === selectedHistoryId) ?? null,
    [sortedPlatformHistory, selectedHistoryId],
  );

  useEffect(() => {
    if (qualityIssues.length === 0) {
      setSelectedIssueId(null);
      return;
    }

    setSelectedIssueId((previous) => {
      if (previous != null && qualityIssues.some((issue) => issue.id === previous)) {
        return previous;
      }

      return resolveDefaultIssueId(qualityIssues);
    });
  }, [qualityIssues]);

  useEffect(() => {
    if (sortedPlatformHistory.length === 0) {
      setSelectedHistoryId(null);
      return;
    }

    setSelectedHistoryId((previous) => {
      if (previous != null && sortedPlatformHistory.some((event) => event.id === previous)) {
        return previous;
      }

      return resolveDefaultHistoryId(sortedPlatformHistory);
    });
  }, [sortedPlatformHistory]);

  const handleAddQualityIssue = async (payload) => {
    setIsSubmittingIssue(true);
    setSubmitIssueError("");

    try {
      const createdIssue = await qualityIssuesApi.createQualityIssue(payload);
      setQualityIssues((previous) => [createdIssue, ...previous]);
      setIsAddIssueOpen(false);
    } catch (error) {
      setSubmitIssueError(
        getApiErrorMessage(error, "Не удалось сохранить проблему качества"),
      );
      throw error;
    } finally {
      setIsSubmittingIssue(false);
    }
  };

  const handleQualityIssueUpdated = useCallback((updatedIssue) => {
    setQualityIssues((previous) =>
      previous.map((item) => (item.id === updatedIssue.id ? updatedIssue : item)),
    );
  }, []);

  const handleCloseAddIssueModal = () => {
    if (isSubmittingIssue) {
      return;
    }

    setSubmitIssueError("");
    setIsAddIssueOpen(false);
  };

  if (!activeTabKey || !isKnownTab) {
    return <Navigate to={`${platformBasePath}/architecture`} replace />;
  }

  const lastUpdatedLabel = formatManifestUpdatedAt(
    dashboardSummary?.refreshed_at || dashboardSummary?.last_updated,
  );
  const isDashboardStale = Boolean(dashboardSummary?.is_stale);

  const renderDashboardStatus = () => {
    if (isLoadingDashboard) {
      return <p className="platform-dev__master-status">Загрузка данных...</p>;
    }

    if (dashboardError) {
      return (
        <p className="platform-dev__master-status">
          {dashboardError}. Нажмите «Обновить», чтобы пересчитать Dashboard.
        </p>
      );
    }

    if (refreshError) {
      return <p className="platform-dev__master-status">{refreshError}</p>;
    }

    if (platformComponents.length === 0 && implementationStages.length === 0) {
      return (
        <p className="platform-dev__master-status">
          Данные Dashboard ещё не рассчитаны. Нажмите «Обновить».
        </p>
      );
    }

    return null;
  };

  const renderArchitectureTab = () => (
    <MasterDetailsWorkspace
      title="Готовность контуров платформы"
      masterLabel="Архитектурные компоненты"
      detailLabel="Детали компонента"
      master={
        <>
          {renderDashboardStatus()}
          <ArchitectureMasterList
            contours={platformComponents}
            selectedContourId={selectedContourId}
            onSelectContour={setSelectedContourId}
          />
        </>
      }
      detail={<ArchitectureContourDetailsPanel contour={selectedContour} />}
    />
  );

  const renderImplementationTab = () => (
    <MasterDetailsWorkspace
      title="Создание платформы"
      masterLabel="Этапы roadmap"
      detailLabel="Детали этапа"
      master={
        <>
          {renderDashboardStatus()}
          <ImplementationMasterList
            phases={implementationStages}
            selectedPhaseId={expandedPhaseId}
            onSelectPhase={handleSelectImplementationPhase}
          />
        </>
      }
      detail={
        selectedImplementationPhase ? (
          <ImplementationPhaseDetailsPanel phase={selectedImplementationPhase} />
        ) : (
          <DetailEmptyState message="Выберите этап в списке слева." />
        )
      }
    />
  );

  const renderHistoryTab = () => (
    <MasterDetailsWorkspace
      title="История развития"
      titleAddon={
        <TableSortToggleButton
          sortDirection={historySortDirection}
          onToggle={handleToggleHistorySort}
          title={getHistorySortTitle(historySortDirection)}
        />
      }
      masterLabel="Список событий"
      detailLabel="Детали события"
      master={
        <>
          {renderDashboardStatus()}
          <HistoryMasterList
            events={sortedPlatformHistory}
            selectedEventId={selectedHistoryId}
            onSelectEvent={setSelectedHistoryId}
          />
        </>
      }
      detail={<HistoryEventDetailsPanel event={selectedHistoryEvent} />}
    />
  );

  const renderQualityTab = () => (
    <MasterDetailsWorkspace
      className="platform-dev__workspace--quality"
      title="Проблемы качества"
      masterLabel="Список проблем"
      detailLabel="Детали проблемы"
      headerActions={
        <button
          type="button"
          className="platform-dev__btn platform-dev__btn--primary platform-dev__quality-add-btn"
          onClick={() => setIsAddIssueOpen(true)}
          disabled={isLoadingIssues}
        >
          + Добавить проблему
        </button>
      }
      master={
        <>
          {issuesError ? <p className="platform-dev__master-status">{issuesError}</p> : null}
          <QualityMasterList
            issues={qualityIssues}
            selectedIssueId={selectedIssueId}
            onSelectIssue={setSelectedIssueId}
            isLoading={isLoadingIssues}
            hasError={Boolean(issuesError)}
          />
        </>
      }
      detail={
        <QualityIssueDetailsPanel
          issue={selectedQualityIssue}
          onIssueUpdated={handleQualityIssueUpdated}
        />
      }
    />
  );

  const renderActiveTab = () => {
    switch (activeTabKey) {
      case "architecture":
        return renderArchitectureTab();
      case "implementation":
        return renderImplementationTab();
      case "quality":
        return renderQualityTab();
      case "history":
        return renderHistoryTab();
      default:
        return null;
    }
  };

  return (
    <div className="platform-dev">
      <div className="platform-dev__tab-bar">
        <nav className="platform-dev__tabs" aria-label="Разделы Platform Dashboard">
          {PLATFORM_TABS.map((tab) => (
            <NavLink
              key={tab.key}
              to={`${platformBasePath}/${tab.key}`}
              className={({ isActive }) =>
                `platform-dev__tab${isActive ? " is-active" : ""}`
              }
            >
              {tab.label}
            </NavLink>
          ))}
        </nav>
        <div className={`platform-dev__tab-bar-actions${isDashboardStale ? " is-stale" : ""}`}>
          {isDashboardStale ? (
            <p className="platform-dev__stale-label">Требуется обновление</p>
          ) : null}
          <RefreshIconButton
            onClick={handleRefreshDashboard}
            disabled={isLoadingDashboard || isRefreshingDashboard}
            spinning={isRefreshingDashboard}
            className={isDashboardStale ? "is-stale-needed" : ""}
            title={isDashboardStale ? "Обновить данные Dashboard" : "Обновить"}
          />
          <p className="platform-dev__last-updated">
            Обновлено: {lastUpdatedLabel}
          </p>
        </div>
      </div>

      {isDashboardStale && !isLoadingDashboard && !dashboardError ? (
        <div className="platform-dev__freshness-banner" role="status">
          <div>
            <strong>Данные требуют обновления.</strong>{" "}
            Код analyzer изменился, а кэш Dashboard ещё не пересчитан.
          </div>
          <button
            type="button"
            className="platform-dev__freshness-banner-action"
            onClick={handleRefreshDashboard}
            disabled={isRefreshingDashboard}
          >
            {isRefreshingDashboard ? "Обновление..." : "Обновить сейчас"}
          </button>
        </div>
      ) : null}

      {refreshSuccessMessage ? (
        <div className="platform-dev__toast" role="status" aria-live="polite">
          {refreshSuccessMessage}
        </div>
      ) : null}

      <div className="platform-dev__tab-panel">{renderActiveTab()}</div>

      {activeTabKey === "quality" ? (
        <AddQualityIssueModal
          open={isAddIssueOpen}
          onClose={handleCloseAddIssueModal}
          onSubmit={handleAddQualityIssue}
          isSubmitting={isSubmittingIssue}
          submitError={submitIssueError}
        />
      ) : null}
    </div>
  );
}
