/**
 * @param {unknown} error
 * @returns {string}
 */
export function mapRelationFieldApiError(error) {
  const status = error?.response?.status;
  const detail = error?.response?.data?.detail;

  if (typeof detail === "string" && detail.trim()) {
    return detail.trim();
  }

  if (Array.isArray(detail)) {
    const messages = detail
      .map((item) => {
        if (typeof item === "string") {
          return item;
        }

        if (item && typeof item === "object" && "msg" in item) {
          return String(item.msg);
        }

        return "";
      })
      .filter(Boolean);

    if (messages.length) {
      return messages.join("; ");
    }
  }

  if (detail && typeof detail === "object") {
    const message = detail.message || detail.detail;

    if (typeof message === "string" && message.trim()) {
      return message.trim();
    }
  }

  if (status === 404) {
    return "Связь или запись не найдены";
  }

  if (status === 409) {
    return "Такая связь уже существует";
  }

  if (status === 422) {
    return "Некорректные данные для связи";
  }

  if (status >= 500) {
    return "Ошибка сервера. Попробуйте позже";
  }

  if (typeof error?.message === "string" && error.message.trim()) {
    return error.message.trim();
  }

  return "Не удалось выполнить операцию со связью";
}
