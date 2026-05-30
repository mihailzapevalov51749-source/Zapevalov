/** User-facing copy for legacy storage creation blocks (Layer 2 / Phase 9.3). */
export const LEGACY_STORAGE_CREATION_NOTICE_MESSAGE = `Создание новых Universal Table-блоков отключено.

Universal Table Storage переведён в режим поддержки.

Для новых данных создайте Object Type в Studio и опубликуйте его в Office.`;

export function getLegacyStorageCreationNoticeMessage(): string {
  return LEGACY_STORAGE_CREATION_NOTICE_MESSAGE;
}
