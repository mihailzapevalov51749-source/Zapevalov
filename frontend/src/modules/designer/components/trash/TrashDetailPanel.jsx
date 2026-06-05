import {
  Calendar,
  FileText,
  FolderOpen,
  Hash,
  Info,
  Link2,
  Trash2,
  User,
} from "lucide-react";

import TrashDependenciesView, {
  TrashDependenciesSummary,
} from "./TrashDependenciesView";

function formatTrashDate(value) {
  if (!value) {
    return "—";
  }
  return new Date(value).toLocaleString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function DetailFieldRow({ icon: Icon, label, value }) {
  return (
    <div className="designer-trash-detail__field">
      <span className="designer-trash-detail__field-icon" aria-hidden="true">
        <Icon size={15} strokeWidth={2} />
      </span>
      <span className="designer-trash-detail__field-label">{label}</span>
      <span className="designer-trash-detail__field-value">{value}</span>
    </div>
  );
}

function SectionHeading({ icon: Icon, title }) {
  return (
    <h4 className="designer-trash-detail__section-title">
      <span className="designer-trash-detail__section-icon" aria-hidden="true">
        <Icon size={16} strokeWidth={2} />
      </span>
      {title}
    </h4>
  );
}

const GENERAL_DATA_FIELDS = [
  { key: "kind_label", label: "Тип", icon: FileText },
  { key: "placement_label", label: "Где находился", icon: FolderOpen },
  { key: "created_at", label: "Дата создания", icon: Calendar, format: formatTrashDate },
  { key: "deleted_at", label: "Дата удаления", icon: Trash2, format: formatTrashDate },
  { key: "deleted_by_label", label: "Кто удалил", icon: User },
  { key: "id", label: "ID", icon: Hash },
];

export default function TrashDetailPanel({
  item,
  depsLoading,
  depsPresentation,
  isSubmitting,
  onRestore,
  onPurge,
  onOpenRoute,
}) {
  if (!item) {
    return (
      <div className="designer-trash-detail designer-trash-detail--empty">
        <p className="designer-trash-detail__empty-text">Выберите элемент в таблице</p>
      </div>
    );
  }

  const hasDependencies = Boolean(depsPresentation?.totalCount);

  return (
    <div className="designer-trash-detail">
      <header className="designer-trash-detail__header">
        <span className="designer-trash-detail__header-icon" aria-hidden="true">
          <FileText size={18} strokeWidth={2} />
        </span>
        <h3 className="designer-trash-detail__header-title">Информация об элементе</h3>
      </header>

      <div className="designer-trash-detail__divider" role="presentation" />

      <section className="designer-trash-detail__section" aria-label="Общие данные">
        <SectionHeading icon={Info} title="Общие данные" />
        <div className="designer-trash-detail__fields">
          {GENERAL_DATA_FIELDS.map((field) => {
            const rawValue = item[field.key];
            const value = field.format ? field.format(rawValue) : rawValue || "—";
            return (
              <DetailFieldRow
                key={field.key}
                icon={field.icon}
                label={field.label}
                value={value}
              />
            );
          })}
        </div>
      </section>

      <div className="designer-trash-detail__divider" role="presentation" />

      <section className="designer-trash-detail__section" aria-label="Зависимости">
        <SectionHeading icon={Link2} title="Зависимости" />
        {depsLoading ? (
          <p className="designer-trash-detail__deps-hint">Проверка зависимостей…</p>
        ) : hasDependencies ? (
          <div className="designer-trash-detail__deps-content">
            <TrashDependenciesSummary groups={depsPresentation.groups} />
            <p className="designer-trash-detail__deps-hint">
              Используется в {depsPresentation.totalCount}{" "}
              {depsPresentation.totalCount === 1 ? "зависимости" : "зависимостях"}.
              Окончательное удаление будет заблокировано.
            </p>
            <TrashDependenciesView
              groups={depsPresentation.groups}
              onOpenRoute={onOpenRoute}
            />
          </div>
        ) : (
          <p className="designer-trash-detail__deps-hint">Зависимости не обнаружены</p>
        )}
      </section>

      <div className="designer-trash-detail__actions">
        <button
          type="button"
          className="designer-btn designer-btn--primary designer-trash-detail__action"
          disabled={isSubmitting}
          onClick={onRestore}
        >
          Восстановить
        </button>
        <button
          type="button"
          className="designer-btn designer-btn--danger designer-trash-detail__action"
          disabled={isSubmitting}
          onClick={onPurge}
        >
          Удалить окончательно
        </button>
      </div>
    </div>
  );
}
