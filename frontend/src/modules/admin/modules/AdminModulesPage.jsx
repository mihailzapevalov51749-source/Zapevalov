import { useCallback, useEffect, useMemo, useState } from "react";

import { useParams } from "react-router-dom";



import {

  PAGE_LAYOUT_PAGE_TYPE,

  PAGE_LAYOUT_TOOLBAR_ZONE,

  useResolvedPageLayoutContract,

} from "../../../shared/appShell/pageLayoutContract";

import * as tenantModulesApi from "../api/tenantModulesApi";
import * as tenantModuleUpdatePreviewsApi from "../api/tenantModuleUpdatePreviewsApi";
import * as tenantModuleConfigurationsApi from "../api/tenantModuleConfigurationsApi";
import * as tenantModuleConfigurationAppliesApi from "../api/tenantModuleConfigurationAppliesApi";
import * as tenantModuleConfigurationRollbacksApi from "../api/tenantModuleConfigurationRollbacksApi";

import ModulePublicationsPanel from "./ModulePublicationsPanel";
import ModuleConfigurationApplyConfirmModal from "./ModuleConfigurationApplyConfirmModal";
import ModuleConfigurationRollbackConfirmModal from "./ModuleConfigurationRollbackConfirmModal";

import "./tenantModulesPage.css";

const CONFIGURATION_MODULE_KEYS = new Set([
  "runtime.chat",
  "runtime.calendar",
  "runtime.notifications",
]);

function formatDateTime(value) {
  if (!value) {
    return "—";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return String(value);
  }
  return date.toLocaleString("ru-RU");
}

function ConfigurationBlock({ title, payload }) {
  return (
    <div className="tenant-modules-page__config-block">
      <strong>{title}</strong>
      <pre className="tenant-modules-page__config-json">
        {JSON.stringify(payload || {}, null, 2)}
      </pre>
    </div>
  );
}

function ConfigurationDetailPanel({ configuration, moduleTitle, isLoading, error, onClose }) {
  if (!configuration && !isLoading && !error) {
    return null;
  }

  return (
    <section className="tenant-modules-page__offer-panel tenant-modules-page__config-panel">
      <div className="tenant-modules-page__offer-header">
        <div>
          <h2 className="tenant-modules-page__offer-title">Конфигурация модуля</h2>
          {moduleTitle ? <p className="tenant-modules-page__offer-subtitle">{moduleTitle}</p> : null}
        </div>
        <button type="button" className="tenant-modules-page__offer-close" onClick={onClose}>
          Закрыть
        </button>
      </div>

      {isLoading ? <p className="tenant-modules-page__status">Загрузка конфигурации…</p> : null}
      {error ? <p className="tenant-modules-page__error">{error}</p> : null}

      {configuration ? (
        <div className="tenant-modules-page__offer-body">
          <p>
            <strong>module_key:</strong> <code>{configuration.module_key}</code>
          </p>
          <p>
            <strong>module_version:</strong> {configuration.module_version || "—"}
          </p>
          <p>
            <strong>config_version:</strong> {configuration.config_version || "—"}
          </p>
          <p>
            <strong>schema_version:</strong> {configuration.schema_version || "—"}
          </p>
          <p>
            <strong>source:</strong> {configuration.source || "—"}
          </p>
          <p>
            <strong>updated_at:</strong> {formatDateTime(configuration.updated_at)}
          </p>
          <ConfigurationBlock title="Settings" payload={configuration.settings} />
          <ConfigurationBlock title="Permissions" payload={configuration.permissions} />
          <ConfigurationBlock title="Views" payload={configuration.views} />
          <ConfigurationBlock title="Rules" payload={configuration.rules} />
          <ConfigurationBlock title="Templates" payload={configuration.templates} />
          <p className="tenant-modules-page__muted tenant-modules-page__preview-note">
            Read-only просмотр. Save, Edit, Apply и Rollback на этом этапе недоступны.
          </p>
        </div>
      ) : null}
    </section>
  );
}



function formatSource(source) {

  const normalized = String(source || "").trim().toLowerCase();

  if (normalized === "backfill") {

    return "Backfill";

  }

  return source || "—";

}



