import { useEffect, useMemo, useRef, useState } from "react";

export const DEFAULT_ROW_CARD_SETTINGS = {
  width: 520,
  maxHeight: "80vh",
  layout: "one_column",
  titleMode: "default",
  customTitle: "",
  visibleColumnIds: [],
  columnOrder: [],

  sections: undefined,
  tabs: undefined,

  sidebar: {
    enabled: true,
  },

  fieldVisibility: {
    hiddenFieldIds: [],
  },
};

const normalizeIds = (value) => {
  if (!Array.isArray(value)) return [];

  return value
    .filter((id) => id !== null && id !== undefined && id !== "")
    .map((id) => String(id));
};

const normalizeSectionId = (id) => {
  if (id === "customFields") return "fields";
  return id;
};

const normalizeSectionType = (section) => {
  const id = normalizeSectionId(section?.id);
  const type = section?.type;

  if (id === "parent") return "parentRow";
  if (id === "main") return "mainFields";
  if (id === "fields") return "fieldsGrid";
  if (id === "tabs") return "tabs";
  if (id === "attachments") return "attachments";

  return type || "fieldsGrid";
};

const normalizeSection = (section, index) => {
  const config = section?.config || {};
  const id = normalizeSectionId(section?.id || `section_${index}`);

  const fieldIds = normalizeIds(
    section?.fieldIds ||
      config.fieldIds ||
      config.fields ||
      []
  );

  return {
    ...(section || {}),

    id,
    type: normalizeSectionType({
      ...(section || {}),
      id,
    }),

    visible: section?.visible !== false,
    enabled:
      section?.enabled !== false &&
      section?.visible !== false,

    order:
      typeof section?.order === "number"
        ? section.order
        : index,

    fieldIds,

    config: {
      ...config,
      fieldIds,
    },
  };
};

const normalizeSections = (sections) => {
  if (!Array.isArray(sections)) return undefined;

  const normalized = sections.map(normalizeSection);
  const result = [];
  const seen = new Set();

  normalized.forEach((section) => {
    if (!section?.id) return;
    if (seen.has(section.id)) return;

    seen.add(section.id);
    result.push(section);
  });

  return result.sort((a, b) => {
    const aOrder =
      typeof a?.order === "number" ? a.order : 0;

    const bOrder =
      typeof b?.order === "number" ? b.order : 0;

    return aOrder - bOrder;
  });
};

const normalizeTab = (tab, index) => {
  return {
    ...(tab || {}),

    id: tab?.id || `tab_${index}`,

    visible: tab?.visible !== false,
    enabled:
      tab?.enabled !== false &&
      tab?.visible !== false,

    order:
      typeof tab?.order === "number"
        ? tab.order
        : index,
  };
};

const normalizeTabs = (tabs) => {
  if (!Array.isArray(tabs)) return undefined;

  return tabs
    .map(normalizeTab)
    .sort((a, b) => {
      const aOrder =
        typeof a?.order === "number" ? a.order : 0;

      const bOrder =
        typeof b?.order === "number" ? b.order : 0;

      return aOrder - bOrder;
    });
};

export const normalizeRowCardSettings = (settings = {}) => {
  const source = settings || {};

  const normalized = {
    ...DEFAULT_ROW_CARD_SETTINGS,
    ...source,

    visibleColumnIds: normalizeIds(source.visibleColumnIds),
    columnOrder: normalizeIds(source.columnOrder),

    sidebar: {
      ...DEFAULT_ROW_CARD_SETTINGS.sidebar,
      ...(source.sidebar || {}),
      enabled: source.sidebar?.enabled !== false,
    },

    fieldVisibility: {
      ...(source.fieldVisibility || {}),
      hiddenFieldIds: normalizeIds(
        source.fieldVisibility?.hiddenFieldIds ||
          source.hiddenFieldIds ||
          []
      ),
    },
  };

  if (Array.isArray(source.sections)) {
    normalized.sections = normalizeSections(source.sections);
  }

  if (Array.isArray(source.tabs)) {
    normalized.tabs = normalizeTabs(source.tabs);
  }

  return normalized;
};

