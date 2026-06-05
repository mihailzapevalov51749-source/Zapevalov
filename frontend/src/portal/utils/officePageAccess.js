export function shouldRequestOfficePageAccess(pathname) {
  const normalized = String(pathname || "");
  if (/\/designer\/tenant\/\d+\/page\/\d+/.test(normalized)) {
    return false;
  }
  if (normalized.startsWith("/admin")) {
    return false;
  }
  if (/^\/designer\/tenant\/\d+\/administration(\/|$)/.test(normalized)) {
    return false;
  }
  return /\/portal\/\d+\/page\/\d+/.test(normalized);
}

export function resolveOfficePageLoadError(error, fallback = "Ошибка загрузки страницы") {
  const status = Number(error?.response?.status);
  if (status === 403) {
    return "Страница недоступна в Office. Опубликуйте её в Studio или откройте в режиме Студии.";
  }
  return fallback;
}