function formatVersionComparison(installedVersion, platformVersion) {

  const tenant = String(installedVersion || "—");

  const platform = String(platformVersion || "—");

  if (tenant === platform) {

    return `${tenant} (совпадает с platform)`;

  }

  return `tenant: ${tenant} / platform: ${platform}`;

}



function formatRisk(riskLevel) {
  const normalized = String(riskLevel || "low").trim().toLowerCase();
  const labels = {
    low: "Низкий",
    medium: "Средний",
    high: "Высокий",
    critical: "Критический",
  };
  return labels[normalized] || normalized;
}

function countConfigurationDiffChanges(configurationDiff) {
  if (!configurationDiff || typeof configurationDiff !== "object") {
    return 0;
  }

  let total = 0;
  for (const blockName of ["settings", "permissions", "views", "rules"]) {
    const block = configurationDiff[blockName];
    if (block && typeof block === "object") {
      total += (block.added || []).length;
      total += (block.removed || []).length;
      total += (block.changed || []).length;
    }
  }

  const templates = configurationDiff.templates;
  if (templates && typeof templates === "object") {
    total += (templates.added_seeds || []).length;
    total += (templates.removed_seeds || []).length;
    total += (templates.changed_seeds || []).length;
  }

  return total;
}

function hasConfigurationDiff(preview) {
  return countConfigurationDiffChanges(preview?.configuration_diff) > 0
    || Boolean(preview?.configuration_diff);
}

