import { useCallback, useEffect, useMemo, useState } from "react";

import {
  PAGE_LAYOUT_PAGE_TYPE,
  PAGE_LAYOUT_TOOLBAR_ZONE,
  useResolvedPageLayoutContract,
} from "../../../shared/appShell/pageLayoutContract";
import * as platformModulesApi from "../api/platformModulesApi";
import "./platformModulesPage.css";

const MODULE_TYPE_LABELS = {
  runtime: "Runtime",
  platform_service: "Platform service",
  tenant_feature: "Tenant feature",
  admin_feature: "Admin feature",
};

const STATUS_LABELS = {
  active: "Активен",
  planned: "Планируется",
  disabled: "Отключён",
  deprecated: "Устарел",
};

const MANIFEST_STATUS_LABELS = {
  draft: "Черновик",
  active: "Активен",
  deprecated: "Устарел",
};

const VERSION_STATUS_LABELS = {
  draft: "Черновик",
  released: "Выпущена",
  deprecated: "Устарела",
  superseded: "Заменена",
};

function formatBool(value) {
  return value ? "Да" : "Нет";
}

function formatEntryPoint(module) {
  if (module.entry_system_key) {
    return `system_key: ${module.entry_system_key}`;
  }
  if (module.entry_route) {
    return module.entry_route;
  }
  return "—";
}

function StatusBadge({ status, labels = STATUS_LABELS, classPrefix = "platform-modules-page__badge" }) {
  const normalized = String(status || "").trim().toLowerCase();
  const label = labels[normalized] || status || "—";

  return (
    <span className={`${classPrefix} ${classPrefix}--${normalized}`}>
      {label}
    </span>
  );
}

