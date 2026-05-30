/** User-facing copy for existing legacy Universal Table storage blocks (Layer 5). */
export const LEGACY_STORAGE_EXISTING_SUPPORT_TITLE = "Legacy storage";

export const LEGACY_STORAGE_EXISTING_SUPPORT_SHORT =
  "Хранилище Universal Table · режим поддержки";

export const LEGACY_STORAGE_EXISTING_SUPPORT_MESSAGE = `Хранилище Universal Table переведено в режим поддержки.

Существующие данные этого блока доступны для чтения и редактирования. Новые бизнес-данные создавайте через Object Type в Studio и публикацию в Office.`;

export function getLegacyStorageExistingSupportShort(): string {
  return LEGACY_STORAGE_EXISTING_SUPPORT_SHORT;
}

export function getLegacyStorageExistingSupportMessage(): string {
  return LEGACY_STORAGE_EXISTING_SUPPORT_MESSAGE;
}
