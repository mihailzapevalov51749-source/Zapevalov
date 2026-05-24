export default function useWidgetDragAndDrop({
  onAddSection,
  onAddBlockToSection,
  onError,
  isFlexibleSection,
}) {
  const getWidgetType = (event) => {
    return event.dataTransfer.getData("widget/type");
  };

  const getDropPoint = (event) => {
    return {
      clientX: event.clientX,
      clientY: event.clientY,
    };
  };

  const isTableWidget = (widgetType) => {
    return [
      "table",
      "universal_table",
      "tableBlock",
      "table_block",
    ].includes(widgetType);
  };

  const handlePageDragOver = (event) => {
    event.preventDefault();

    const widgetType = getWidgetType(event);

    if (!widgetType) return;

    event.dataTransfer.dropEffect = "copy";
  };

  const handlePageDrop = async (event) => {
    event.preventDefault();

    const widgetType = getWidgetType(event);

    if (!widgetType) return;

    if (widgetType === "section") {
      await onAddSection?.(getDropPoint(event));
      return;
    }

    if (isTableWidget(widgetType)) {
      onError?.("Таблицу можно добавлять только в гибкий раздел");
      return;
    }

    onError?.("Блоки можно добавлять только внутрь раздела");
  };

  const handleSectionDragOver = (event, sectionId) => {
    event.preventDefault();
    event.stopPropagation();

    const widgetType = getWidgetType(event);

    if (!widgetType) return;

    if (
      isTableWidget(widgetType) &&
      typeof isFlexibleSection === "function" &&
      !isFlexibleSection(sectionId)
    ) {
      event.dataTransfer.dropEffect = "none";
      return;
    }

    event.dataTransfer.dropEffect = "copy";
  };

  const handleSectionDrop = async (event, sectionId) => {
    event.preventDefault();
    event.stopPropagation();

    const widgetType = getWidgetType(event);

    if (!widgetType || !sectionId) return;

    if (widgetType === "section") {
      onError?.("Раздел нельзя добавить внутрь раздела");
      return;
    }

    if (
      isTableWidget(widgetType) &&
      typeof isFlexibleSection === "function" &&
      !isFlexibleSection(sectionId)
    ) {
      onError?.("Таблицу можно добавлять только в гибкий раздел");
      return;
    }

    await onAddBlockToSection?.(sectionId, widgetType, getDropPoint(event));
  };

  return {
    handlePageDragOver,
    handlePageDrop,
    handleSectionDragOver,
    handleSectionDrop,
  };
}