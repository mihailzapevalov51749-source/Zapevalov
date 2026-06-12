export function resolvePlatformOwnerStatusLabel(isActive) {
  if (isActive === true) {
    return "Активен";
  }
  if (isActive === false) {
    return "Неактивен";
  }
  return "—";
}

export function mapApiOwnerToForm(owner = null) {
  if (!owner?.exists && !owner?.email) {
    return {
      fullName: "",
      email: "",
      phone: "",
      position: "",
      avatar_url: "",
      avatar_settings: { x: 0, y: 0, scale: 1 },
      password: "",
      password_confirm: "",
      exists: false,
      userId: null,
      isActive: null,
      statusLabel: "—",
    };
  }

  const isActive =
    owner.is_active === undefined || owner.is_active === null
      ? null
      : Boolean(owner.is_active);

  return {
    fullName: owner.full_name || "",
    email: owner.email || "",
    phone: owner.phone || "",
    position: owner.position || "",
    avatar_url: owner.avatar_url || "",
    avatar_settings: owner.avatar_settings || { x: 0, y: 0, scale: 1 },
    password: "",
    password_confirm: "",
    exists: Boolean(owner.exists),
    userId: owner.user_id ?? null,
    isActive,
    statusLabel: resolvePlatformOwnerStatusLabel(isActive),
  };
}

export function mapOwnerFormToApi(form = {}) {
  return {
    full_name: String(form.fullName || "").trim(),
    email: String(form.email || "").trim(),
    phone: String(form.phone || "").trim() || null,
    position: String(form.position || "").trim() || null,
    password: form.password ? String(form.password) : null,
    password_confirm: form.password_confirm ? String(form.password_confirm) : null,
  };
}
