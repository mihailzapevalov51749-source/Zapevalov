import { useMemo } from "react";

import { LAYOUT_TOKENS } from "../../../layout/layoutTokens";
import AppSidebarRenderer from "../components/AppSidebarRenderer";
import {
  createDesignerSidebarPreviewContract,
  createRuntimeSidebarPreviewContract,
} from "../sidebarPreviewData";

import "./appSidebarRendererPreview.css";

import { APP_SIDEBAR_WIDTHS } from "../../shellSidebarGeometry";

/** AppSidebar target widths (220 expanded / 56 collapsed). */
const APP_SHELL_SIDEBAR_EXPANDED_WIDTH = APP_SIDEBAR_WIDTHS.expanded;
const APP_SHELL_SIDEBAR_COLLAPSED_WIDTH = APP_SIDEBAR_WIDTHS.collapsed;

const SHELL_CSS_VARIABLES = {
  "--sidebar-brand-logo-size": `${LAYOUT_TOKENS.sidebar.brandLogoSize}px`,
  "--sidebar-brand-title-font-size": `${LAYOUT_TOKENS.sidebar.brandTitleFontSize}px`,
  "--sidebar-brand-subtitle-font-size": `${LAYOUT_TOKENS.sidebar.brandSubtitleFontSize}px`,
  "--sidebar-menu-item-height": `${LAYOUT_TOKENS.sidebar.menuItemHeight}px`,
  "--sidebar-menu-item-icon-size": `${LAYOUT_TOKENS.sidebar.menuItemIconSize}px`,
  "--sidebar-menu-item-font-size": `${LAYOUT_TOKENS.sidebar.menuItemFontSize}px`,
  "--sidebar-menu-item-radius": `${LAYOUT_TOKENS.sidebar.menuItemRadius}px`,
  "--sidebar-menu-item-gap": `${LAYOUT_TOKENS.sidebar.menuItemGap}px`,
};

const PREVIEW_PANELS = [
  {
    id: "runtime-normal",
    label: "1. Runtime normal (editMode=false)",
    createContract: () =>
      createRuntimeSidebarPreviewContract({ collapsed: false, editMode: false }),
    frameWidth: APP_SHELL_SIDEBAR_EXPANDED_WIDTH,
    frameClassName: "",
  },
  {
    id: "runtime-edit-mode",
    label: "2. Runtime edit mode (hidden, system, drag, actions)",
    createContract: () =>
      createRuntimeSidebarPreviewContract({
        collapsed: false,
        editMode: true,
        menuScale: 1.1,
      }),
    frameWidth: APP_SHELL_SIDEBAR_EXPANDED_WIDTH,
    frameClassName: "",
  },
  {
    id: "runtime-collapsed",
    label: "3. Runtime collapsed",
    createContract: () =>
      createRuntimeSidebarPreviewContract({ collapsed: true, editMode: false }),
    frameWidth: APP_SHELL_SIDEBAR_COLLAPSED_WIDTH,
    frameClassName: "",
  },
  {
    id: "designer-normal",
    label: "4. Designer normal",
    createContract: () =>
      createDesignerSidebarPreviewContract({ collapsed: false }),
    frameWidth: APP_SHELL_SIDEBAR_EXPANDED_WIDTH,
    frameClassName: "app-sidebar-renderer-preview__frame--designer",
  },
  {
    id: "designer-collapsed",
    label: "5. Designer collapsed",
    createContract: () =>
      createDesignerSidebarPreviewContract({ collapsed: true }),
    frameWidth: APP_SHELL_SIDEBAR_COLLAPSED_WIDTH,
    frameClassName: "app-sidebar-renderer-preview__frame--designer",
  },
];

function PreviewPanel({ label, contract, frameWidth, frameClassName }) {
  return (
    <div className="app-sidebar-renderer-preview__panel">
      <p className="app-sidebar-renderer-preview__panel-label">{label}</p>
      <div
        className={[
          "app-sidebar-renderer-preview__frame",
          frameClassName,
        ]
          .filter(Boolean)
          .join(" ")}
        style={{
          width: `${frameWidth}px`,
          ...SHELL_CSS_VARIABLES,
        }}
      >
        <AppSidebarRenderer contract={contract} />
      </div>
    </div>
  );
}

/**
 * Dev-only isolated preview for AppSidebarRenderer (not used in Runtime/Designer shells).
 */
export default function AppSidebarRendererPreview() {
  const panels = useMemo(
    () =>
      PREVIEW_PANELS.map((panel) => ({
        ...panel,
        contract: panel.createContract(),
      })),
    []
  );

  return (
    <div className="app-sidebar-renderer-preview">
      <header className="app-sidebar-renderer-preview__header">
        <h1 className="app-sidebar-renderer-preview__title">
          AppSidebarRenderer — unified AppShell preview
        </h1>
        <p className="app-sidebar-renderer-preview__hint">
          One sidebar visual system ({APP_SHELL_SIDEBAR_EXPANDED_WIDTH}px /
          {APP_SHELL_SIDEBAR_COLLAPSED_WIDTH}px). Runtime and Designer differ only by
          subtitle, menu content, and active accent color. Not connected to
          production shells.
        </p>
      </header>

      <div className="app-sidebar-renderer-preview__grid">
        {panels.map((panel) => (
          <PreviewPanel
            key={panel.id}
            label={panel.label}
            contract={panel.contract}
            frameWidth={panel.frameWidth}
            frameClassName={panel.frameClassName}
          />
        ))}
      </div>
    </div>
  );
}
