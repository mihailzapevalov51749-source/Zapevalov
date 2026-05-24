import { useEffect, useRef } from "react";

import UniversalTableModals from "../core/UniversalTableModals";

import useUniversalTableController from "../../hooks/useUniversalTableController";
import { useUniversalViews } from "../../hooks/useUniversalViews";

import UniversalViewRenderer from "../views/UniversalViewRenderer";
import UniversalViewsBar from "../views/UniversalViewsBar";

export default function UniversalTableView(props) {
  const controller = useUniversalTableController(props);

  const didApplyDefaultViewRef = useRef(false);

  const {
    rootProps,
    modalsProps,

    table,
    block,
    rows,
    columns,
    fields,

    isLoading,

    onRowOpen,
    onRowCreate,
    onRowUpdate,
    onRowDelete,
  } = controller;

  const resolvedTable = table || props?.table;
  const resolvedBlock = block || props?.block;

  const tableId =
    props?.table?.id ||
    props?.block?.table_id ||
    props?.block?.tableId ||
    props?.block?.settings?.table_id ||
    props?.block?.settings?.tableId ||
    table?.id ||
    block?.table_id ||
    block?.tableId ||
    null;

  const defaultViewId =
    resolvedTable?.settings?.defaultViewId ||
    resolvedTable?.settings?.default_view_id ||
    resolvedBlock?.settings?.defaultViewId ||
    resolvedBlock?.settings?.default_view_id ||
    null;

  const viewsManagePopoverLayout =
    resolvedBlock?.settings?.viewsManagePopoverLayout ||
    resolvedBlock?.settings?.views_manage_popover_layout ||
    resolvedTable?.settings?.viewsManagePopoverLayout ||
    resolvedTable?.settings?.views_manage_popover_layout ||
    null;

  const {
    views,
    activeView,
    activeViewId,

    isLoadingViews,

    setActiveViewId,

    createView,
    updateView,
    reorderViews,
    deleteView,
  } = useUniversalViews(tableId);

  async function handleCreateView(payload = {}) {
    try {
      await createView({
        name: payload.name || `Представление ${views.length + 1}`,
        type: payload.type || "table",
        settings: payload.settings || {},
      });
    } catch (error) {
      console.error(error);
    }
  }

  async function handleViewRename(viewId, nextName) {
    if (!viewId || !nextName) return;

    try {
      await updateView(viewId, {
        name: nextName,
      });
    } catch (error) {
      console.error(error);
    }
  }

  async function handleViewSettingsSave(viewId, payload = {}) {
    if (!viewId) return;

    try {
      await updateView(viewId, payload);
    } catch (error) {
      console.error(error);
    }
  }

  async function handleDefaultViewChange(viewId) {
    if (!viewId) return;

    try {
      didApplyDefaultViewRef.current = true;

      setActiveViewId(viewId);

      if (typeof props?.onTableUpdated === "function" && resolvedTable?.id) {
        await props.onTableUpdated({
          ...resolvedTable,
          settings: {
            ...(resolvedTable?.settings || {}),
            defaultViewId: viewId,
          },
        });

        return;
      }

      if (typeof props?.onBlockUpdated === "function" && resolvedBlock?.id) {
        await props.onBlockUpdated({
          ...resolvedBlock,
          settings: {
            ...(resolvedBlock?.settings || {}),
            defaultViewId: viewId,
          },
        });
      }
    } catch (error) {
      console.error(error);
    }
  }

  async function handleViewsManagePopoverLayoutSave(layout) {
    if (!layout) return;

    const nextLayout = {
      top: Number(layout.top) || 260,
      left: Number(layout.left) || 260,
      width: Number(layout.width) || 280,
      height: Number(layout.height) || 360,
    };

    try {
      if (typeof props?.onTableUpdated === "function" && resolvedTable?.id) {
        await props.onTableUpdated({
          ...resolvedTable,
          settings: {
            ...(resolvedTable?.settings || {}),
            viewsManagePopoverLayout: nextLayout,
          },
        });

        return;
      }

      if (typeof props?.onBlockUpdated === "function" && resolvedBlock?.id) {
        await props.onBlockUpdated({
          ...resolvedBlock,
          settings: {
            ...(resolvedBlock?.settings || {}),
            viewsManagePopoverLayout: nextLayout,
          },
        });
      }
    } catch (error) {
      console.error(error);
    }
  }

  async function handleViewDelete(viewId) {
    if (!viewId) return;

    try {
      await deleteView(viewId);
    } catch (error) {
      console.error(error);
    }
  }

  async function handleViewVisibilityToggle(viewId, nextVisible) {
    if (!viewId) return;

    try {
      await updateView(viewId, {
        is_visible: nextVisible,
      });

      if (String(activeViewId) === String(viewId) && !nextVisible) {
        const nextVisibleView = views.find(
          (view) =>
            String(view.id) !== String(viewId) && view.is_visible !== false
        );

        setActiveViewId(nextVisibleView?.id || null);
      }
    } catch (error) {
      console.error(error);
    }
  }

  async function handleViewsReorder(nextViews = []) {
    try {
      await reorderViews(nextViews);
    } catch (error) {
      console.error(error);
    }
  }

  useEffect(() => {
    didApplyDefaultViewRef.current = false;
  }, [tableId]);

  useEffect(() => {
    if (didApplyDefaultViewRef.current) return;
    if (isLoadingViews) return;
    if (!views.length) return;

    if (!defaultViewId) {
      didApplyDefaultViewRef.current = true;

      const defaultView = views.find((view) => view.is_default) || views[0];

      if (defaultView?.id) {
        setActiveViewId(defaultView.id);
      }

      return;
    }

    const defaultView = views.find(
      (view) =>
        String(view.id) === String(defaultViewId) &&
        view.is_visible !== false
    );

    didApplyDefaultViewRef.current = true;

    if (defaultView?.id) {
      setActiveViewId(defaultView.id);
      return;
    }

    const fallbackView = views.find((view) => view.is_default) || views[0];

    setActiveViewId(fallbackView?.id || null);
  }, [defaultViewId, isLoadingViews, setActiveViewId, tableId, views]);

  useEffect(() => {
    if (!tableId) return;
    if (!activeView) return;

    window.dispatchEvent(
      new CustomEvent("universal-view:active-changed", {
        detail: {
          tableId,
          blockId: props?.block?.id || block?.id || null,
          viewType: activeView?.type || "table",
          viewId: activeView?.id || null,
        },
      })
    );
  }, [
    tableId,
    props?.block?.id,
    block?.id,
    activeView?.id,
    activeView?.type,
  ]);

  function renderViewsBar() {
    return (
      <UniversalViewsBar
        views={views}
        fields={fields}
        activeViewId={activeViewId}
        defaultViewId={defaultViewId}
        viewsManagePopoverLayout={viewsManagePopoverLayout}
        isLoadingViews={isLoadingViews}
        onSelectView={setActiveViewId}
        onCreateView={handleCreateView}
        onViewRename={handleViewRename}
        onViewVisibilityToggle={handleViewVisibilityToggle}
        onViewsReorder={handleViewsReorder}
        onViewSettingsSave={handleViewSettingsSave}
        onDefaultViewChange={handleDefaultViewChange}
        onViewsManagePopoverLayoutSave={handleViewsManagePopoverLayoutSave}
        onViewDelete={handleViewDelete}
      />
    );
  }

  if (isLoading || isLoadingViews) {
    return (
      <div style={styles.wrapper}>
        <div style={styles.loadingView}>Загрузка...</div>
      </div>
    );
  }

  if (!activeView) {
    return (
      <div style={styles.wrapper}>
        <div style={styles.loadingView}>Представления не найдены</div>
      </div>
    );
  }

  return (
    <div style={styles.wrapper}>
      <div style={styles.viewsBarContainer}>{renderViewsBar()}</div>

      <div
        {...rootProps}
        style={{
          ...(rootProps?.style || {}),

          flex: 1,
          minHeight: 0,
          width: "100%",

          display: "flex",
          flexDirection: "column",

          borderTopLeftRadius: 0,
          borderTopRightRadius: 0,

          borderTop: "none",
          borderLeft: "none",
          borderRight: "none",
          borderBottom: "none",

          boxShadow: "none",
          outline: "none",

          overflow: "hidden",

          background: "transparent",
        }}
      >
        <div style={styles.viewContent}>
          <UniversalViewRenderer
            view={activeView}
            table={resolvedTable}
            block={resolvedBlock}
            rows={rows}
            columns={columns}
            fields={fields}
            controller={controller}
            onBlockUpdated={props.onBlockUpdated}
            onViewUpdate={handleViewSettingsSave}
            onViewSettingsSave={handleViewSettingsSave}
            onRowOpen={onRowOpen}
            onRowCreate={onRowCreate}
            onRowUpdate={onRowUpdate}
            onRowDelete={onRowDelete}
          />
        </div>

        <UniversalTableModals {...modalsProps} />
      </div>
    </div>
  );
}

const styles = {
  wrapper: {
    width: "100%",
    height: "100%",
    minHeight: 0,

    display: "flex",
    flexDirection: "column",

    overflow: "hidden",

    background: "transparent",

    border: "none",
    boxShadow: "none",
    outline: "none",
  },

  viewsBarContainer: {
    position: "relative",
    zIndex: 10,

    flexShrink: 0,

    background: "transparent",

    border: "none",
    boxShadow: "none",
    outline: "none",

    overflow: "visible",
  },

  viewContent: {
    width: "100%",
    flex: 1,
    minHeight: 0,

    position: "relative",
    zIndex: 1,

    display: "flex",
    flexDirection: "column",

    overflow: "hidden",

    background: "transparent",

    border: "none",
    boxShadow: "none",
    outline: "none",
  },

  loadingView: {
    padding: "24px 20px",

    fontSize: 13,
    fontWeight: 600,

    color: "#64748B",
  },
};