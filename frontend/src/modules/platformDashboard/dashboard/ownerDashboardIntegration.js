/**
 * Owner Dashboard UI integration (T1): maps OwnerDashboardView → UI stages/events
 * with fallback to legacy buildOwnerStageView when owner API is unavailable.
 */

const FORBIDDEN_UI_PATTERN =
  /(?:modules\/|\.md\b|\.py\b|\.jsx\b|universalTable|P\d+-W\d+|\bACE\b|raw_items|source_event_ids)/i;

const OWNER_STAGE_META_UI_KEYS = new Set([
  "implementation_stage_slugs",
  "displayTitle",
  "workspaceTitle",
  "tenantId",
]);

export function isOwnerDashboardViewPayload(payload) {
  return Boolean(
    payload
    && typeof payload === "object"
    && Array.isArray(payload.sections)
    && payload.sections.every(
      (section) =>
        section
        && typeof section.key === "string"
        && Array.isArray(section.stages ?? [])
        && Array.isArray(section.events ?? []),
    ),
  );
}

export function findOwnerSection(view, sectionKey) {
  if (!isOwnerDashboardViewPayload(view)) {
    return null;
  }
  return view.sections.find((section) => section.key === sectionKey) ?? null;
}

function sanitizeOwnerVisibleText(text) {
  const value = String(text ?? "").trim();
  if (!value || FORBIDDEN_UI_PATTERN.test(value)) {
    return "";
  }
  return value;
}

function pickOwnerStageMetaForUi(meta = {}) {
  const result = {};
  for (const key of OWNER_STAGE_META_UI_KEYS) {
    if (meta[key] == null) {
      continue;
    }
    result[key] = meta[key];
  }
  return result;
}

function pickCompanyStageTitle(stage) {
  const meta = stage?.meta || {};
  const workspaceTitle = sanitizeOwnerVisibleText(
    meta.displayTitle || meta.workspaceTitle,
  );
  const stageTitle = sanitizeOwnerVisibleText(stage?.title);
  if (workspaceTitle && stageTitle && workspaceTitle !== stageTitle) {
    return workspaceTitle;
  }
  return workspaceTitle || stageTitle || "Компания";
}

function pickCompanyStageSubtitle(stage) {
  const meta = stage?.meta || {};
  const workspaceTitle = sanitizeOwnerVisibleText(
    meta.displayTitle || meta.workspaceTitle,
  );
  const stageTitle = sanitizeOwnerVisibleText(stage?.title);
  if (workspaceTitle && stageTitle && workspaceTitle !== stageTitle) {
    return stageTitle;
  }
  return null;
}

export function mapOwnerStageToUi(stage, { sectionKey } = {}) {
  if (!stage) {
    return null;
  }

  const meta = pickOwnerStageMetaForUi(stage.meta || {});
  const isCompanySection = sectionKey === "companies";

  const title = isCompanySection ? pickCompanyStageTitle(stage) : sanitizeOwnerVisibleText(stage.title) || "—";
  const subtitle = isCompanySection ? pickCompanyStageSubtitle(stage) : null;

  return {
    id: String(stage.id),
    title,
    subtitle,
    description: sanitizeOwnerVisibleText(stage.description),
    readiness:
      stage.readiness == null || Number.isNaN(Number(stage.readiness))
        ? null
        : Number(stage.readiness),
    meta,
    done: (stage.done || []).map(sanitizeOwnerVisibleText).filter(Boolean),
    inWork: (stage.inWork || []).map(sanitizeOwnerVisibleText).filter(Boolean),
    remaining: (stage.remaining || []).map(sanitizeOwnerVisibleText).filter(Boolean),
  };
}

export function mapOwnerStagesFromSection(section) {
  if (!section?.stages?.length) {
    return [];
  }
  return section.stages
    .map((stage) => mapOwnerStageToUi(stage, { sectionKey: section.key }))
    .filter(Boolean);
}

export function mapOwnerHistoryEventToUi(event) {
  if (!event) {
    return null;
  }

  const title = sanitizeOwnerVisibleText(event.title) || "Событие";
  const description = sanitizeOwnerVisibleText(event.description);

  return {
    id: String(event.id),
    title,
    description,
    created_at: event.occurred_at,
    initiated_by_name: event.initiated_by || null,
    ownerView: true,
  };
}

export function mapOwnerHistoryFromSection(section) {
  if (!section?.events?.length) {
    return [];
  }
  return section.events.map(mapOwnerHistoryEventToUi).filter(Boolean);
}

export function resolveOwnerDashboardStages(view, sectionKey) {
  const section = findOwnerSection(view, sectionKey);
  if (!section) {
    return null;
  }
  return mapOwnerStagesFromSection(section);
}

export function resolveOwnerDashboardHistory(view) {
  const section = findOwnerSection(view, "history");
  if (!section) {
    return null;
  }
  return mapOwnerHistoryFromSection(section);
}

export function resolveOwnerSectionTitle(view, sectionKey, fallbackTitle) {
  const section = findOwnerSection(view, sectionKey);
  return section?.title || fallbackTitle;
}
