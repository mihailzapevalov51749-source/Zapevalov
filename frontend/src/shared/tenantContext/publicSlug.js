const CYRILLIC_TO_LATIN = {
  а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ё: "e",
  ж: "zh", з: "z", и: "i", й: "y", к: "k", л: "l", м: "m",
  н: "n", о: "o", п: "p", р: "r", с: "s", т: "t", у: "u",
  ф: "f", х: "h", ц: "ts", ч: "ch", ш: "sh", щ: "sch",
  ъ: "", ы: "y", ь: "", э: "e", ю: "yu", я: "ya",
};

export function normalizePublicSlug(value) {
  return String(value || "").trim().toLowerCase();
}

export function slugifyPublicSlug(value) {
  const transliterated = String(value || "")
    .trim()
    .toLowerCase()
    .split("")
    .map((char) => CYRILLIC_TO_LATIN[char] ?? char)
    .join("");

  let slug = transliterated.replace(/[^a-z0-9]+/g, "-").replace(/-+/g, "-");
  slug = slug.replace(/^-+|-+$/g, "");
  if (!slug) {
    return "company";
  }
  if (slug.length > 63) {
    slug = slug.slice(0, 63).replace(/-+$/g, "");
  }
  return slug || "company";
}

export function buildPublicCompanyUrl(publicSlug, options = {}) {
  const normalized = normalizePublicSlug(publicSlug);
  if (!normalized) {
    return "";
  }

  const configuredBase = String(
    options.baseUrl || import.meta.env.VITE_PORTAL_PUBLIC_BASE_URL || "",
  ).trim();
  const base = (configuredBase || (typeof window !== "undefined" ? window.location.origin : ""))
    .replace(/\/$/, "");
  return `${base}/${normalized}`;
}