function ConfigurationDiffBlockSection({ title, block }) {
  const payload = block && typeof block === "object" ? block : {};
  const added = Array.isArray(payload.added) ? payload.added : [];
  const removed = Array.isArray(payload.removed) ? payload.removed : [];
  const changed = Array.isArray(payload.changed) ? payload.changed : [];
  const addedSeeds = Array.isArray(payload.added_seeds) ? payload.added_seeds : [];
  const removedSeeds = Array.isArray(payload.removed_seeds) ? payload.removed_seeds : [];
  const changedSeeds = Array.isArray(payload.changed_seeds) ? payload.changed_seeds : [];

  const hasFlatDiff = added.length > 0 || removed.length > 0 || changed.length > 0;
  const hasTemplateDiff = addedSeeds.length > 0 || removedSeeds.length > 0 || changedSeeds.length > 0;

  if (!hasFlatDiff && !hasTemplateDiff) {
    return (
      <div className="tenant-modules-page__preview-section">
        <strong>{title}:</strong>
        <p className="tenant-modules-page__muted">—</p>
      </div>
    );
  }

  return (
    <div className="tenant-modules-page__preview-section">
      <strong>{title}:</strong>
      {added.length > 0 ? (
        <div>
          <span>Added:</span>
          <PreviewListSection title="" items={added} />
        </div>
      ) : null}
      {removed.length > 0 ? (
        <div>
          <span>Removed:</span>
          <PreviewListSection title="" items={removed} />
        </div>
      ) : null}
      {changed.length > 0 ? (
        <div>
          <span>Changed:</span>
          <ul className="tenant-modules-page__offer-changes">
            {changed.map((item) => (
              <li key={item.key}>
                <code>{item.key}</code>: {JSON.stringify(item.from)} → {JSON.stringify(item.to)}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {addedSeeds.length > 0 ? (
        <div>
          <span>Added Seeds:</span>
          <PreviewListSection title="" items={addedSeeds} />
        </div>
      ) : null}
      {removedSeeds.length > 0 ? (
        <div>
          <span>Removed Seeds:</span>
          <PreviewListSection title="" items={removedSeeds} />
        </div>
      ) : null}
      {changedSeeds.length > 0 ? (
        <div>
          <span>Changed Seeds:</span>
          <ul className="tenant-modules-page__offer-changes">
            {changedSeeds.map((item) => (
              <li key={item.key}>
                <code>{item.key}</code>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

function PreviewDetailPanel({
  preview,
  moduleTitle,
  isLoading,
  error,
  onClose,
  onApply,
  isApplyDisabled,
}) {
  if (!preview && !isLoading && !error) {
    return null;
  }

  return (
    <section className="tenant-modules-page__offer-panel tenant-modules-page__preview-panel">
      <div className="tenant-modules-page__offer-header">
        <div>
          <h2 className="tenant-modules-page__offer-title">Просмотр изменений</h2>
          {moduleTitle ? <p className="tenant-modules-page__offer-subtitle">{moduleTitle}</p> : null}
        </div>
        <button type="button" className="tenant-modules-page__offer-close" onClick={onClose}>
          Закрыть
        </button>
      </div>

      {isLoading ? <p className="tenant-modules-page__status">Загрузка предпросмотра…</p> : null}
      {error ? <p className="tenant-modules-page__error">{error}</p> : null}

      {preview ? (
        <div className="tenant-modules-page__offer-body">
          <p>
            <strong>Модуль:</strong> {preview.module_title || preview.module_key}
          </p>
          <p className="tenant-modules-page__offer-version">
            <strong>Текущая версия:</strong> {preview.from_version}
            {" → "}
            <strong>Новая версия:</strong> {preview.to_version}
          </p>
          <p>
            <strong>Источник релиза:</strong>{" "}
            {preview.publication_metadata?.source
              ? preview.publication_metadata.source
              : preview.release_version
                ? `Release ${preview.release_version}`
                : "—"}
          </p>
          {preview.publication_metadata?.publication_id ? (
            <p>
              <strong>Publication:</strong> #{preview.publication_metadata.publication_id}
              {preview.publication_metadata.publication_date
                ? ` · ${preview.publication_metadata.publication_date}`
                : ""}
              {preview.publication_metadata.approved_by_name
                ? ` · Approved by ${preview.publication_metadata.approved_by_name}`
                : ""}
            </p>
          ) : null}
          <p>
            <strong>Риск:</strong> {formatRisk(preview.risk_level)}
          </p>
          <div>
            <strong>Изменения:</strong>
            {Array.isArray(preview.change_items) && preview.change_items.length > 0 ? (
              <ul className="tenant-modules-page__offer-changes">
                {preview.change_items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            ) : (
              <p className="tenant-modules-page__muted">{preview.summary || "—"}</p>
            )}
          </div>
          <PreviewListSection title="Затронутые компоненты" items={preview.affected_components} />
          <PreviewListSection title="Затронутые маршруты" items={preview.affected_routes} />
          <PreviewListSection title="Затронутые таблицы" items={preview.affected_tables} />
          <PreviewListSection title="Зависимости" items={preview.affected_dependencies} />
          <ConfigurationDiffBlockSection
            title="Settings"
            block={preview.configuration_diff?.settings}
          />
          <ConfigurationDiffBlockSection
            title="Permissions"
            block={preview.configuration_diff?.permissions}
          />
          <ConfigurationDiffBlockSection
            title="Views"
            block={preview.configuration_diff?.views}
          />
          <ConfigurationDiffBlockSection
            title="Rules"
            block={preview.configuration_diff?.rules}
          />
          <ConfigurationDiffBlockSection
            title="Templates"
            block={preview.configuration_diff?.templates}
          />
          <p className="tenant-modules-page__muted tenant-modules-page__preview-note">
            Rollback и restore snapshot на этом этапе недоступны.
          </p>
          {onApply ? (
            <div className="tenant-modules-page__apply-actions">
              <button
                type="button"
                className="tenant-modules-page__apply-btn"
                onClick={onApply}
                disabled={isApplyDisabled}
              >
                Применить обновление
              </button>
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

function PreviewListSection({ title, items }) {
  const normalized = Array.isArray(items) ? items.filter(Boolean) : [];
  return (
    <div className="tenant-modules-page__preview-section">
      <strong>{title}:</strong>
      {normalized.length > 0 ? (
        <ul className="tenant-modules-page__offer-changes">
          {normalized.map((item) => (
            <li key={item}>
              <code>{item}</code>
            </li>
          ))}
        </ul>
      ) : (
        <p className="tenant-modules-page__muted">—</p>
      )}
    </div>
  );
}

function OfferDetailPanel({ offer, moduleTitle, isLoading, error, onClose }) {

  if (!offer && !isLoading && !error) {

    return null;

  }



  return (

    <section className="tenant-modules-page__offer-panel">

      <div className="tenant-modules-page__offer-header">

        <div>

          <h2 className="tenant-modules-page__offer-title">Обновление модуля</h2>

          {moduleTitle ? <p className="tenant-modules-page__offer-subtitle">{moduleTitle}</p> : null}

        </div>

        <button type="button" className="tenant-modules-page__offer-close" onClick={onClose}>

          Закрыть

        </button>

      </div>



      {isLoading ? <p className="tenant-modules-page__status">Загрузка предложения…</p> : null}

      {error ? <p className="tenant-modules-page__error">{error}</p> : null}



      {offer ? (

        <div className="tenant-modules-page__offer-body">

          <p className="tenant-modules-page__offer-version">

            {offer.from_version}

            {" → "}

            {offer.to_version}

          </p>

          <p>

            <strong>Источник:</strong>

            {" "}

            {offer.release_version ? `Release ${offer.release_version}` : "—"}

          </p>

          <div>

            <strong>Изменения:</strong>

            {Array.isArray(offer.change_items) && offer.change_items.length > 0 ? (

              <ul className="tenant-modules-page__offer-changes">

                {offer.change_items.map((item) => (

                  <li key={item}>{item}</li>

                ))}

              </ul>

            ) : (

              <p className="tenant-modules-page__muted">{offer.change_summary || "—"}</p>

            )}

          </div>

        </div>

      ) : null}

    </section>

  );

}



export default function AdminModulesPage() {

  const { tenantId } = useParams();

  const resolvedTenantId = Number(tenantId) > 0 ? Number(tenantId) : 1;



  useResolvedPageLayoutContract({

    pageType: PAGE_LAYOUT_PAGE_TYPE.STUDIO_ADMIN,

    toolbarZoneId: PAGE_LAYOUT_TOOLBAR_ZONE.APP_HEADER,

    title: "Модули",

  });



  const [modules, setModules] = useState([]);

  const [selectedModuleKey, setSelectedModuleKey] = useState(null);

  const [selectedOffer, setSelectedOffer] = useState(null);
  const [selectedPreview, setSelectedPreview] = useState(null);
  const [selectedConfiguration, setSelectedConfiguration] = useState(null);
  const [panelMode, setPanelMode] = useState(null);

  const [isLoading, setIsLoading] = useState(true);

  const [isOfferLoading, setIsOfferLoading] = useState(false);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [isConfigurationLoading, setIsConfigurationLoading] = useState(false);

  const [error, setError] = useState("");

  const [offerError, setOfferError] = useState("");
  const [previewError, setPreviewError] = useState("");
  const [configurationError, setConfigurationError] = useState("");

  const [appliedModuleKeys, setAppliedModuleKeys] = useState(() => new Set());
  const [rolledBackModuleKeys, setRolledBackModuleKeys] = useState(() => new Set());
  const [completedAppliesByModuleKey, setCompletedAppliesByModuleKey] = useState({});
  const [applyModalOpen, setApplyModalOpen] = useState(false);
  const [applyModalModule, setApplyModalModule] = useState(null);
  const [applyModalPreview, setApplyModalPreview] = useState(null);
  const [isApplyModalLoading, setIsApplyModalLoading] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [applyModalError, setApplyModalError] = useState("");

  const [rollbackModalOpen, setRollbackModalOpen] = useState(false);
  const [rollbackModalModule, setRollbackModalModule] = useState(null);
  const [rollbackModalApply, setRollbackModalApply] = useState(null);
  const [isRollingBack, setIsRollingBack] = useState(false);
  const [rollbackModalError, setRollbackModalError] = useState("");



  useEffect(() => {

    let cancelled = false;



    async function loadModules() {

      setIsLoading(true);

      setError("");



      try {

        const data = await tenantModulesApi.listTenantModules(resolvedTenantId);

        if (!cancelled) {

          setModules(Array.isArray(data) ? data : []);

        }

      } catch (loadError) {

        if (!cancelled) {

          setError(

            tenantModulesApi.getApiErrorMessage(

              loadError,

              "Не удалось загрузить модули компании",

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

    async function loadModuleApplies() {
      try {
        const applies = await tenantModuleConfigurationAppliesApi.listTenantModuleApplies(
          resolvedTenantId,
        );
        if (cancelled) {
          return;
        }
        const rows = Array.isArray(applies) ? applies : [];
        const completedByKey = {};
        const appliedKeys = new Set();
        const rolledBackKeys = new Set();

        for (const item of rows) {
          const status = String(item.status || "").toLowerCase();
          if (status === "completed") {
            completedByKey[item.module_key] = item;
            appliedKeys.add(item.module_key);
          }
          if (status === "rolled_back") {
            rolledBackKeys.add(item.module_key);
          }
        }

        setCompletedAppliesByModuleKey(completedByKey);
        setAppliedModuleKeys(appliedKeys);
        setRolledBackModuleKeys(rolledBackKeys);
      } catch {
        if (!cancelled) {
          setCompletedAppliesByModuleKey({});
          setAppliedModuleKeys(new Set());
          setRolledBackModuleKeys(new Set());
        }
      }
    }

    loadModuleApplies();

    return () => {

      cancelled = true;

    };

  }, [resolvedTenantId]);



  const loadOfferDetails = useCallback(

    async (module) => {

      const offerId = module?.available_offer?.id;

      if (!offerId) {

        return;

      }



      setSelectedModuleKey(module.module_key);
      setSelectedOffer(null);
      setSelectedPreview(null);
      setPanelMode("offer");
      setOfferError("");
      setPreviewError("");
      setIsOfferLoading(true);



      try {

        const offer = await tenantModulesApi.getTenantModuleUpdateOffer(

          resolvedTenantId,

          offerId,

        );

        setSelectedOffer(offer);

      } catch (loadError) {

        setOfferError(

          tenantModulesApi.getApiErrorMessage(

            loadError,

            "Не удалось загрузить предложение обновления",

          ),

        );

      } finally {

        setIsOfferLoading(false);

      }

    },

    [resolvedTenantId],

  );



  const loadPreviewDetails = useCallback(
    async (module) => {
      const offerId = module?.available_offer?.id;
      if (!offerId) {
        return;
      }

      setSelectedModuleKey(module.module_key);
      setSelectedOffer(null);
      setSelectedPreview(null);
      setPanelMode("preview");
      setOfferError("");
      setPreviewError("");
      setIsPreviewLoading(true);

      try {
        const preview = await tenantModuleUpdatePreviewsApi.getTenantModuleUpdateOfferPreview(
          resolvedTenantId,
          offerId,
        );
        setSelectedPreview(preview);
      } catch (loadError) {
        setPreviewError(
          tenantModuleUpdatePreviewsApi.getApiErrorMessage(
            loadError,
            "Не удалось загрузить предпросмотр обновления",
          ),
        );
      } finally {
        setIsPreviewLoading(false);
      }
    },
    [resolvedTenantId],
  );

  const loadConfigurationDetails = useCallback(
    async (module) => {
      if (!CONFIGURATION_MODULE_KEYS.has(module?.module_key)) {
        return;
      }

      setSelectedModuleKey(module.module_key);
      setSelectedOffer(null);
      setSelectedPreview(null);
      setSelectedConfiguration(null);
      setPanelMode("configuration");
      setOfferError("");
      setPreviewError("");
      setConfigurationError("");
      setIsConfigurationLoading(true);

      try {
        const configuration = await tenantModuleConfigurationsApi.getTenantModuleConfiguration(
          resolvedTenantId,
          module.module_key,
        );
        setSelectedConfiguration(configuration);
      } catch (loadError) {
        setConfigurationError(
          tenantModuleConfigurationsApi.getApiErrorMessage(
            loadError,
            "Не удалось загрузить конфигурацию модуля",
          ),
        );
      } finally {
        setIsConfigurationLoading(false);
      }
    },
    [resolvedTenantId],
  );

  const closeDetailPanel = useCallback(() => {
    setSelectedModuleKey(null);
    setSelectedOffer(null);
    setSelectedPreview(null);
    setSelectedConfiguration(null);
    setPanelMode(null);
    setOfferError("");
    setPreviewError("");
    setConfigurationError("");
  }, []);

  const reloadModuleApplies = useCallback(async () => {
    const applies = await tenantModuleConfigurationAppliesApi.listTenantModuleApplies(
      resolvedTenantId,
    );
    const rows = Array.isArray(applies) ? applies : [];
    const completedByKey = {};
    const appliedKeys = new Set();
    const rolledBackKeys = new Set();

    for (const item of rows) {
      const status = String(item.status || "").toLowerCase();
      if (status === "completed") {
        completedByKey[item.module_key] = item;
        appliedKeys.add(item.module_key);
      }
      if (status === "rolled_back") {
        rolledBackKeys.add(item.module_key);
      }
    }

    setCompletedAppliesByModuleKey(completedByKey);
    setAppliedModuleKeys(appliedKeys);
    setRolledBackModuleKeys(rolledBackKeys);
  }, [resolvedTenantId]);

  const reloadModules = useCallback(async () => {
    const data = await tenantModulesApi.listTenantModules(resolvedTenantId);
    setModules(Array.isArray(data) ? data : []);
  }, [resolvedTenantId]);

  const openApplyModal = useCallback(
    async (module) => {
      const offerId = module?.available_offer?.id;
      if (!offerId) {
        return;
      }

      setApplyModalModule(module);
      setApplyModalPreview(null);
      setApplyModalError("");
      setApplyModalOpen(true);
      setIsApplyModalLoading(true);

      try {
        const preview = await tenantModuleUpdatePreviewsApi.getTenantModuleUpdateOfferPreview(
          resolvedTenantId,
          offerId,
        );
        if (!hasConfigurationDiff(preview)) {
          setApplyModalError("Configuration diff недоступен для этого предложения");
        }
        setApplyModalPreview(preview);
      } catch (loadError) {
        setApplyModalError(
          tenantModuleUpdatePreviewsApi.getApiErrorMessage(
            loadError,
            "Не удалось загрузить данные для Apply",
          ),
        );
      } finally {
        setIsApplyModalLoading(false);
      }
    },
    [resolvedTenantId],
  );

  const closeApplyModal = useCallback(() => {
    if (isApplying) {
      return;
    }
    setApplyModalOpen(false);
    setApplyModalModule(null);
    setApplyModalPreview(null);
    setApplyModalError("");
  }, [isApplying]);

  const handleConfirmApply = useCallback(async () => {
    const offerId = applyModalModule?.available_offer?.id;
    if (!offerId || isApplyModalLoading) {
      return;
    }

    setIsApplying(true);
    setApplyModalError("");

    try {
      await tenantModuleConfigurationAppliesApi.applyTenantModuleConfigurationUpdate(
        resolvedTenantId,
        offerId,
      );
      setAppliedModuleKeys((current) => {
        const next = new Set(current);
        next.add(applyModalModule.module_key);
        return next;
      });
      await reloadModules();
      await reloadModuleApplies();
      closeDetailPanel();
      setApplyModalOpen(false);
      setApplyModalModule(null);
      setApplyModalPreview(null);
    } catch (applyError) {
      setApplyModalError(
        tenantModuleConfigurationAppliesApi.getApiErrorMessage(
          applyError,
          "Не удалось применить конфигурацию модуля",
        ),
      );
    } finally {
      setIsApplying(false);
    }
  }, [
    applyModalModule,
    closeDetailPanel,
    isApplyModalLoading,
    reloadModuleApplies,
    reloadModules,
    resolvedTenantId,
  ]);

  const openRollbackModal = useCallback((module, applyRow) => {
    setRollbackModalModule(module);
    setRollbackModalApply(applyRow);
    setRollbackModalError("");
    setRollbackModalOpen(true);
  }, []);

  const closeRollbackModal = useCallback(() => {
    if (isRollingBack) {
      return;
    }
    setRollbackModalOpen(false);
    setRollbackModalModule(null);
    setRollbackModalApply(null);
    setRollbackModalError("");
  }, [isRollingBack]);

  const handleConfirmRollback = useCallback(async () => {
    const applyId = rollbackModalApply?.id;
    if (!applyId || isRollingBack) {
      return;
    }

    setIsRollingBack(true);
    setRollbackModalError("");

    try {
      await tenantModuleConfigurationRollbacksApi.rollbackTenantModuleConfiguration(
        resolvedTenantId,
        applyId,
      );
      if (rollbackModalModule?.module_key) {
        setRolledBackModuleKeys((current) => {
          const next = new Set(current);
          next.add(rollbackModalModule.module_key);
          return next;
        });
        setAppliedModuleKeys((current) => {
          const next = new Set(current);
          next.delete(rollbackModalModule.module_key);
          return next;
        });
      }
      await reloadModules();
      await reloadModuleApplies();
      setRollbackModalOpen(false);
      setRollbackModalModule(null);
      setRollbackModalApply(null);
    } catch (rollbackError) {
      setRollbackModalError(
        tenantModuleConfigurationRollbacksApi.getApiErrorMessage(
          rollbackError,
          "Не удалось выполнить rollback конфигурации модуля",
        ),
      );
    } finally {
      setIsRollingBack(false);
    }
  }, [
    isRollingBack,
    reloadModuleApplies,
    reloadModules,
    resolvedTenantId,
    rollbackModalApply?.id,
    rollbackModalModule?.module_key,
  ]);



  const sortedModules = useMemo(

    () =>

      [...modules].sort((left, right) =>

        String(left.module_key || "").localeCompare(String(right.module_key || "")),

      ),

    [modules],

  );



  const selectedModule = sortedModules.find((module) => module.module_key === selectedModuleKey);



  return (

    <section className="tenant-modules-page">

      <p className="tenant-modules-page__intro">
        Read-only реестр установленных модулей компании и доступных предложений
        обновления. Apply и Rollback затрагивают только configuration layer — code,
        navigation и runtime entity data не изменяются.
      </p>



      {isLoading ? <p className="tenant-modules-page__status">Загрузка модулей…</p> : null}

      {error ? <p className="tenant-modules-page__error">{error}</p> : null}



      {!isLoading && !error ? (

        <div className="tenant-modules-page__table-wrap">

          <table className="tenant-modules-page__table">

            <thead>

              <tr>

                <th>Название</th>

                <th>Ключ</th>

                <th>Установлено</th>

                <th>Последняя</th>

                <th>Доступно обновление</th>
                <th>Просмотр</th>
                <th>Применить</th>
                <th>Откат</th>
                <th>Конфигурация</th>
                <th>Статус</th>

                <th>Включен</th>

                <th>Источник</th>

              </tr>

            </thead>

            <tbody>

              {sortedModules.length === 0 ? (

                <tr>

                  <td colSpan={12} className="tenant-modules-page__empty">

                    Установленные модули не обнаружены.

                  </td>

                </tr>

              ) : (

                sortedModules.map((module) => {

                  const latestVersion =

                    module.latest_platform_version || module.platform_version;

                  const hasUpdate = Boolean(module.update_available);
                  const completedApply = completedAppliesByModuleKey[module.module_key];
                  const canRollback = Boolean(completedApply);

                  const isSelected = selectedModuleKey === module.module_key;



                  return (

                    <tr

                      key={module.module_key}

                      className={isSelected ? "tenant-modules-page__row-selected" : undefined}

                    >

                      <td>{module.title}</td>

                      <td>

                        <code>{module.module_key}</code>

                      </td>

                      <td>{module.installed_version || "—"}</td>

                      <td>{latestVersion || "—"}</td>

                      <td>
                        {hasUpdate ? (
                          <button
                            type="button"
                            className="tenant-modules-page__offer-link"
                            onClick={() => loadOfferDetails(module)}
                          >
                            Доступно
                          </button>
                        ) : (
                          <span className="tenant-modules-page__muted">Нет</span>
                        )}
                      </td>
                      <td>
                        {hasUpdate ? (
                          <button
                            type="button"
                            className="tenant-modules-page__offer-link"
                            onClick={() => loadPreviewDetails(module)}
                          >
                            Просмотр изменений
                          </button>
                        ) : (
                          <span className="tenant-modules-page__muted">—</span>
                        )}
                      </td>
                      <td>
                        {hasUpdate ? (
                          <button
                            type="button"
                            className="tenant-modules-page__offer-link"
                            onClick={() => openApplyModal(module)}
                          >
                            Применить обновление
                          </button>
                        ) : (
                          <span className="tenant-modules-page__muted">—</span>
                        )}
                      </td>
                      <td>
                        {canRollback ? (
                          <button
                            type="button"
                            className="tenant-modules-page__offer-link"
                            onClick={() => openRollbackModal(module, completedApply)}
                          >
                            Откатить
                          </button>
                        ) : (
                          <span className="tenant-modules-page__muted">—</span>
                        )}
                      </td>
                      <td>
                        {CONFIGURATION_MODULE_KEYS.has(module.module_key) ? (
                          <button
                            type="button"
                            className="tenant-modules-page__offer-link"
                            onClick={() => loadConfigurationDetails(module)}
                          >
                            Конфигурация
                          </button>
                        ) : (
                          <span className="tenant-modules-page__muted">—</span>
                        )}
                      </td>

                      <td>
                        {rolledBackModuleKeys.has(module.module_key) ? (
                          <span className="tenant-modules-page__status-rolled-back">Откат выполнен</span>
                        ) : appliedModuleKeys.has(module.module_key) ? (
                          <span className="tenant-modules-page__status-applied">Обновлено</span>
                        ) : (
                          "Установлен"
                        )}
                      </td>

                      <td>{module.enabled ? "Да" : "Нет"}</td>

                      <td>{formatSource(module.source)}</td>

                    </tr>

                  );

                })

              )}

            </tbody>

          </table>

        </div>

      ) : null}



      {selectedModuleKey && panelMode === "offer" ? (
        <OfferDetailPanel
          offer={selectedOffer}
          moduleTitle={selectedModule?.title}
          isLoading={isOfferLoading}
          error={offerError}
          onClose={closeDetailPanel}
        />
      ) : null}

      {selectedModuleKey && panelMode === "preview" ? (
        <PreviewDetailPanel
          preview={selectedPreview}
          moduleTitle={selectedModule?.title}
          isLoading={isPreviewLoading}
          error={previewError}
          onClose={closeDetailPanel}
          onApply={
            selectedModule?.available_offer?.id && hasConfigurationDiff(selectedPreview)
              ? () => openApplyModal(selectedModule)
              : null
          }
          isApplyDisabled={isApplyModalLoading || isApplying}
        />
      ) : null}

      {selectedModuleKey && panelMode === "configuration" ? (
        <ConfigurationDetailPanel
          configuration={selectedConfiguration}
          moduleTitle={selectedModule?.title}
          isLoading={isConfigurationLoading}
          error={configurationError}
          onClose={closeDetailPanel}
        />
      ) : null}

      <ModuleConfigurationApplyConfirmModal
        open={applyModalOpen}
        moduleTitle={applyModalModule?.title}
        moduleKey={applyModalModule?.module_key}
        fromVersion={applyModalPreview?.from_version || applyModalModule?.installed_version}
        toVersion={applyModalPreview?.to_version || applyModalModule?.latest_platform_version}
        riskLevel={applyModalPreview?.risk_level}
        changesCount={countConfigurationDiffChanges(applyModalPreview?.configuration_diff)}
        isSubmitting={isApplying || isApplyModalLoading}
        error={applyModalError}
        onCancel={closeApplyModal}
        onConfirm={handleConfirmApply}
      />

      <ModuleConfigurationRollbackConfirmModal
        open={rollbackModalOpen}
        moduleTitle={rollbackModalModule?.title}
        moduleKey={rollbackModalModule?.module_key}
        currentVersion={rollbackModalApply?.to_module_version}
        restoreVersion={rollbackModalApply?.from_module_version}
        snapshotCreatedAt={rollbackModalApply?.completed_at || rollbackModalApply?.started_at}
        isSubmitting={isRollingBack}
        error={rollbackModalError}
        onCancel={closeRollbackModal}
        onConfirm={handleConfirmRollback}
      />

      <ModulePublicationsPanel modules={sortedModules} />

    </section>

  );

}


