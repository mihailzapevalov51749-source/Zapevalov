import {
  getLegacyStorageCreationNoticeMessage,
  isLegacyStorageBlockType,
} from "../../../shared/legacy";

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

    if (isLegacyStorageBlockType(widgetType)) {
      onError?.(getLegacyStorageCreationNoticeMessage());
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
      isLegacyStorageBlockType(widgetType) &&
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

    if (isLegacyStorageBlockType(widgetType)) {
      onError?.(getLegacyStorageCreationNoticeMessage());
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
