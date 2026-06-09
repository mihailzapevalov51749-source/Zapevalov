import { useCallback, useEffect, useMemo, useState } from "react";
import { NavLink, Navigate, useLocation, useParams } from "react-router-dom";

import { getApiErrorMessage } from "../../designer/api/platformApiClient";
import {
  PAGE_LAYOUT_PAGE_TYPE,
  PAGE_LAYOUT_TOOLBAR_ZONE,
  useResolvedPageLayoutContract,
} from "../../../shared/appShell/pageLayoutContract";
import RefreshIconButton from "../../../shared/ui/RefreshIconButton";
import {
  buildPlatformDashboardMetadata,
  resolvePlatformDashboardUserId,
} from "../../../yasii/hostContextBuilders";
import { YasiiSurfaceContextProvider } from "../../../yasii/context/YasiiSurfaceContext.jsx";
import { EMBEDDED_SURFACE_IDS } from "../../../yasii/embedded/embeddedSurfaceTypes.js";
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
import OwnerStageDetailPanel from "../components/OwnerStageDetailPanel.jsx";
import OwnerStageMasterList from "../components/OwnerStageMasterList.jsx";
import {
  buildCompanyStages,
  buildDevelopmentStages,
  buildPlatformStages,
  resolveDefaultStageId,
} from "../dashboard/buildOwnerStageView.js";
import {
  isOwnerDashboardViewPayload,
  resolveOwnerDashboardHistory,
  resolveOwnerDashboardStages,
  resolveOwnerSectionTitle,
} from "../dashboard/ownerDashboardIntegration.js";
import {
  DASHBOARD_SECTIONS,
  isKnownDashboardSection,
  resolveDashboardSectionKey,
  resolveYasiiDashboardTabKey,
} from "../dashboard/dashboardSections.js";

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

function OwnerStagesWorkspace({
  sectionTitle,
  stages,
  selectedStageId,
  onSelectStage,
  statusSlot = null,
  emptyMessage,
  implementationStages = [],
  dashboardRefreshedAt = null,
}) {
  const selectedStage =
    stages.find((stage) => stage.id === selectedStageId) ?? null;

  return (
    <MasterDetailsWorkspace
      title={sectionTitle}
      masterLabel="Этапы"
      detailLabel="Состояние этапа"
      master={
        <>
          {statusSlot}
          <OwnerStageMasterList
            stages={stages}
            selectedStageId={selectedStageId}
            onSelectStage={onSelectStage}
            emptyMessage={emptyMessage}
          />
        </>
      }
      detail={
        <OwnerStageDetailPanel
          stage={selectedStage}
          implementationStages={implementationStages}
          dashboardRefreshedAt={dashboardRefreshedAt}
        />
      }
    />
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

function HistoryMasterList({ events, selectedEventId, onSelectEvent, ownerView = false }) {
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
          title={ownerView ? event.title : formatActivityDate(event.created_at)}
          subtitle={
            ownerView
              ? formatActivityDate(event.created_at)
              : `${getActivityTypeLabel(event.type)} · ${event.title}`
          }
        />
      ))}
    </MasterList>
  );
}