function ManifestListSection({ title, items, emptyLabel = "—" }) {
  const values = Array.isArray(items) ? items : [];

  return (
    <section className="platform-modules-page__manifest-section">
      <h3 className="platform-modules-page__manifest-section-title">{title}</h3>
      {values.length === 0 ? (
        <p className="platform-modules-page__muted">{emptyLabel}</p>
      ) : (
        <ul className="platform-modules-page__manifest-list">
          {values.map((item) => (
            <li key={String(item)} className="platform-modules-page__manifest-list-item">
              <code>{String(item)}</code>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function ManifestEntryPointsSection({ entryPoints }) {
  const values = Array.isArray(entryPoints) ? entryPoints : [];

  return (
    <section className="platform-modules-page__manifest-section">
      <h3 className="platform-modules-page__manifest-section-title">Entry points</h3>
      {values.length === 0 ? (
        <p className="platform-modules-page__muted">—</p>
      ) : (
        <ul className="platform-modules-page__manifest-list">
          {values.map((entry, index) => (
            <li key={`${entry.type}-${index}`} className="platform-modules-page__manifest-list-item">
              <code>{JSON.stringify(entry)}</code>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function ManifestDependenciesSection({ moduleKey, dependencies }) {
  const values = Array.isArray(dependencies) ? dependencies : [];

  return (
    <section className="platform-modules-page__manifest-section">
      <h3 className="platform-modules-page__manifest-section-title">Зависимости</h3>
      <p className="platform-modules-page__dependency-lead">
        <code>{moduleKey}</code>
        <span> depends on:</span>
      </p>
      {values.length === 0 ? (
        <p className="platform-modules-page__muted">—</p>
      ) : (
        <ul className="platform-modules-page__dependency-list">
          {values.map((dependency) => (
            <li key={dependency} className="platform-modules-page__dependency-list-item">
              - {dependency}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function SchemaFieldTable({ fields, defaults }) {
  const entries = Object.entries(fields || {});

  if (entries.length === 0) {
    return <p className="platform-modules-page__muted">—</p>;
  }

  return (
    <table className="platform-modules-page__schema-table">
      <thead>
        <tr>
          <th>Ключ</th>
          <th>Тип</th>
          <th>Default</th>
          <th>Owner</th>
        </tr>
      </thead>
      <tbody>
        {entries.map(([key, definition]) => (
          <tr key={key}>
            <td><code>{key}</code></td>
            <td>{definition?.type || "—"}</td>
            <td>
              <code>{JSON.stringify(defaults?.[key] ?? definition?.default ?? null)}</code>
            </td>
            <td>{definition?.owner || "—"}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function SchemaPermissionsSection({ permissions }) {
  const roles = Array.isArray(permissions?.roles) ? permissions.roles : [];
  const actions = Object.keys(permissions?.actions || {});

  if (actions.length === 0) {
    return <p className="platform-modules-page__muted">—</p>;
  }

  return (
    <table className="platform-modules-page__schema-table">
      <thead>
        <tr>
          <th>Action</th>
          {roles.map((role) => (
            <th key={role}>{role}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {actions.map((action) => (
          <tr key={action}>
            <td><code>{action}</code></td>
            {roles.map((role) => (
              <td key={`${action}-${role}`}>
                {formatBool(permissions?.defaults?.[role]?.[action])}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function SchemaTemplatesSection({ templates }) {
  const seeds = Array.isArray(templates?.seed_catalog) ? templates.seed_catalog : [];

  if (seeds.length === 0) {
    return <p className="platform-modules-page__muted">—</p>;
  }

  return (
    <ul className="platform-modules-page__manifest-list">
      {seeds.map((seed) => (
        <li key={seed.seed_key} className="platform-modules-page__manifest-list-item">
          <code>{seed.seed_key}</code>
          <span className="platform-modules-page__muted"> · {seed.kind}</span>
          {seed.description ? (
            <span className="platform-modules-page__schema-template-desc">{seed.description}</span>
          ) : null}
        </li>
      ))}
    </ul>
  );
}

function SettingsSchemaPanel({
  schema,
  isLoading,
  error,
  onClose,
}) {
  if (!schema && !isLoading && !error) {
    return null;
  }

  const blocks = schema?.blocks || {};

  return (
    <section className="platform-modules-page__manifest-panel">
      <div className="platform-modules-page__manifest-header">
        <div>
          <h2 className="platform-modules-page__manifest-title">Settings schema</h2>
          {schema ? (
            <p className="platform-modules-page__manifest-subtitle">
              <code>{schema.module_key}</code>
            </p>
          ) : null}
        </div>
        <button
          type="button"
          className="platform-modules-page__manifest-close"
          onClick={onClose}
        >
          Закрыть
        </button>
      </div>

      {isLoading ? <p className="platform-modules-page__status">Загрузка схемы…</p> : null}
      {error ? <p className="platform-modules-page__error">{error}</p> : null}

      {schema ? (
        <div className="platform-modules-page__manifest-grid">
          <div className="platform-modules-page__manifest-meta">
            <div>
              <span className="platform-modules-page__meta-label">schema_version</span>
              <code>{schema.schema_version}</code>
            </div>
          </div>

          <section className="platform-modules-page__manifest-section">
            <h3 className="platform-modules-page__manifest-section-title">Settings</h3>
            <SchemaFieldTable
              fields={blocks.settings?.fields}
              defaults={blocks.settings?.defaults}
            />
          </section>

          <section className="platform-modules-page__manifest-section">
            <h3 className="platform-modules-page__manifest-section-title">Permissions</h3>
            <SchemaPermissionsSection permissions={blocks.permissions} />
          </section>

          <section className="platform-modules-page__manifest-section">
            <h3 className="platform-modules-page__manifest-section-title">Views</h3>
            <SchemaFieldTable
              fields={blocks.views?.fields}
              defaults={blocks.views?.defaults}
            />
          </section>

          <section className="platform-modules-page__manifest-section">
            <h3 className="platform-modules-page__manifest-section-title">Rules</h3>
            <SchemaFieldTable
              fields={blocks.rules?.fields}
              defaults={blocks.rules?.defaults}
            />
          </section>

          <section className="platform-modules-page__manifest-section">
            <h3 className="platform-modules-page__manifest-section-title">Templates</h3>
            <SchemaTemplatesSection templates={blocks.templates} />
          </section>
        </div>
      ) : null}
    </section>
  );
}

function RuntimeConfigurationObservabilitySection({ entries, isLoading, error, onRefresh }) {
  const runtimeModules = ["runtime.calendar", "runtime.chat", "runtime.notifications"];
  const rows = runtimeModules.map((moduleKey) => {
    const matches = (Array.isArray(entries) ? entries : []).filter(
      (item) => item?.module_key === moduleKey && item?.tenant_id != null,
    );
    const primary = matches[0] || (Array.isArray(entries) ? entries : []).find(
      (item) => item?.module_key === moduleKey,
    );

    return {
      moduleKey,
      entry: primary || null,
    };
  });

  return (
    <section className="platform-modules-page__manifest-panel">
      <div className="platform-modules-page__manifest-header">
        <div>
          <h2 className="platform-modules-page__manifest-title">Runtime Configuration</h2>
          <p className="platform-modules-page__manifest-subtitle">
            Read-only диагностика runtime cache для tenant module configurations
          </p>
        </div>
        <button
          type="button"
          className="platform-modules-page__manifest-close"
          onClick={onRefresh}
        >
          Обновить
        </button>
      </div>

      {isLoading ? <p className="platform-modules-page__status">Загрузка runtime cache…</p> : null}
      {error ? <p className="platform-modules-page__error">{error}</p> : null}

      {!isLoading && !error ? (
        <div className="platform-modules-page__table-wrap">
          <table className="platform-modules-page__table">
            <thead>
              <tr>
                <th>module_key</th>
                <th>tenant_id</th>
                <th>Current Runtime Configuration</th>
                <th>Source Version</th>
                <th>Configuration Version</th>
                <th>Cache Status</th>
                <th>Last Refresh</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ moduleKey, entry }) => (
                <tr key={moduleKey}>
                  <td><code>{moduleKey}</code></td>
                  <td>{entry?.tenant_id ?? "—"}</td>
                  <td>
                    <pre className="platform-modules-page__json-block">
                      {JSON.stringify(entry?.current_runtime_configuration || {}, null, 2)}
                    </pre>
                  </td>
                  <td>{entry?.source_version || "—"}</td>
                  <td>{entry?.configuration_version || "—"}</td>
                  <td>{entry?.cache_status || "miss"}</td>
                  <td>{entry?.last_refresh || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </section>
  );
}

function ManifestPanel({
  manifest,
  isLoading,
  error,
  onClose,
}) {
  if (!manifest && !isLoading && !error) {
    return null;
  }

  return (
    <section className="platform-modules-page__manifest-panel">
      <div className="platform-modules-page__manifest-header">
        <div>
          <h2 className="platform-modules-page__manifest-title">Манифест модуля</h2>
          {manifest ? (
            <p className="platform-modules-page__manifest-subtitle">
              <code>{manifest.module_key}</code>
            </p>
          ) : null}
        </div>
        <button
          type="button"
          className="platform-modules-page__manifest-close"
          onClick={onClose}
        >
          Закрыть
        </button>
      </div>

      {isLoading ? <p className="platform-modules-page__status">Загрузка манифеста…</p> : null}
      {error ? <p className="platform-modules-page__error">{error}</p> : null}

      {manifest ? (
        <div className="platform-modules-page__manifest-grid">
          <div className="platform-modules-page__manifest-meta">
            <div>
              <span className="platform-modules-page__meta-label">module_version</span>
              <code>{manifest.module_version}</code>
            </div>
            <div>
              <span className="platform-modules-page__meta-label">manifest_version</span>
              <code>{manifest.manifest_version}</code>
            </div>
            <div>
              <span className="platform-modules-page__meta-label">status</span>
              <StatusBadge
                status={manifest.status}
                labels={MANIFEST_STATUS_LABELS}
                classPrefix="platform-modules-page__badge"
              />
            </div>
          </div>

          <ManifestListSection title="Frontend components" items={manifest.frontend_components} />
          <ManifestListSection title="Frontend routes" items={manifest.frontend_routes} />
          <ManifestListSection title="Backend routers" items={manifest.backend_routers} />
          <ManifestListSection title="Backend services" items={manifest.backend_services} />
          <ManifestListSection title="Backend models" items={manifest.backend_models} />
          <ManifestListSection title="DB tables" items={manifest.db_tables} />
          <ManifestEntryPointsSection entryPoints={manifest.entry_points} />
          <ManifestDependenciesSection
            moduleKey={manifest.module_key}
            dependencies={manifest.dependencies}
          />
          <ManifestListSection title="Permissions" items={manifest.permissions} />
          <ManifestListSection title="Notification targets" items={manifest.notification_targets} />
          <section className="platform-modules-page__manifest-section">
            <h3 className="platform-modules-page__manifest-section-title">Settings schema</h3>
            <pre className="platform-modules-page__json-block">
              {JSON.stringify(manifest.settings_schema || {}, null, 2)}
            </pre>
          </section>
          {manifest.release_notes ? (
            <section className="platform-modules-page__manifest-section">
              <h3 className="platform-modules-page__manifest-section-title">Release notes</h3>
              <p className="platform-modules-page__release-notes">{manifest.release_notes}</p>
            </section>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

function VersionsPanel({
  moduleKey,
  versions,
  selectedVersion,
  isLoading,
  error,
  onSelectVersion,
  onClose,
}) {
  if (!moduleKey && !isLoading && !error) {
    return null;
  }

  return (
    <section className="platform-modules-page__manifest-panel">
      <div className="platform-modules-page__manifest-header">
        <div>
          <h2 className="platform-modules-page__manifest-title">Версии модуля</h2>
          {moduleKey ? (
            <p className="platform-modules-page__manifest-subtitle">
              <code>{moduleKey}</code>
            </p>
          ) : null}
        </div>
        <button
          type="button"
          className="platform-modules-page__manifest-close"
          onClick={onClose}
        >
          Закрыть
        </button>
      </div>

      {isLoading ? <p className="platform-modules-page__status">Загрузка версий…</p> : null}
      {error ? <p className="platform-modules-page__error">{error}</p> : null}

      {!isLoading && !error ? (
        <div className="platform-modules-page__versions-layout">
          <div className="platform-modules-page__table-wrap">
            <table className="platform-modules-page__table platform-modules-page__versions-table">
              <thead>
                <tr>
                  <th>Версия</th>
                  <th>Статус</th>
                  <th>Дата релиза</th>
                  <th>Связанный релиз</th>
                  <th>Manifest Version</th>
                </tr>
              </thead>
              <tbody>
                {versions.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="platform-modules-page__muted">
                      Версии не найдены.
                    </td>
                  </tr>
                ) : (
                  versions.map((version) => {
                    const isSelected = selectedVersion?.version === version.version;
                    return (
                      <tr
                        key={`${version.module_key}-${version.version}`}
                        className={isSelected ? "platform-modules-page__row-selected" : undefined}
                      >
                        <td>
                          <button
                            type="button"
                            className="platform-modules-page__version-link"
                            onClick={() => onSelectVersion(version)}
                          >
                            {version.version}
                          </button>
                        </td>
                        <td>
                          <StatusBadge
                            status={version.status}
                            labels={VERSION_STATUS_LABELS}
                          />
                        </td>
                        <td>
                          {version.release_date
                            ? new Date(version.release_date).toLocaleDateString("ru-RU")
                            : "—"}
                        </td>
                        <td>{version.release_version || "—"}</td>
                        <td>
                          <code>{version.manifest_version}</code>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {selectedVersion ? (
            <div className="platform-modules-page__version-detail">
              <h3 className="platform-modules-page__manifest-section-title">
                Версия {selectedVersion.version}
              </h3>
              <section className="platform-modules-page__manifest-section">
                <h4 className="platform-modules-page__meta-label">Change Log</h4>
                <p className="platform-modules-page__release-notes">
                  {selectedVersion.change_log || "—"}
                </p>
              </section>
              <section className="platform-modules-page__manifest-section">
                <h4 className="platform-modules-page__meta-label">Breaking Changes</h4>
                <p className="platform-modules-page__release-notes">
                  {selectedVersion.breaking_changes || "—"}
                </p>
              </section>
              <section className="platform-modules-page__manifest-section">
                <h4 className="platform-modules-page__meta-label">Связанный релиз</h4>
                <p className="platform-modules-page__muted">
                  {selectedVersion.release_version
                    ? `Release ${selectedVersion.release_version}`
                    : "—"}
                </p>
              </section>
              <section className="platform-modules-page__manifest-section">
                <h4 className="platform-modules-page__meta-label">Manifest</h4>
                <p className="platform-modules-page__muted">
                  <code>{selectedVersion.manifest_version}</code>
                  {selectedVersion.manifest_status
                    ? ` · ${selectedVersion.manifest_status}`
                    : ""}
                </p>
              </section>
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

export default function PlatformModulesPage() {
  useResolvedPageLayoutContract({
    pageType: PAGE_LAYOUT_PAGE_TYPE.DASHBOARD,
    toolbarZoneId: PAGE_LAYOUT_TOOLBAR_ZONE.APP_HEADER,
    title: "Модули платформы",
  });

  const [modules, setModules] = useState([]);
  const [manifestKeys, setManifestKeys] = useState(new Set());
  const [selectedModuleKey, setSelectedModuleKey] = useState(null);
  const [selectedManifest, setSelectedManifest] = useState(null);
  const [schemaModuleKey, setSchemaModuleKey] = useState(null);
  const [selectedSchema, setSelectedSchema] = useState(null);
  const [versionsModuleKey, setVersionsModuleKey] = useState(null);
  const [moduleVersions, setModuleVersions] = useState([]);
  const [selectedVersion, setSelectedVersion] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isManifestLoading, setIsManifestLoading] = useState(false);
  const [isSchemaLoading, setIsSchemaLoading] = useState(false);
  const [isVersionsLoading, setIsVersionsLoading] = useState(false);
  const [error, setError] = useState("");
  const [manifestError, setManifestError] = useState("");
  const [schemaError, setSchemaError] = useState("");
  const [versionsError, setVersionsError] = useState("");
  const [runtimeCacheEntries, setRuntimeCacheEntries] = useState([]);
  const [isRuntimeCacheLoading, setIsRuntimeCacheLoading] = useState(true);
  const [runtimeCacheError, setRuntimeCacheError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadModules() {
      setIsLoading(true);
      setError("");

      try {
        const [modulesData, manifestsData] = await Promise.all([
          platformModulesApi.listPlatformModules(),
          platformModulesApi.listPlatformModuleManifests(),
        ]);

        if (!cancelled) {
          setModules(Array.isArray(modulesData) ? modulesData : []);
          const keys = new Set(
            (Array.isArray(manifestsData) ? manifestsData : []).map(
              (item) => item.module_key,
            ),
          );
          setManifestKeys(keys);
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(
            platformModulesApi.getApiErrorMessage(
              loadError,
              "Не удалось загрузить реестр модулей",
            ),
          );
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    loadModules();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadRuntimeCache() {
      setIsRuntimeCacheLoading(true);
      setRuntimeCacheError("");

      try {
        const data = await platformModulesApi.listRuntimeConfigurationCache();
        if (!cancelled) {
          setRuntimeCacheEntries(Array.isArray(data) ? data : []);
        }
      } catch (loadError) {
        if (!cancelled) {
          setRuntimeCacheError(
            platformModulesApi.getApiErrorMessage(
              loadError,
              "Не удалось загрузить runtime cache",
            ),
          );
        }
      } finally {
        if (!cancelled) {
          setIsRuntimeCacheLoading(false);
        }
      }
    }

    loadRuntimeCache();

    return () => {
      cancelled = true;
    };
  }, []);

  const reloadRuntimeCache = useCallback(async () => {
    setIsRuntimeCacheLoading(true);
    setRuntimeCacheError("");

    try {
      const data = await platformModulesApi.listRuntimeConfigurationCache();
      setRuntimeCacheEntries(Array.isArray(data) ? data : []);
    } catch (loadError) {
      setRuntimeCacheError(
        platformModulesApi.getApiErrorMessage(
          loadError,
          "Не удалось загрузить runtime cache",
        ),
      );
    } finally {
      setIsRuntimeCacheLoading(false);
    }
  }, []);

  const loadManifest = useCallback(async (moduleKey) => {
    setSelectedModuleKey(moduleKey);
    setSelectedManifest(null);
    setManifestError("");
    setSchemaModuleKey(null);
    setSelectedSchema(null);
    setSchemaError("");
    setVersionsModuleKey(null);
    setModuleVersions([]);
    setSelectedVersion(null);
    setVersionsError("");
    setIsManifestLoading(true);

    try {
      const manifest = await platformModulesApi.getPlatformModuleManifest(moduleKey);
      setSelectedManifest(manifest);
    } catch (loadError) {
      setManifestError(
        platformModulesApi.getApiErrorMessage(
          loadError,
          "Не удалось загрузить манифест",
        ),
      );
    } finally {
      setIsManifestLoading(false);
    }
  }, []);

  const closeManifest = useCallback(() => {
    setSelectedModuleKey(null);
    setSelectedManifest(null);
    setManifestError("");
  }, []);

  const loadSchema = useCallback(async (moduleKey) => {
    setSchemaModuleKey(moduleKey);
    setSelectedSchema(null);
    setSchemaError("");
    setSelectedModuleKey(null);
    setSelectedManifest(null);
    setManifestError("");
    setVersionsModuleKey(null);
    setModuleVersions([]);
    setSelectedVersion(null);
    setVersionsError("");
    setIsSchemaLoading(true);

    try {
      const schema = await platformModulesApi.getPlatformModuleSettingsSchema(moduleKey);
      setSelectedSchema(schema);
    } catch (loadError) {
      setSchemaError(
        platformModulesApi.getApiErrorMessage(
          loadError,
          "Не удалось загрузить settings schema",
        ),
      );
    } finally {
      setIsSchemaLoading(false);
    }
  }, []);

  const closeSchema = useCallback(() => {
    setSchemaModuleKey(null);
    setSelectedSchema(null);
    setSchemaError("");
  }, []);

  const loadVersions = useCallback(async (moduleKey) => {
    setVersionsModuleKey(moduleKey);
    setModuleVersions([]);
    setSelectedVersion(null);
    setVersionsError("");
    setSelectedModuleKey(null);
    setSelectedManifest(null);
    setManifestError("");
    setSchemaModuleKey(null);
    setSelectedSchema(null);
    setSchemaError("");
    setIsVersionsLoading(true);

    try {
      const [versions, latest] = await Promise.all([
        platformModulesApi.listModuleVersions(moduleKey),
        platformModulesApi.getLatestModuleVersion(moduleKey),
      ]);
      const normalizedVersions = Array.isArray(versions) ? versions : [];
      setModuleVersions(normalizedVersions);
      setSelectedVersion(latest || normalizedVersions[0] || null);
    } catch (loadError) {
      setVersionsError(
        platformModulesApi.getApiErrorMessage(
          loadError,
          "Не удалось загрузить версии",
        ),
      );
    } finally {
      setIsVersionsLoading(false);
    }
  }, []);

  const closeVersions = useCallback(() => {
    setVersionsModuleKey(null);
    setModuleVersions([]);
    setSelectedVersion(null);
    setVersionsError("");
  }, []);

  const sortedModules = useMemo(
    () =>
      [...modules].sort((left, right) =>
        String(left.module_key || "").localeCompare(String(right.module_key || "")),
      ),
    [modules],
  );

  return (
    <section className="platform-modules-page">
      <p className="platform-modules-page__intro">
        Read-only реестр модулей платформы и их manifest-описаний. Planned-модули
        могут существовать без манифеста и не ломают страницу.
      </p>

      <RuntimeConfigurationObservabilitySection
        entries={runtimeCacheEntries}
        isLoading={isRuntimeCacheLoading}
        error={runtimeCacheError}
        onRefresh={reloadRuntimeCache}
      />

      {isLoading ? (
        <p className="platform-modules-page__status">Загрузка модулей…</p>
      ) : null}

      {error ? <p className="platform-modules-page__error">{error}</p> : null}

      {!isLoading && !error ? (
        <div className="platform-modules-page__table-wrap">
          <table className="platform-modules-page__table">
            <thead>
              <tr>
                <th>Название</th>
                <th>module_key</th>
                <th>Тип</th>
                <th>Статус</th>
                <th>Версия</th>
                <th>Runtime</th>
                <th>Устанавливаемый в tenant</th>
                <th>Точка входа</th>
                <th>Зависимости</th>
                <th>Манифест</th>
                <th>Schema</th>
                <th>Версии</th>
              </tr>
            </thead>
            <tbody>
              {sortedModules.map((module) => {
                const hasManifest = manifestKeys.has(module.module_key);
                const isSelected = selectedModuleKey === module.module_key;
                const isSchemaSelected = schemaModuleKey === module.module_key;
                const isVersionsSelected = versionsModuleKey === module.module_key;

                return (
                  <tr
                    key={module.id || module.module_key}
                    className={
                      isSelected || isSchemaSelected || isVersionsSelected
                        ? "platform-modules-page__row-selected"
                        : undefined
                    }
                  >
                    <td>
                      <div className="platform-modules-page__title-cell">
                        <span className="platform-modules-page__title">{module.title}</span>
                        {module.description ? (
                          <span className="platform-modules-page__description">
                            {module.description}
                          </span>
                        ) : null}
                      </div>
                    </td>
                    <td>
                      <span className="platform-modules-page__mono">{module.module_key}</span>
                    </td>
                    <td>{MODULE_TYPE_LABELS[module.module_type] || module.module_type}</td>
                    <td>
                      <StatusBadge status={module.status} />
                    </td>
                    <td>{module.version || "—"}</td>
                    <td className="platform-modules-page__bool">{formatBool(module.is_runtime)}</td>
                    <td className="platform-modules-page__bool">
                      {formatBool(module.is_tenant_installable)}
                    </td>
                    <td>
                      <span className="platform-modules-page__mono">
                        {formatEntryPoint(module)}
                      </span>
                    </td>
                    <td>
                      {Array.isArray(module.dependencies) && module.dependencies.length > 0 ? (
                        <div className="platform-modules-page__deps">
                          {module.dependencies.map((dependency) => (
                            <span
                              key={`${module.module_key}-${dependency}`}
                              className="platform-modules-page__dep-chip"
                            >
                              {dependency}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="platform-modules-page__muted">—</span>
                      )}
                    </td>
                    <td>
                      {hasManifest ? (
                        <button
                          type="button"
                          className="platform-modules-page__manifest-button"
                          onClick={() => loadManifest(module.module_key)}
                        >
                          Манифест
                        </button>
                      ) : (
                        <span className="platform-modules-page__muted">—</span>
                      )}
                    </td>
                    <td>
                      {hasManifest ? (
                        <button
                          type="button"
                          className="platform-modules-page__manifest-button"
                          onClick={() => loadSchema(module.module_key)}
                        >
                          Schema
                        </button>
                      ) : (
                        <span className="platform-modules-page__muted">—</span>
                      )}
                    </td>
                    <td>
                      <button
                        type="button"
                        className="platform-modules-page__manifest-button"
                        onClick={() => loadVersions(module.module_key)}
                      >
                        Версии
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : null}

      {selectedModuleKey ? (
        <ManifestPanel
          manifest={selectedManifest}
          isLoading={isManifestLoading}
          error={manifestError}
          onClose={closeManifest}
        />
      ) : null}

      {schemaModuleKey ? (
        <SettingsSchemaPanel
          schema={selectedSchema}
          isLoading={isSchemaLoading}
          error={schemaError}
          onClose={closeSchema}
        />
      ) : null}

      {versionsModuleKey ? (
        <VersionsPanel
          moduleKey={versionsModuleKey}
          versions={moduleVersions}
          selectedVersion={selectedVersion}
          isLoading={isVersionsLoading}
          error={versionsError}
          onSelectVersion={setSelectedVersion}
          onClose={closeVersions}
        />
      ) : null}
    </section>
  );
}
