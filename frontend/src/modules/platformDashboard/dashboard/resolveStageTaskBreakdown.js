import {
  hasKnownTaskWeights,
  resolveTaskDisplayWeight,
  sortTasksByWeightDesc,
  sumTaskWeights,
} from "./stageTaskWeights.js";
import {
  resolveLinkedImplementationStages,
  resolveStageDashboardProgress,
} from "./resolveStageDashboardProgress.js";

function uniqueStrings(items) {
  const seen = new Set();
  const result = [];

  for (const item of items || []) {
    const text = String(item ?? "").trim();
    if (!text || seen.has(text)) {
      continue;
    }
    seen.add(text);
    result.push(text);
  }

  return result;
}

export function resolveStageTaskLists(stage, { implementationStages = [] } = {}) {
  if (!stage) {
    return { done: [], inWork: [], remaining: [] };
  }

  const linked = resolveLinkedImplementationStages(stage, implementationStages);

  if (linked.length) {
    const done = [];
    const inWork = [];
    const remaining = [];

    for (const impl of linked) {
      done.push(...(impl.completed_items || []));
      inWork.push(...(impl.current_tasks || []));
      remaining.push(...(impl.next_tasks || []), ...(impl.remaining_items || []));
    }

    return {
      done: uniqueStrings(done),
      inWork: uniqueStrings(inWork),
      remaining: uniqueStrings(remaining),
    };
  }

  return {
    done: uniqueStrings(stage.done),
    inWork: uniqueStrings(stage.inWork),
    remaining: uniqueStrings(stage.remaining),
  };
}

export function resolveStageTaskBreakdown(
  stage,
  { implementationStages = [], dashboardRefreshedAt = null } = {},
) {
  const progress = resolveStageDashboardProgress(stage, {
    implementationStages,
    dashboardRefreshedAt,
  });
  const lists = resolveStageTaskLists(stage, { implementationStages });

  const nextTasksOrdered = sortTasksByWeightDesc(lists.remaining);
  const doneWeight = sumTaskWeights(lists.done);
  const openWeight = sumTaskWeights([...lists.inWork, ...lists.remaining]);
  const showWeightPoints =
    hasKnownTaskWeights([
      ...lists.done,
      ...lists.inWork,
      ...lists.remaining,
    ]) || openWeight + doneWeight > lists.done.length + lists.inWork.length + lists.remaining.length;

  return {
    readiness: stage?.readiness ?? null,
    lastUpdated: progress.lastUpdated,
    completedCount: lists.done.length,
    inWorkCount: lists.inWork.length,
    notStartedCount: lists.remaining.length,
    doneWeight,
    remainingWeight: openWeight,
    showWeightPoints,
    nextTasks: nextTasksOrdered,
    inWorkTasks: lists.inWork,
    doneTasks: lists.done,
    completedSteps: progress.completedSteps,
    totalSteps: progress.totalSteps,
  };
}

export function mapTaskRows(titles, status) {
  return titles.map((title) => ({
    title,
    status,
    weight: resolveTaskDisplayWeight(title),
  }));
}
