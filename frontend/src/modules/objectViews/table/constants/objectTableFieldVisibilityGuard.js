import { showPlatformNotification } from "../../../../shared/platformNotification/PlatformNotification";

export const OBJECT_TABLE_LAST_VISIBLE_FIELD_MESSAGE =
  "Нельзя скрыть все поля таблицы. Должно остаться хотя бы одно поле.";

export function notifyLastVisibleTableFieldGuard() {
  showPlatformNotification({
    message: OBJECT_TABLE_LAST_VISIBLE_FIELD_MESSAGE,
    variant: "warning",
  });
}
