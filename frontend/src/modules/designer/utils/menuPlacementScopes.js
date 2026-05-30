/** Navigation menu_scope values for object type placements (Phase 9.2b). */

export const MENU_PLACEMENT_SCOPE_DESIGNER = "designer";
export const MENU_PLACEMENT_SCOPE_RUNTIME = "runtime";

export const MENU_PLACEMENT_TARGET_OPTIONS = [
  {
    id: MENU_PLACEMENT_SCOPE_DESIGNER,
    label: "Студия",
    description: "Меню конструктора — /designer/.../data",
  },
  {
    id: MENU_PLACEMENT_SCOPE_RUNTIME,
    label: "Офис",
    description: "Рабочее меню портала — /portal/.../object-types/...",
  },
];
