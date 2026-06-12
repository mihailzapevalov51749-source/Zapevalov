export function buildLoginCompanySubtitle(displayName) {
  const normalizedName = String(displayName || "").trim();

  if (!normalizedName) {
    return "Компания";
  }

  return `Компания «${normalizedName}»`;
}
