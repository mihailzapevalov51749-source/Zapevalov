const VIEW_KEY_PATTERN = /^[a-z][a-z0-9_]{2,63}$/;

const CYRILLIC_TO_LATIN = {
  а: "a",
  б: "b",
  в: "v",
  г: "g",
  д: "d",
  е: "e",
  ё: "e",
  ж: "zh",
  з: "z",
  и: "i",
  й: "y",
  к: "k",
  л: "l",
  м: "m",
  н: "n",
  о: "o",
  п: "p",
  р: "r",
  с: "s",
  т: "t",
  у: "u",
  ф: "f",
  х: "h",
  ц: "ts",
  ч: "ch",
  ш: "sh",
  щ: "sch",
  ъ: "",
  ы: "y",
  ь: "",
  э: "e",
  ю: "yu",
  я: "ya",
};

function transliterate(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .split("")
    .map((char) => CYRILLIC_TO_LATIN[char] ?? char)
    .join("");
}

function slugifyBase(name) {
  const transliterated = transliterate(name);

  return transliterated
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .replace(/_+/g, "_");
}

/**
 * @param {string} name
 * @param {string[]} existingKeys
 * @returns {string}
 */
export function generateViewKey(name, existingKeys = []) {
  const used = new Set(
    (existingKeys || []).map((item) => String(item || "").trim()).filter(Boolean),
  );

  let base = slugifyBase(name);

  if (!base || base.length < 3 || !/^[a-z]/.test(base)) {
    base = `view_${Date.now().toString(36).slice(-8)}`;
  }

  if (base.length > 63) {
    base = base.slice(0, 63).replace(/_+$/g, "");
  }

  let candidate = base;
  let counter = 2;

  while (used.has(candidate)) {
    const suffix = `_${counter}`;
    const trimmedBase = base.slice(0, Math.max(3, 63 - suffix.length)).replace(/_+$/g, "");
    candidate = `${trimmedBase}${suffix}`;
    counter += 1;
  }

  if (!VIEW_KEY_PATTERN.test(candidate)) {
    candidate = `view_${Date.now().toString(36).slice(-8)}`;
    while (used.has(candidate)) {
      candidate = `view_${Date.now().toString(36).slice(-8)}_${counter}`;
      counter += 1;
    }
  }

  return candidate;
}
