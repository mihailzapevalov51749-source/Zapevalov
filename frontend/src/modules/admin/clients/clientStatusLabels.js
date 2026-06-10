const STATUS_LABELS_RU = {
  ACTIVE: "Активна",
  DISABLED: "Отключена",
  ARCHIVED: "Архивная",
};

export function resolveClientStatusLabel(status) {
  const normalized = String(status || "").trim().toUpperCase();
  return STATUS_LABELS_RU[normalized] || normalized || "—";
}
