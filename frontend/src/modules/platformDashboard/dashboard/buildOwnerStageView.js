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

function normalizeReadiness(value) {
  if (value == null || Number.isNaN(Number(value))) {
    return null;
  }
  return Number(value);
}

export function buildStageFromPlatformComponent(component) {
  if (!component) {
    return null;
  }

  return {
    id: String(component.id),
    title: component.title || "—",
    description: component.description || "",
    readiness: normalizeReadiness(component.readiness),
    done: uniqueStrings(component.completed_items),
    inWork: uniqueStrings(component.current_tasks),
    remaining: uniqueStrings([
      ...(component.remaining_items || []),
      ...(component.next_tasks || []),
    ]),
  };
}

export function buildStageFromImplementationPhase(phase) {
  if (!phase) {
    return null;
  }

  const readiness =
    normalizeReadiness(phase.readiness)
    ?? normalizeReadiness(phase.container_readiness?.release)
    ?? normalizeReadiness(phase.container_readiness?.implementation)
    ?? normalizeReadiness(phase.release_readiness)
    ?? normalizeReadiness(phase.implementation_readiness);

  return {
    id: String(phase.id),
    title: phase.title || "—",
    description: phase.description || "",
    readiness,
    done: uniqueStrings(phase.completed_items),
    inWork: uniqueStrings(phase.current_tasks),
    remaining: uniqueStrings([
      ...(phase.next_tasks || []),
      ...(phase.remaining_items || []),
    ]),
  };
}

export function buildStageFromPlatformEngine(engine) {
  if (!engine) {
    return null;
  }

  const inWork = [];
  const remaining = [];

  if (engine.status === "in_progress") {
    inWork.push("Развитие движка");
  } else if (engine.status && engine.status !== "done") {
    remaining.push("Завершить реализацию движка");
  }

  return {
    id: engine.slug,
    title: engine.title || engine.slug,
    description: engine.description || "",
    readiness: normalizeReadiness(engine.readiness),
    done: [],
    inWork,
    remaining,
  };
}

export function buildStageFromCompanyWorkspace(workspace, summary = "") {
  if (!workspace) {
    return null;
  }

  const facets = workspace.objectModelFacets || [];
  const remaining = facets.map((facet) => `Настроить: ${facet}`);
  const inWork =
    workspace.status === "active" ? ["Настройка рабочего пространства"] : [];

  const descriptionParts = [
    workspace.note,
    summary,
    workspace.users ? `Пользователи: ${workspace.users}` : "",
    workspace.objects ? `Объекты: ${workspace.objects}` : "",
  ].filter(Boolean);

  return {
    id: workspace.tenantId,
    title: workspace.title || workspace.tenantId,
    description: descriptionParts.join("\n"),
    readiness: normalizeReadiness(workspace.digitalModelReadiness),
    done: workspace.status === "done" ? ["Рабочее пространство настроено"] : [],
    inWork,
    remaining,
  };
}

export function buildPlatformStages(platformComponents, governancePlatform) {
  if (platformComponents?.length) {
    return platformComponents
      .map(buildStageFromPlatformComponent)
      .filter(Boolean);
  }

  return (governancePlatform?.engines || [])
    .map(buildStageFromPlatformEngine)
    .filter(Boolean);
}

export function buildDevelopmentStages(implementationStages) {
  return (implementationStages || [])
    .map(buildStageFromImplementationPhase)
    .filter(Boolean);
}

export function buildCompanyStages(governanceCompanies) {
  const summary = governanceCompanies?.companyWorkspacesSummary || "";
  return (governanceCompanies?.companyWorkspaces || [])
    .map((workspace) => buildStageFromCompanyWorkspace(workspace, summary))
    .filter(Boolean);
}

export function resolveDefaultStageId(stages) {
  return stages[0]?.id ?? null;
}
