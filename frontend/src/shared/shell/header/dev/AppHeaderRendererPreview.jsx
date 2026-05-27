import { useMemo } from "react";

import AppHeaderRenderer from "../components/AppHeaderRenderer";
import {
  createDesignerHeaderEditModePreviewContract,
  createDesignerHeaderNormalPreviewContract,
  createRuntimeHeaderEditTitlePreviewContract,
  createRuntimeHeaderNormalPreviewContract,
  createRuntimeHeaderSearchNotificationsPreviewContract,
} from "../headerPreviewData";

import "./appHeaderRendererPreview.css";

const PREVIEW_PANELS = [
  {
    id: "runtime-normal",
    label: "1. Runtime normal",
    createContract: createRuntimeHeaderNormalPreviewContract,
  },
  {
    id: "runtime-edit-title",
    label: "2. Runtime edit title",
    createContract: createRuntimeHeaderEditTitlePreviewContract,
  },
  {
    id: "runtime-search-notifications",
    label: "3. Runtime search + notifications",
    createContract: createRuntimeHeaderSearchNotificationsPreviewContract,
  },
  {
    id: "designer-normal",
    label: "4. Designer normal",
    createContract: createDesignerHeaderNormalPreviewContract,
  },
  {
    id: "designer-edit-mode",
    label: "5. Designer edit mode",
    createContract: createDesignerHeaderEditModePreviewContract,
  },
];

export default function AppHeaderRendererPreview() {
  const panels = useMemo(
    () =>
      PREVIEW_PANELS.map((panel) => ({
        ...panel,
        contract: panel.createContract(),
      })),
    []
  );

  return (
    <div className="app-header-renderer-preview">
      <div className="app-header-renderer-preview__intro">
        <h1 className="app-header-renderer-preview__title">
          AppHeaderRenderer — foundation preview
        </h1>
        <p className="app-header-renderer-preview__hint">
          Full-width header bars for visual contract validation. Runtime and
          Designer differ by mode label and accent only. Not connected to
          production shells.
        </p>
      </div>

      <div className="app-header-renderer-preview__list">
        {panels.map((panel) => (
          <section key={panel.id}>
            <p className="app-header-renderer-preview__panel-label">
              {panel.label}
            </p>
            <div className="app-header-renderer-preview__bar-wrap">
              <AppHeaderRenderer contract={panel.contract} />
            </div>
            <div className="app-header-renderer-preview__workspace" />
          </section>
        ))}
      </div>
    </div>
  );
}
