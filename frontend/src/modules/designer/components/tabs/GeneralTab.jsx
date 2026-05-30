import { useCallback, useEffect, useState } from "react";

import IconFilePicker from "../../../../shared/icons/IconFilePicker";
import ObjectTypeColorPicker from "../../../../shared/icons/ObjectTypeColorPicker";
import { normalizeObjectTypeColor } from "../../../../shared/icons/iconFileUtils";
import * as designerApi from "../../api/designerApi";
import { isObjectTypeFormDirty } from "../../utils/objectTypeLifecycleState";

const EMPTY_VALUE = "Не задано";

const USAGE_ITEMS = [
  { key: "views", label: "Представления (Views)", countKey: "views" },
  { key: "relations", label: "Связи (Relations)", countKey: "relations" },
  { key: "workflows", label: "Бизнес-процессы", countKey: null },
  { key: "layouts", label: "Страницы (Layout)", countKey: "layouts" },
  { key: "templates", label: "Шаблоны", countKey: null },
  { key: "permissions", label: "Права доступа", countKey: null },
];

function ReadonlyValue({ value = EMPTY_VALUE }) {
  return <div className="designer-object-general-readonly">{value}</div>;
}

function ReadonlyToggle({ checked = false, description = "" }) {
  return (
    <div className="designer-object-general-toggle">
      <input type="checkbox" checked={checked} readOnly disabled />
      <span>{description}</span>
    </div>
  );
}

function Field({ label, helper, hintClassName = "", className = "", children }) {
  const hintClass = hintClassName
    ? `designer-field-hint ${hintClassName}`
    : "designer-field-hint";
  const fieldClass = className
    ? `designer-object-general-field ${className}`
    : "designer-object-general-field";

  return (
    <div className={fieldClass}>
      <label className="designer-label">{label}</label>
      {children}
      {helper ? <div className={hintClass}>{helper}</div> : null}
    </div>
  );
}

function MetaRow({ label, value, muted = false }) {
  return (
    <div className="designer-object-general-meta-row">
      <span className="designer-object-general-meta-row__label">{label}</span>
      <span
        className={`designer-object-general-meta-row__value${
          muted ? " is-muted" : ""
        }`}
      >
        {value}
      </span>
    </div>
  );
}