export default function useTableRowCard({
  rows = [],
  tableId,
  blockId,
  isInlineEditMode,
  closeColumnMenu,
}) {
  const shouldOpenCreatedRowCardRef = useRef(false);
  const previousRowIdsRef = useRef(new Set());

  const cardInstanceIdRef = useRef(
    `universal-table-row-card-${
      tableId || blockId || "unknown"
    }-${Date.now()}-${Math.random()}`
  );

  const [openedRowData, setOpenedRowData] = useState(null);

  const activeOpenedRow = useMemo(() => {
    if (!openedRowData?.rowId) return null;

    return (
      rows.find((row) => String(row.id) === String(openedRowData.rowId)) ||
      null
    );
  }, [rows, openedRowData]);

  const openRowCardByRow = (row, anchorRect = null) => {
    if (isInlineEditMode) return;
    if (!row?.id) return;

    closeColumnMenu?.();

    window.dispatchEvent(
      new CustomEvent("universal-table-row-card-opened", {
        detail: {
          instanceId: cardInstanceIdRef.current,
        },
      })
    );

    setOpenedRowData({
      rowId: row.id,
      anchorRect,
    });
  };

  const handleOpenRowCard = (row, event) => {
    if (isInlineEditMode) return;
    if (!row?.id) return;

    openRowCardByRow(
      row,
      event?.currentTarget?.getBoundingClientRect?.() || null
    );
  };

  const handleCloseRowCard = () => {
    setOpenedRowData(null);
  };

  const markShouldOpenCreatedRowCard = () => {
    shouldOpenCreatedRowCardRef.current = true;
  };

  const clearShouldOpenCreatedRowCard = () => {
    shouldOpenCreatedRowCardRef.current = false;
  };

  useEffect(() => {
    previousRowIdsRef.current = new Set(rows.map((row) => String(row.id)));
  }, []);

  useEffect(() => {
    if (!shouldOpenCreatedRowCardRef.current) {
      previousRowIdsRef.current = new Set(rows.map((row) => String(row.id)));
      return;
    }

    const previousRowIds = previousRowIdsRef.current;

    const createdRow =
      rows.find((row) => !previousRowIds.has(String(row.id))) ||
      rows[rows.length - 1] ||
      null;

    previousRowIdsRef.current = new Set(rows.map((row) => String(row.id)));

    if (!createdRow) return;

    shouldOpenCreatedRowCardRef.current = false;
    openRowCardByRow(createdRow);
  }, [rows]);

  useEffect(() => {
    const handleExternalRowCardOpen = (event) => {
      const openedInstanceId = event.detail?.instanceId;

      if (openedInstanceId !== cardInstanceIdRef.current) {
        setOpenedRowData(null);
      }
    };

    window.addEventListener(
      "universal-table-row-card-opened",
      handleExternalRowCardOpen
    );

    return () => {
      window.removeEventListener(
        "universal-table-row-card-opened",
        handleExternalRowCardOpen
      );
    };
  }, []);

  useEffect(() => {
    if (!openedRowData?.rowId) return;

    const rowExists = rows.some(
      (row) => String(row.id) === String(openedRowData.rowId)
    );

    if (!rowExists) {
      setOpenedRowData(null);
    }
  }, [rows, openedRowData]);

  useEffect(() => {
    if (isInlineEditMode) {
      setOpenedRowData(null);
    }
  }, [isInlineEditMode]);

  return {
    openedRowData,
    activeOpenedRow,

    openRowCardByRow,
    handleOpenRowCard,
    handleCloseRowCard,

    markShouldOpenCreatedRowCard,
    clearShouldOpenCreatedRowCard,
  };
}