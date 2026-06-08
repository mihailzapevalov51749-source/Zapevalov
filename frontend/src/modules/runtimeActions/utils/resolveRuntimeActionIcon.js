import { resolveActionTypeIcon } from "../../designer/components/actions/resolveActionTypeIcon.js";

const ICON_KEY_MAP = {
  create_record: "create_record",
  update_record: "update_record",
  delete_record: "delete_record",
  create_relation: "create_relation",
  delete_relation: "delete_relation",
};

export function resolveRuntimeActionIcon(action) {
  const iconKey = String(action?.icon_key || "").trim();
  const mappedKey = ICON_KEY_MAP[iconKey];

  if (mappedKey) {
    return resolveActionTypeIcon(mappedKey);
  }

  if (iconKey) {
    return null;
  }

  return resolveActionTypeIcon(action?.action_type_key);
}
