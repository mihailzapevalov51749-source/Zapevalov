/**
 * Progress metrics for owner/legacy stage rows, aligned with Platform Dashboard
 * implementation stages (analyzer-backed lists).
 */

function countList(items) {
  return Array.isArray(items) ? items.length : 0;
}

export function resolveLinkedImplementationStages(stage, implementationStages = []) {
  if (!stage || !Array.isArray(implementationStages)) {
    return [];
  }

  const slugs = stage.meta?.implementation_stage_slugs;
  if (Array.isArray(slugs) && slugs.length > 0) {
    const slugSet = new Set(slugs.map((slug) => String(slug)));
    return implementationStages.filter((item) => slugSet.has(String(item.slug)));
  }

  const byId = implementationStages.find(
    (item) => String(item.id) === String(stage.id),
  );
  return byId ? [byId] : [];
}

function progressFromImplementationStages(linkedStages) {
  let completedSteps = 0;
  let totalSteps = 0;
  let nextStep = null;
  let lastUpdated = null;

  for (const impl of linkedStages) {
    const done = countList(impl.completed_items);
    const inWork = countList(impl.current_tasks);
    const next = countList(impl.next_tasks);
    const remaining = countList(impl.remaining_items);

    completedSteps += done;
    totalSteps += done + inWork + next + remaining;

    if (!nextStep) {
      nextStep = impl.current_tasks?.[0] ?? impl.next_tasks?.[0] ?? null;
    }

    if (impl.updated_at) {
      const candidate = new Date(impl.updated_at).getTime();
      const previous = lastUpdated ? new Date(lastUpdated).getTime() : 0;
      if (!Number.isNaN(candidate) && candidate >= previous) {
        lastUpdated = impl.updated_at;
      }
    }
  }

  return {
    completedSteps,
    totalSteps: totalSteps > 0 ? totalSteps : null,
    nextStep: nextStep ? String(nextStep) : null,
    lastUpdated,
  };
}

function progressFromOwnerWorkLists(stage) {
  const done = countList(stage.done);
  const inWork = countList(stage.inWork);
  const remaining = countList(stage.remaining);
  const totalSteps = done + inWork + remaining;

  return {
    completedSteps: done,
    totalSteps: totalSteps > 0 ? totalSteps : null,
    nextStep: stage.inWork?.[0] ?? stage.remaining?.[0] ?? null,
    lastUpdated: null,
  };
}

export function resolveStageDashboardProgress(
  stage,
  { implementationStages = [], dashboardRefreshedAt = null } = {},
) {
  if (!stage) {
    return {
      completedSteps: null,
      totalSteps: null,
      nextStep: null,
      lastUpdated: dashboardRefreshedAt ?? null,
    };
  }

  const linked = resolveLinkedImplementationStages(stage, implementationStages);
  const progress = linked.length
    ? progressFromImplementationStages(linked)
    : progressFromOwnerWorkLists(stage);

  return {
    ...progress,
    lastUpdated: progress.lastUpdated ?? dashboardRefreshedAt ?? null,
  };
}

export function formatReadinessPercent(readiness) {
  if (readiness == null || Number.isNaN(Number(readiness))) {
    return "Нет данных";
  }
  return `${Number(readiness)}%`;
}

export function formatReadinessListMeta(readiness) {
  if (readiness == null || Number.isNaN(Number(readiness))) {
    return "Н/Д";
  }
  return `${Number(readiness)}%`;
}
