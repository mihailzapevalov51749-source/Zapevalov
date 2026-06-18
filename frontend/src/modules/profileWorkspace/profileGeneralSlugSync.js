import { slugifyPublicSlug } from "../../shared/tenantContext/publicSlug.js";

export function applyProfileGeneralSlugSync(previous, key, value) {
  const next = { ...previous, [key]: value };

  if (key === "platformShortName" && !previous.publicSlugLocked) {
    next.publicSlug = slugifyPublicSlug(value);
  }

  if (key === "publicSlug") {
    next.publicSlugLocked = true;
  }

  return next;
}
