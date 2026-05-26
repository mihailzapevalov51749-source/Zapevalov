import { useEffect, useState } from "react";

import { getApiErrorMessage } from "../../api/platformApiClient";
import * as designerApi from "../../api/designerApi";

export default function GeneralTab({ tenantId, objectTypeId, objectType, onSaved }) {
  const [form, setForm] = useState({
    name: "",
    key: "",
    description: "",
    icon: "",
    status: "active",
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!objectType) {
      return;
    }

    setForm({
      name: objectType.name || "",
      key: objectType.key || "",
      description: objectType.description || "",
      icon: objectType.icon || "",
      status: objectType.status || "active",
    });
  }, [objectType]);

  const updateField = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage("");

    try {
      const updated = await designerApi.updateObjectType(tenantId, objectTypeId, {
        name: form.name,
        description: form.description,
        icon: form.icon || null,
        status: form.status,
      });
      onSaved?.(updated);
      setMessage("Сохранено");
    } catch (err) {
      setMessage(getApiErrorMessage(err, "Не удалось сохранить"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="designer-grid-2">
      <div className="designer-card">
        <h3 style={{ marginTop: 0 }}>Основная информация</h3>

        <label className="designer-label">Название объекта</label>
        <input
          className="designer-input"
          value={form.name}
          onChange={(e) => updateField("name", e.target.value)}
        />

        <div style={{ height: 12 }} />

        <label className="designer-label">Ключ (Key)</label>
        <input className="designer-input" value={form.key} disabled />
        <div className="designer-field-hint">
          Уникальный системный идентификатор. Изменение key в MVP отключено.
        </div>

        <div style={{ height: 12 }} />

        <label className="designer-label">Описание</label>
        <textarea
          className="designer-textarea"
          value={form.description}
          onChange={(e) => updateField("description", e.target.value)}
        />

        <div style={{ height: 12 }} />

        <label className="designer-label">Иконка</label>
        <input
          className="designer-input"
          value={form.icon}
          onChange={(e) => updateField("icon", e.target.value)}
          placeholder="folder"
        />

        <div style={{ height: 12 }} />

        <label className="designer-label">Статус</label>
        <select
          className="designer-select"
          value={form.status}
          onChange={(e) => updateField("status", e.target.value)}
        >
          <option value="active">active</option>
          <option value="archived">archived</option>
        </select>

        <div style={{ marginTop: 16, display: "flex", gap: 8 }}>
          <button
            type="button"
            className="designer-btn designer-btn--primary"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? "Сохранение..." : "Сохранить изменения"}
          </button>
          {message ? (
            <span style={{ alignSelf: "center", color: "#64748b" }}>{message}</span>
          ) : null}
        </div>
      </div>

      <div className="designer-card">
        <h3 style={{ marginTop: 0 }}>Метаданные</h3>
        <div style={{ fontSize: 13, color: "#64748b", lineHeight: 1.7 }}>
          <div>
            <strong>ID:</strong> {objectType?.id}
          </div>
          <div>
            <strong>Draft revision:</strong> {objectType?.draft_revision}
          </div>
          <div>
            <strong>System:</strong> {objectType?.is_system ? "да" : "нет"}
          </div>
          <div>
            <strong>Default entity:</strong>{" "}
            {objectType?.is_default_entity ? "да" : "нет"}
          </div>
        </div>
      </div>
    </div>
  );
}
