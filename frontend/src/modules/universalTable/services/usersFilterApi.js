const API_BASE_URL = "http://127.0.0.1:8010";

export function getToken() {
  return (
    localStorage.getItem("token") ||
    localStorage.getItem("access_token") ||
    localStorage.getItem("authToken") ||
    ""
  );
}

export async function loadSystemUsers() {
  const token = getToken();

  const response = await fetch(`${API_BASE_URL}/users`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });

  if (!response.ok) {
    throw new Error("Не удалось загрузить пользователей");
  }

  const data = await response.json();

  if (Array.isArray(data)) return data;
  if (Array.isArray(data.items)) return data.items;
  if (Array.isArray(data.users)) return data.users;
  if (Array.isArray(data.results)) return data.results;

  return [];
}

export function normalizeUser(user) {
  const id = user?.id ?? user?.user_id ?? user?.key ?? user?.value ?? "";

  const label =
    user?.full_name ||
    user?.fullName ||
    user?.name ||
    user?.label ||
    user?.email ||
    "Без имени";

  const email = user?.email || "";

  return {
    id,
    value: String(id),
    label,
    name: label,
    full_name: label,
    email,
    position: user?.position || "",
    department: user?.department || "",
  };
}

export function normalizeUserValue(value) {
  if (!value) return "";

  if (typeof value === "object") {
    const normalized = normalizeUser(value);

    return {
      id: normalized.id,
      value: String(normalized.id),
      label: normalized.label,
      name: normalized.label,
      full_name: normalized.label,
      email: normalized.email,
    };
  }

  return String(value);
}

export function getUserSearchTokens(user) {
  const normalized = normalizeUser(user);
  const fullName = String(normalized.label || "").toLowerCase().trim();
  const email = String(normalized.email || "").toLowerCase().trim();

  return [fullName, email, ...fullName.split(/\s+/)]
    .filter(Boolean)
    .map((item) => item.trim());
}

export function isUserMatchedByQuery(user, query) {
  const normalizedQuery = String(query || "").toLowerCase().trim();

  if (!normalizedQuery) return true;

  return getUserSearchTokens(user).some((token) =>
    token.startsWith(normalizedQuery)
  );
}