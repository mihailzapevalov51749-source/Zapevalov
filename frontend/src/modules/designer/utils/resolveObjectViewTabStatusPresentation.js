import { resolveObjectViewTabStatusLabel } from "./resolveObjectViewTabStatusLabel.js";

const STATUS_CLASS_BY_KEY = {
  published: "designer-pages-badge designer-pages-badge--published",
  draft: "designer-pages-badge designer-pages-badge--draft",
  hidden: "designer-pages-badge designer-pages-badge--hidden",
};

/**
 * Maps view tab status to platform pages badge classes (designer-pages-badge).
 *
 * @param {Parameters<typeof resolveObjectViewTabStatusLabel>[0]} params
 */
export function resolveObjectViewTabStatusPresentation(params = {}) {
  const label = resolveObjectViewTabStatusLabel(params);

  if (!label) {
    return { label: "", status: "", className: "" };
  }

  let status = "draft";

  if (label === "Опубликовано") {
    status = "published";
  } else if (label === "Скрыто") {
    status = "hidden";
  } else if (label === "Черновик" || label === "Опубликовано + черновик") {
    status = "draft";
  }

  return {
    label,
    status,
    className: STATUS_CLASS_BY_KEY[status] || STATUS_CLASS_BY_KEY.draft,
  };
}
