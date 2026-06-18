import { useCallback, useEffect, useState } from "react";

import * as publicationsApi from "../api/platformModulePublicationsApi";

export default function ModulePublicationsPanel({ modules = [] }) {
  const [publications, setPublications] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState("");
  const [selectedModuleKey, setSelectedModuleKey] = useState("runtime.calendar");

  const reload = useCallback(async () => {
    setIsLoading(true);
    setError("");
    try {
      const data = await publicationsApi.listDevModulePublications();
      setPublications(Array.isArray(data) ? data : []);
    } catch (loadError) {
      setError(
        publicationsApi.getApiErrorMessage(
          loadError,
          "Не удалось загрузить историю публикаций",
        ),
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  const handleCreate = async () => {
    if (!selectedModuleKey || isCreating) return;
    setIsCreating(true);
    setError("");
    try {
      await publicationsApi.createModulePublication({
        module_key: selectedModuleKey,
        release_summary: `DEV publication for ${selectedModuleKey}`,
      });
      await reload();
    } catch (createError) {
      setError(
        publicationsApi.getApiErrorMessage(createError, "Не удалось создать публикацию"),
      );
    } finally {
      setIsCreating(false);
    }
  };

  const handleSubmit = async (publicationId) => {
    setError("");
    try {
      await publicationsApi.submitModulePublication(publicationId);
      await reload();
    } catch (submitError) {
      setError(
        publicationsApi.getApiErrorMessage(submitError, "Не удалось отправить на review"),
      );
    }
  };

  return (
    <section className="tenant-modules-page__offer-panel" style={{ marginTop: 24 }}>
      <div className="tenant-modules-page__offer-header">
        <div>
          <h2 className="tenant-modules-page__offer-title">Module Publications (DEV)</h2>
          <p className="tenant-modules-page__offer-subtitle">
            Create Publication · Publication History
          </p>
        </div>
      </div>

      <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 12 }}>
        <select
          value={selectedModuleKey}
          onChange={(event) => setSelectedModuleKey(event.target.value)}
        >
          {(Array.isArray(modules) ? modules : []).map((module) => (
            <option key={module.module_key} value={module.module_key}>
              {module.title || module.module_key}
            </option>
          ))}
        </select>
        <button type="button" disabled={isCreating} onClick={handleCreate}>
          Create Publication
        </button>
      </div>

      {isLoading ? <p className="tenant-modules-page__status">Загрузка публикаций…</p> : null}
      {error ? <p className="tenant-modules-page__error">{error}</p> : null}

      {!isLoading ? (
        <table className="tenant-modules-page__table">
          <thead>
            <tr>
              <th>Module</th>
              <th>Version</th>
              <th>Status</th>
              <th>Created</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {publications.length === 0 ? (
              <tr>
                <td colSpan={5} className="tenant-modules-page__muted">
                  Публикаций пока нет.
                </td>
              </tr>
            ) : (
              publications.map((row) => (
                <tr key={row.id}>
                  <td>
                    <code>{row.module_key}</code>
                  </td>
                  <td>
                    {row.from_module_version} → {row.to_module_version}
                  </td>
                  <td>{row.publication_status}</td>
                  <td>{row.created_at ? new Date(row.created_at).toLocaleString("ru-RU") : "—"}</td>
                  <td>
                    {row.publication_status === "draft" ? (
                      <button type="button" onClick={() => handleSubmit(row.id)}>
                        Submit for Review
                      </button>
                    ) : null}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      ) : null}
    </section>
  );
}