function HistoryEventDetailsPanel({ event, ownerView = false }) {
  if (!event) {
    return <DetailEmptyState message="Выберите событие в списке слева." />;
  }

  if (ownerView) {
    return (
      <div className="platform-dev__detail-view">
        <time className="platform-dev__detail-view-date" dateTime={event.created_at}>
          {formatAbsoluteDateTime(event.created_at)}
        </time>
        <h3 className="platform-dev__detail-view-title">{event.title}</h3>
        <div className="platform-dev__detail-fields">
          {event.description ? (
            <DetailField label="Описание">
              <p className="platform-dev__detail-multiline">{event.description}</p>
            </DetailField>
          ) : null}
          {event.initiated_by_name ? (
            <DetailField label="Инициатор">
              <p>{event.initiated_by_name}</p>
            </DetailField>
          ) : null}
        </div>
      </div>
    );
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
  useResolvedPageLayoutContract({
    pageType: PAGE_LAYOUT_PAGE_TYPE.DASHBOARD,
    toolbarZoneId: PAGE_LAYOUT_TOOLBAR_ZONE.APP_HEADER,
    canMinimize: true,
  });

  const { tenantId } = useParams();
  const location = useLocation();
  const sectionResolution = resolveDashboardSectionKey(location.pathname);
  const activeSectionKey = sectionResolution?.sectionKey ?? null;
  const legacySectionSegment = sectionResolution?.legacySegment ?? null;
  const yasiiDashboardTabKey = resolveYasiiDashboardTabKey(activeSectionKey);
  const platformBasePath = `/designer/tenant/${tenantId}/platform`;

  const [platformComponents, setPlatformComponents] = useState([]);
  const [implementationStages, setImplementationStages] = useState([]);
  const [governanceModel, setGovernanceModel] = useState(null);
  const [platformTasks, setPlatformTasks] = useState([]);
  const [platformActivities, setPlatformActivities] = useState([]);
  const [ownerDashboardView, setOwnerDashboardView] = useState(null);
  const [ownerDashboardActive, setOwnerDashboardActive] = useState(false);
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
      const results = await Promise.allSettled([
        platformDashboardApi.getPlatformDashboardSummary(),
        platformDashboardApi.listPlatformComponents(),
        platformDashboardApi.listPlatformStages(),
        platformDashboardApi.listPlatformTasks(),
        platformDashboardApi.listPlatformActivities(),
        platformDashboardApi.getOwnerDashboardView(),
      ]);

      const summary = results[0].status === "fulfilled" ? results[0].value : null;
      const components = results[1].status === "fulfilled" ? results[1].value : [];
      const stagesPayload = results[2].status === "fulfilled" ? results[2].value : { items: [] };
      const stages = Array.isArray(stagesPayload)
        ? stagesPayload
        : stagesPayload.items ?? [];
      const governanceFromStages = Array.isArray(stagesPayload)
        ? null
        : stagesPayload.governance ?? null;
      const tasks = results[3].status === "fulfilled" ? results[3].value : [];
      const activities = results[4].status === "fulfilled" ? results[4].value : [];
      const ownerViewPayload =
        results[5].status === "fulfilled" ? results[5].value : null;
      const ownerViewActive = isOwnerDashboardViewPayload(ownerViewPayload);

      const failedRequests = results.filter(
        (result, index) => result.status === "rejected" && index !== 5,
      );
      if (failedRequests.length > 0) {
        const firstError = failedRequests[0];
        setDashboardError(
          getApiErrorMessage(
            firstError.reason,
            "Не удалось загрузить часть данных Platform Dashboard",
          ),
        );
      }

      setDashboardSummary(summary);
      setPlatformComponents(Array.isArray(components) ? components : []);
      setImplementationStages(Array.isArray(stages) ? stages : []);
      setGovernanceModel(governanceFromStages);
      setPlatformTasks(Array.isArray(tasks) ? tasks : []);
      setPlatformActivities(Array.isArray(activities) ? activities : []);
      setOwnerDashboardView(ownerViewActive ? ownerViewPayload : null);
      setOwnerDashboardActive(ownerViewActive);
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
        setOwnerDashboardView(null);
        setOwnerDashboardActive(false);
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

  const [selectedPlatformStageId, setSelectedPlatformStageId] = useState(null);
  const [selectedDevelopmentStageId, setSelectedDevelopmentStageId] = useState(null);
  const [selectedCompanyStageId, setSelectedCompanyStageId] = useState(null);
  const [selectedIssueId, setSelectedIssueId] = useState(null);
  const [selectedHistoryId, setSelectedHistoryId] = useState(null);
  const [historySortDirection, setHistorySortDirection] = useState(readHistorySortDirection);

  const legacyPlatformStages = useMemo(
    () => buildPlatformStages(platformComponents, governanceModel?.platform),
    [platformComponents, governanceModel],
  );

  const legacyDevelopmentStages = useMemo(
    () => buildDevelopmentStages(implementationStages),
    [implementationStages],
  );

  const legacyCompanyStages = useMemo(
    () => buildCompanyStages(governanceModel?.companyWorkspaces),
    [governanceModel],
  );

  const platformStages = useMemo(() => {
    if (ownerDashboardActive) {
      return (
        resolveOwnerDashboardStages(ownerDashboardView, "platform")
        ?? legacyPlatformStages
      );
    }
    return legacyPlatformStages;
  }, [ownerDashboardActive, ownerDashboardView, legacyPlatformStages]);

  const developmentStages = useMemo(() => {
    if (ownerDashboardActive) {
      return (
        resolveOwnerDashboardStages(ownerDashboardView, "development")
        ?? legacyDevelopmentStages
      );
    }
    return legacyDevelopmentStages;
  }, [ownerDashboardActive, ownerDashboardView, legacyDevelopmentStages]);

  const companyStages = useMemo(() => {
    if (ownerDashboardActive) {
      return (
        resolveOwnerDashboardStages(ownerDashboardView, "companies")
        ?? legacyCompanyStages
      );
    }
    return legacyCompanyStages;
  }, [ownerDashboardActive, ownerDashboardView, legacyCompanyStages]);

  const ownerHistoryEvents = useMemo(() => {
    if (!ownerDashboardActive) {
      return null;
    }
    return resolveOwnerDashboardHistory(ownerDashboardView);
  }, [ownerDashboardActive, ownerDashboardView]);

  useEffect(() => {
    setSelectedPlatformStageId((previous) => {
      if (
        previous != null
        && platformStages.some((stage) => String(stage.id) === String(previous))
      ) {
        return previous;
      }
      return resolveDefaultStageId(platformStages);
    });
  }, [platformStages]);

  useEffect(() => {
    setSelectedDevelopmentStageId((previous) => {
      if (
        previous != null
        && developmentStages.some((stage) => String(stage.id) === String(previous))
      ) {
        return previous;
      }
      const currentPhase = implementationStages.find((phase) => phase.current_position);
      if (currentPhase) {
        return String(currentPhase.id);
      }
      return resolveDefaultStageId(developmentStages);
    });
  }, [developmentStages, implementationStages]);

  useEffect(() => {
    setSelectedCompanyStageId((previous) => {
      if (
        previous != null
        && companyStages.some((stage) => String(stage.id) === String(previous))
      ) {
        return previous;
      }
      return resolveDefaultStageId(companyStages);
    });
  }, [companyStages]);

  const selectedDevelopmentPhase = useMemo(
    () =>
      implementationStages.find(
        (phase) => String(phase.id) === String(selectedDevelopmentStageId),
      ) ?? null,
    [implementationStages, selectedDevelopmentStageId],
  );

  const platformDashboardUserId = useMemo(() => resolvePlatformDashboardUserId(), []);

  const yasiiWidgetId = yasiiDashboardTabKey || "platform-dashboard";

  const yasiiSelectedScope = useMemo(() => {
    if (activeSectionKey === "development") {
      if (selectedDevelopmentPhase?.slug) {
        return String(selectedDevelopmentPhase.slug);
      }

      if (selectedDevelopmentStageId != null) {
        return String(selectedDevelopmentStageId);
      }
    }

    return yasiiDashboardTabKey || "platform-dashboard";
  }, [
    activeSectionKey,
    selectedDevelopmentPhase,
    selectedDevelopmentStageId,
    yasiiDashboardTabKey,
  ]);

  const yasiiContextPhase = useMemo(() => {
    if (activeSectionKey === "development") {
      return selectedDevelopmentPhase;
    }

    return (
      implementationStages.find((phase) => phase.current_position)
      ?? implementationStages.find((phase) => phase.status === "in_progress")
      ?? null
    );
  }, [activeSectionKey, implementationStages, selectedDevelopmentPhase]);

  const yasiiDashboardMetadata = useMemo(
    () =>
      buildPlatformDashboardMetadata({
        activeTabKey: yasiiDashboardTabKey,
        phase: yasiiContextPhase,
        dashboardSummary,
      }),
    [yasiiDashboardTabKey, dashboardSummary, yasiiContextPhase],
  );

  const yasiiSurfaceValue = useMemo(
    () => ({
      surfaceId: EMBEDDED_SURFACE_IDS.DASHBOARD,
      contextData: {
        tenantId,
        userId: platformDashboardUserId,
        widgetId: yasiiWidgetId,
        selectedScope: yasiiSelectedScope,
        metadata: yasiiDashboardMetadata,
      },
      inputPlaceholder: "Спросите ЯСИИ о ...",
    }),
    [
      tenantId,
      platformDashboardUserId,
      yasiiDashboardMetadata,
      yasiiSelectedScope,
      yasiiWidgetId,
    ],
  );

  const selectedQualityIssue = useMemo(
    () => qualityIssues.find((issue) => issue.id === selectedIssueId) ?? null,
    [qualityIssues, selectedIssueId],
  );

  const sortedPlatformHistory = useMemo(() => {
    const sourceEvents =
      ownerDashboardActive && ownerHistoryEvents
        ? ownerHistoryEvents
        : platformActivities;

    return [...sourceEvents].sort((left, right) => {
      const leftTime = parseApiDateTime(left.created_at)?.getTime() ?? 0;
      const rightTime = parseApiDateTime(right.created_at)?.getTime() ?? 0;

      if (leftTime === rightTime) {
        const leftId = Number(left.id);
        const rightId = Number(right.id);
        if (!Number.isNaN(leftId) && !Number.isNaN(rightId)) {
          return rightId - leftId;
        }
        return String(right.id).localeCompare(String(left.id));
      }

      return historySortDirection === "desc" ? rightTime - leftTime : leftTime - rightTime;
    });
  }, [
    ownerDashboardActive,
    ownerHistoryEvents,
    platformActivities,
    historySortDirection,
  ]);

  const historyOwnerView = ownerDashboardActive && Boolean(ownerHistoryEvents);

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

  if (!activeSectionKey || !isKnownDashboardSection(activeSectionKey)) {
    return <Navigate to={`${platformBasePath}/platform`} replace />;
  }

  if (legacySectionSegment) {
    return <Navigate to={`${platformBasePath}/${activeSectionKey}`} replace />;
  }

  const dashboardRefreshedAt =
    dashboardSummary?.refreshed_at || dashboardSummary?.last_updated || null;

  const lastUpdatedLabel = formatManifestUpdatedAt(dashboardRefreshedAt);
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

    if (
      !ownerDashboardActive
      && platformComponents.length === 0
      && implementationStages.length === 0
    ) {
      return (
        <p className="platform-dev__master-status">
          Данные Dashboard ещё не рассчитаны. Нажмите «Обновить».
        </p>
      );
    }

    return null;
  };

  const platformSectionTitle = ownerDashboardActive
    ? resolveOwnerSectionTitle(ownerDashboardView, "platform", "Платформа")
    : "Платформа";

  const developmentSectionTitle = ownerDashboardActive
    ? resolveOwnerSectionTitle(ownerDashboardView, "development", "Развитие продукта")
    : "Развитие продукта";

  const companiesSectionTitle = ownerDashboardActive
    ? resolveOwnerSectionTitle(ownerDashboardView, "companies", "Компании")
    : "Компании";

  const ownerStageWorkspaceProps = {
    implementationStages,
    dashboardRefreshedAt,
  };

  const renderPlatformSection = () => (
    <OwnerStagesWorkspace
      sectionTitle={platformSectionTitle}
      stages={platformStages}
      selectedStageId={selectedPlatformStageId}
      onSelectStage={setSelectedPlatformStageId}
      statusSlot={renderDashboardStatus()}
      emptyMessage="Этапы платформы пока не загружены."
      {...ownerStageWorkspaceProps}
    />
  );

  const renderDevelopmentSection = () => (
    <OwnerStagesWorkspace
      sectionTitle={developmentSectionTitle}
      stages={developmentStages}
      selectedStageId={selectedDevelopmentStageId}
      onSelectStage={setSelectedDevelopmentStageId}
      statusSlot={renderDashboardStatus()}
      emptyMessage="Этапы разработки пока не загружены."
      {...ownerStageWorkspaceProps}
    />
  );

  const renderCompaniesSection = () => (
    <OwnerStagesWorkspace
      sectionTitle={companiesSectionTitle}
      stages={companyStages}
      selectedStageId={selectedCompanyStageId}
      onSelectStage={setSelectedCompanyStageId}
      statusSlot={renderDashboardStatus()}
      emptyMessage="Компании пока не настроены."
      {...ownerStageWorkspaceProps}
    />
  );

  const renderHistorySection = () => (
    <MasterDetailsWorkspace
      title="История"
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
            ownerView={historyOwnerView}
          />
        </>
      }
      detail={
        <HistoryEventDetailsPanel
          event={selectedHistoryEvent}
          ownerView={historyOwnerView}
        />
      }
    />
  );

  const renderQualitySection = () => (
    <MasterDetailsWorkspace
      className="platform-dev__workspace--quality"
      title="Качество"
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

  const renderActiveSection = () => {
    switch (activeSectionKey) {
      case "platform":
        return renderPlatformSection();
      case "development":
        return renderDevelopmentSection();
      case "companies":
        return renderCompaniesSection();
      case "quality":
        return renderQualitySection();
      case "history":
        return renderHistorySection();
      default:
        return null;
    }
  };

  return (
    <YasiiSurfaceContextProvider value={yasiiSurfaceValue}>
      <div className="platform-dev">
      <div className="platform-dev__tab-bar">
        <nav className="platform-dev__tabs" aria-label="Разделы Dashboard">
          {DASHBOARD_SECTIONS.map((section) => (
            <NavLink
              key={section.key}
              to={`${platformBasePath}/${section.key}`}
              className={({ isActive }) =>
                `platform-dev__tab${isActive ? " is-active" : ""}`
              }
            >
              {section.label}
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

      <div className="platform-dev__tab-panel">{renderActiveSection()}</div>

      {activeSectionKey === "quality" ? (
        <AddQualityIssueModal
          open={isAddIssueOpen}
          onClose={handleCloseAddIssueModal}
          onSubmit={handleAddQualityIssue}
          isSubmitting={isSubmittingIssue}
          submitError={submitIssueError}
        />
      ) : null}
      </div>
    </YasiiSurfaceContextProvider>
  );
}
