import { useCallback, useEffect, useState } from "react";

import { getApiErrorMessage } from "../../api/platformApiClient";
import * as designerApi from "../../api/designerApi";
import CreateFieldModal, { FIELD_TYPE_OPTIONS } from "../fields/CreateFieldModal";
import FieldPropertiesPanel from "../fields/FieldPropertiesPanel";
import {
  buildChoiceOptionsFromText,
  formatChoiceOptionsToText,
  getFieldTypeLabel,
  isChoiceFieldType,
} from "../fields/fieldFormUtils";

export default function FieldsTab({ tenantId, objectTypeId }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedId, setSelectedId] = useState(null);
  const [draft, setDraft] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState("");

  const selected = items.find((item) => item.id === selectedId) || null;
  const existingFieldKeys = items
    .map((item) => String(item.key || "").trim().toLowerCase())
    .filter(Boolean);

  const loadItems = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const data = await designerApi.listFields(tenantId, objectTypeId);
      setItems(data);
    } catch (err) {
      setError(getApiErrorMessage(err, "Не удалось загрузить поля"));
    } finally {
      setLoading(false);
    }
  }, [tenantId, objectTypeId]);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  useEffect(() => {
    if (!selected) {
      setDraft(null);
      setSaveError("");
      return;
    }

    setDraft({
      name: selected.name,
      key: selected.key,
      field_type: selected.field_type,
      is_required: selected.is_required,
      is_unique: selected.is_unique,
      description: selected.description || "",
      choice_options_text: formatChoiceOptionsToText(selected.settings_json),
    });
    setSaveError("");
  }, [selected]);

  const handleCreateField = async (payload) => {
    setIsCreating(true);
    setCreateError("");

    try {
      await designerApi.createField(tenantId, objectTypeId, payload);
      setIsCreateModalOpen(false);
      setSelectedId(null);
      setDraft(null);
      await loadItems();
    } catch (err) {
      setCreateError(getApiErrorMessage(err, "Не удалось создать поле"));
      throw err;
    } finally {
      setIsCreating(false);
    }
  };

  const handleSave = async () => {
    if (!selected || !draft) return;

    const name = String(draft.name || "").trim();
    if (!name) {
      setSaveError("Укажите название поля");
      return;
    }

    const payload = {
      name,
      field_type: draft.field_type,
      is_required: Boolean(draft.is_required),
      is_unique: Boolean(draft.is_unique),
      description: String(draft.description || "").trim(),
    };

    if (isChoiceFieldType(draft.field_type)) {
      const options = buildChoiceOptionsFromText(
        draft.choice_options_text,
        existingFieldKeys.filter((key) => key !== String(draft.key || "").toLowerCase()),
      );

      if (options.length === 0) {
        setSaveError("Добавьте хотя бы один вариант значения");
        return;
      }

      payload.settings_json = { options };
    }

    setSaving(true);
    setSaveError("");

    try {
      await designerApi.updateField(tenantId, objectTypeId, selected.id, payload);
      await loadItems();
    } catch (err) {
      setSaveError(getApiErrorMessage(err, "Не удалось сохранить поле"));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selected) return;
    if (!window.confirm(`Удалить поле "${selected.name}"?`)) return;

    try {
      await designerApi.deleteField(tenantId, objectTypeId, selected.id);
      setSelectedId(null);
      setDraft(null);
      await loadItems();
    } catch (err) {
      window.alert(getApiErrorMessage(err, "Не удалось удалить поле"));
    }
  };

  const handleClosePanel = () => {
    setSelectedId(null);
    setDraft(null);
    setSaveError("");
  };

  if (loading) return <div className="designer-loading">Загрузка полей...</div>;
  if (error) return <div className="designer-error">{error}</div>;

  return (
    <div
      className={`designer-workspace-layout ${
        selected ? "has-panel" : ""
      }`}
    >
      <div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginBottom: 12,
          }}
        >
          <h3 style={{ margin: 0 }}>
            Поля объекта <span className="designer-badge">{items.length}</span>
          </h3>
          <button
            type="button"
            className="designer-btn designer-btn--primary"
            onClick={() => {
              setCreateError("");
              setIsCreateModalOpen(true);
            }}
          >
            + Добавить поле
          </button>
        </div>

        <div className="designer-table-wrap">
          <table className="designer-table">
            <thead>
              <tr>
                <th>Название</th>
                <th>Key</th>
                <th>Тип</th>
                <th>Обязательное</th>
                <th>Уникальное</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr
                  key={item.id}
                  className={item.id === selectedId ? "is-selected" : ""}
                  onClick={() => setSelectedId(item.id)}
                >
                  <td>{item.name}</td>
                  <td>
                    <code>{item.key}</code>
                  </td>
                  <td>{getFieldTypeLabel(item.field_type, FIELD_TYPE_OPTIONS)}</td>
                  <td>{item.is_required ? "Да" : "Нет"}</td>
                  <td>{item.is_unique ? "Да" : "Нет"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {selected && draft ? (
        <FieldPropertiesPanel
          draft={draft}
          saveError={saveError}
          saving={saving}
          onDraftChange={setDraft}
          onClose={handleClosePanel}
          onSave={handleSave}
          onDelete={handleDelete}
        />
      ) : null}

      <CreateFieldModal
        isOpen={isCreateModalOpen}
        existingFieldKeys={existingFieldKeys}
        isSubmitting={isCreating}
        submitError={createError}
        onClose={() => setIsCreateModalOpen(false)}
        onCreate={handleCreateField}
      />
    </div>
  );
}
