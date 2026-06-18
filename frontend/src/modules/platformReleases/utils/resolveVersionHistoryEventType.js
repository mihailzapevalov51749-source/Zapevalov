const ROLLBACK_MARKERS = ["откат", "rollback"];

/**
 * Read-model label for history rows until dedicated deployment/rollback event types exist in API.
 */
export function resolveVersionHistoryEventType(row) {
  const description = String(row?.change_description || row?.notes || "").toLocaleLowerCase("ru");
  if (ROLLBACK_MARKERS.some((marker) => description.includes(marker))) {
    return "Откат";
  }
  if (String(row?.status || "").toLowerCase() === "superseded" || row?.superseded_at) {
    return "Обновление";
  }
  return "Установка";
}
