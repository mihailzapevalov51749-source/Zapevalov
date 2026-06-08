import {
  Bell,
  Database,
  FilePlus,
  Link2,
  Pencil,
  Sparkles,
  Trash2,
  Unlink,
  Workflow,
  Zap,
} from "lucide-react";

const ACTION_TYPE_ICONS = {
  create_record: FilePlus,
  update_record: Pencil,
  delete_record: Trash2,
  create_relation: Link2,
  delete_relation: Unlink,
};

const CATEGORY_ICONS = {
  crud: Database,
  relations: Link2,
  notifications: Bell,
  automation: Zap,
  ai: Sparkles,
  bpmn: Workflow,
};

export function resolveActionTypeIcon(actionTypeKey) {
  const normalizedKey = String(actionTypeKey || "").trim();
  return ACTION_TYPE_ICONS[normalizedKey] || FilePlus;
}

export function resolveActionCategoryIcon(categoryKey) {
  const normalizedKey = String(categoryKey || "").trim();
  return CATEGORY_ICONS[normalizedKey] || Database;
}
