import { useState } from "react";

import { Outlet } from "react-router-dom";



import { useDesignerShell } from "../../context/DesignerShellContext";

import { LAYOUT_MODES } from "../../../../shared/layout/layoutModes";
import { LAYOUT_TOKENS } from "../../../../shared/layout/layoutTokens";
import { resolveSidebarWidth } from "../../../../shared/layout/shellGeometry";

import { TRANSITION_TOKENS } from "../../../../shared/layout/transitionTokens";



import DesignerHeader from "./DesignerHeader";

import DesignerSidebar from "./DesignerSidebar";



import "../../styles/designer.css";



const DESIGNER_SIDEBAR_COLLAPSED_KEY = "yasnopro-designer-sidebar-collapsed";



function getInitialDesignerSidebarCollapsed() {

  try {

    return localStorage.getItem(DESIGNER_SIDEBAR_COLLAPSED_KEY) === "true";

  } catch {

    return false;

  }

}



export default function DesignerShell() {

  const { tenantId, user } = useDesignerShell();

  const [sidebarCollapsed, setSidebarCollapsed] = useState(

    getInitialDesignerSidebarCollapsed

  );



  const sidebarWidth = resolveSidebarWidth({

    mode: LAYOUT_MODES.DESIGNER,

    collapsed: sidebarCollapsed,

  });



  const handleToggleSidebarCollapse = () => {

    setSidebarCollapsed((prev) => {

      const next = !prev;

      try {

        localStorage.setItem(DESIGNER_SIDEBAR_COLLAPSED_KEY, String(next));

      } catch {

        // ignore storage errors

      }

      return next;

    });

  };



  return (

    <div className="designer-root">

      <div

        className="designer-shell"

        style={{

          "--designer-sidebar-current-width": `${sidebarWidth}px`,
          "--designer-sidebar-transition": TRANSITION_TOKENS.shell.sidebarWidth,
          "--sidebar-brand-logo-size": `${LAYOUT_TOKENS.sidebar.brandLogoSize}px`,
          "--sidebar-brand-title-font-size": `${LAYOUT_TOKENS.sidebar.brandTitleFontSize}px`,
          "--sidebar-brand-subtitle-font-size": `${LAYOUT_TOKENS.sidebar.brandSubtitleFontSize}px`,
          "--sidebar-menu-item-height": `${LAYOUT_TOKENS.sidebar.menuItemHeight}px`,
          "--sidebar-menu-item-icon-size": `${LAYOUT_TOKENS.sidebar.menuItemIconSize}px`,
          "--sidebar-menu-item-font-size": `${LAYOUT_TOKENS.sidebar.menuItemFontSize}px`,
          "--sidebar-menu-item-radius": `${LAYOUT_TOKENS.sidebar.menuItemRadius}px`,
          "--sidebar-menu-item-gap": `${LAYOUT_TOKENS.sidebar.menuItemGap}px`,
        }}

      >

        <DesignerSidebar

          collapsed={sidebarCollapsed}

          onToggleCollapse={handleToggleSidebarCollapse}

        />



        <div className="designer-shell__main">

          <DesignerHeader tenantId={tenantId} user={user} />



          <main className="designer-shell__content">

            <div className="designer-shell__scroll">

              <Outlet />

            </div>

          </main>

        </div>

      </div>

    </div>

  );

}