export default function GeneralTab({
  tenantId,
  objectTypeId,
  objectType,
  onSaved,
  onDirtyChange,
  onIconChange,
  onColorChange,
  registerSave,
}) {
  const [form, setForm] = useState({
    name: "",
    key: "",
    description: "",
    icon_type: null,
    icon_file_url: null,
    color: null,
    status: "active",
  });
  const dependencyCounts = objectType?.dependency_counts || {};
  const sortOrderValue =
    objectType?.sort_order != null ? String(objectType.sort_order) : EMPTY_VALUE;

  useEffect(() => {
    if (!objectType) {
      return;
    }

    setForm({
      name: objectType.name || "",
      key: objectType.key || "",
      description: objectType.description || "",
      icon_type: objectType.icon_type ?? null,
      icon_file_url: objectType.icon_file_url ?? null,
      color: normalizeObjectTypeColor(objectType.color),
      status: objectType.status || "active",
    });
  }, [objectType]);

  const updateField = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = useCallback(async () => {
    const updated = await designerApi.updateObjectType(tenantId, objectTypeId, {
      name: form.name,
      description: form.description,
      icon: null,
      icon_type: form.icon_type,
      icon_file_url: form.icon_file_url,
      color: normalizeObjectTypeColor(form.color),
      status: form.status,
    });
    onSaved?.(updated);
  }, [form, objectTypeId, onSaved, tenantId]);

  useEffect(() => {
    onDirtyChange?.(isObjectTypeFormDirty(form, objectType));
  }, [form, objectType, onDirtyChange]);

  useEffect(() => {
    registerSave?.(handleSave);
    return () => registerSave?.(null);
  }, [handleSave, registerSave]);

  return (
    <div className="designer-object-general-page">
      <div className="designer-object-general-workspace">
        <div className="designer-object-general-col designer-object-general-col--left">
          <section className="designer-card designer-object-general-card">
            <h3 className="designer-object-general-card-title">Основная информация</h3>

            <div className="designer-object-general-rows">
              <div className="designer-object-general-row designer-object-general-row--2">
                <Field label="Название объекта">
                  <input
                    className="designer-input"
                    value={form.name}
                    onChange={(e) => updateField("name", e.target.value)}
                  />
                </Field>
                <Field
                  label="Ключ (Key)"
                  helper="Уникальный системный идентификатор."
                  hintClassName="designer-field-hint--key"
                >
                  <input className="designer-input" value={form.key} disabled />
                </Field>
              </div>

              <div className="designer-object-general-row designer-object-general-row--1">
                <Field label="Описание">
                  <textarea
                    className="designer-textarea"
                    value={form.description}
                    onChange={(e) => updateField("description", e.target.value)}
                  />
                </Field>
              </div>

              <div className="designer-object-general-row designer-object-general-row--3 designer-object-general-row--appearance">
                <Field label="Иконка">
                  <IconFilePicker
                    iconType={form.icon_type}
                    iconFileUrl={form.icon_file_url}
                    color={form.color}
                    onChange={(next) => {
                      setForm((prev) => ({
                        ...prev,
                        icon_type: next.icon_type,
                        icon_file_url: next.icon_file_url,
                      }));
                      onIconChange?.(next);
                    }}
                  />
                </Field>
                <Field label="Цвет" className="designer-object-general-field--color">
                  <ObjectTypeColorPicker
                    color={form.color}
                    onChange={(nextColor) => {
                      setForm((prev) => ({ ...prev, color: nextColor }));
                      onColorChange?.(nextColor);
                    }}
                  />
                </Field>
                <Field
                  label="Порядок сортировки"
                  className="designer-object-general-field--sort"
                  helper="Чем меньше число, тем выше объект в списке."
                  hintClassName="designer-field-hint--sort"
                >
                  <input
                    className="designer-input"
                    value={
                      objectType?.sort_order != null ? sortOrderValue : EMPTY_VALUE
                    }
                    disabled
                    readOnly
                  />
                </Field>
              </div>

              <div className="designer-object-general-row designer-object-general-row--3">
                <Field label="Статус">
                  <select
                    className="designer-select"
                    value={form.status}
                    onChange={(e) => updateField("status", e.target.value)}
                  >
                    <option value="active">active</option>
                    <option value="archived">archived</option>
                  </select>
                </Field>
                <Field label="Системный объект">
                  <ReadonlyToggle
                    checked={Boolean(objectType?.is_system)}
                    description="Недоступно для удаления"
                  />
                </Field>
                <Field label="Сущность по умолчанию">
                  <ReadonlyToggle
                    checked={Boolean(objectType?.is_default_entity)}
                    description="Создавать сущности этого типа по умолчанию"
                  />
                </Field>
              </div>
            </div>
          </section>

          <section className="designer-card designer-object-general-card">
            <h3 className="designer-object-general-card-title">Дополнительные настройки</h3>

            <div className="designer-object-general-rows">
              <div className="designer-object-general-row designer-object-general-row--3">
                <Field label="Единица времени">
                  <ReadonlyValue />
                </Field>
                <Field label="Часовой пояс">
                  <ReadonlyValue />
                </Field>
                <Field label="Формат дат">
                  <ReadonlyValue />
                </Field>
              </div>

              <div className="designer-object-general-row designer-object-general-row--2">
                <Field label="Поддержка версионирования">
                  <ReadonlyToggle
                    checked={false}
                    description="Сохранить историю изменений сущностей этого типа"
                  />
                </Field>
                <Field label="Мягкое удаление">
                  <ReadonlyToggle
                    checked={false}
                    description="Удалённые записи перемещаются в корзину"
                  />
                </Field>
              </div>
            </div>
          </section>
        </div>

        <aside className="designer-object-general-col designer-object-general-col--right">
          <section className="designer-card designer-object-general-card">
            <h3 className="designer-object-general-card-title">Идентификация и доступ</h3>
            <div className="designer-object-general-meta">
              <MetaRow
                label="Владелец объекта"
                value={objectType?.owner_name || EMPTY_VALUE}
                muted={!objectType?.owner_name}
              />
              <MetaRow label="Группа объектов" value={EMPTY_VALUE} muted />
              <MetaRow label="Теги" value={EMPTY_VALUE} muted />
              <MetaRow label="Кто может создавать сущности" value={EMPTY_VALUE} muted />
              <MetaRow label="Кто может удалять сущности" value={EMPTY_VALUE} muted />
            </div>
          </section>

          <section className="designer-card designer-object-general-card">
            <h3 className="designer-object-general-card-title">Используется в</h3>
            <div className="designer-object-general-usage">
              {USAGE_ITEMS.map(({ key, label, countKey }) => (
                <div key={key} className="designer-object-general-usage-row">
                  <span>{label}</span>
                  <span className="designer-object-general-usage-count">
                    {countKey ? dependencyCounts[countKey] ?? 0 : 0}
                  </span>
                </div>
              ))}
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
