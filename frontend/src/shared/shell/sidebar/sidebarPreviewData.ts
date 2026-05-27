import type { AppSidebarContract } from "./sidebarContracts";
import {
  createDesignerSidebarContract,
  createRuntimeSidebarContract,
} from "./sidebarAdapters";

export type SidebarPreviewOptions = {
  collapsed?: boolean;
  onToggleCollapse?: () => void;
  editMode?: boolean;
  menuScale?: number;
};

const RUNTIME_PREVIEW_ACTIVE_PATH = "/runtime/home";

const RUNTIME_PREVIEW_NAVIGATION = [
  {
    id: "runtime-home",
    title: "Главная",
    type: "page",
    path: "/runtime/home",
    is_expanded: true,
    children: [
      {
        id: "runtime-visible-child",
        title: "Договоры",
        type: "page",
        path: "/runtime/contracts",
        is_expanded: true,
      },
      {
        id: "runtime-hidden-child",
        title: "Скрытый пункт",
        type: "page",
        path: "/runtime/hidden",
        is_visible: false,
      },
    ],
  },
  {
    id: "runtime-documents",
    title: "Документы",
    type: "document_library",
    path: "/runtime/documents",
    is_expanded: true,
    children: [
      {
        id: "runtime-doc-sub",
        title: "Подраздел",
        type: "table",
        path: "/runtime/documents/sub",
        is_expanded: true,
      },
    ],
  },
  {
    id: "runtime-tasks",
    title: "Мои задачи",
    type: "system_page",
    route: "/runtime/tasks",
    path: "/runtime/tasks",
  },
  {
    id: "runtime-reports",
    title: "Отчеты",
    type: "universal_table",
    path: "/runtime/reports",
  },
  {
    id: "runtime-custom-section",
    title: "Пользовательский раздел",
    type: "page",
    path: "/runtime/custom",
    is_expanded: false,
    children: [
      {
        id: "runtime-custom-child",
        title: "Вложенный пункт",
        type: "page",
        path: "/runtime/custom/child",
      },
    ],
  },
];

function resolvePreviewOptions(options: SidebarPreviewOptions = {}) {
  return {
    collapsed: options.collapsed ?? false,
    onToggleCollapse: options.onToggleCollapse ?? (() => {}),
    editMode: options.editMode ?? false,
    menuScale: options.menuScale ?? 1,
  };
}

/**
 * Preview contract built through the real Runtime adapter + mock navigation.
 */
export function createRuntimeSidebarPreviewContract(
  options: SidebarPreviewOptions = {}
): AppSidebarContract {
  const { collapsed, onToggleCollapse, editMode, menuScale } =
    resolvePreviewOptions(options);

  return createRuntimeSidebarContract({
    collapsed,
    onToggleCollapse,
    navigationItems: RUNTIME_PREVIEW_NAVIGATION,
    activePath: RUNTIME_PREVIEW_ACTIVE_PATH,
    isEditMode: editMode,
    menuScale,
  });
}

/**
 * Preview contract built through the real Designer adapter.
 */
export function createDesignerSidebarPreviewContract(
  options: SidebarPreviewOptions = {}
): AppSidebarContract {
  const { collapsed, onToggleCollapse } = resolvePreviewOptions(options);

  return createDesignerSidebarContract({
    collapsed,
    onToggleCollapse,
    activeKey: "objects",
  });
}
