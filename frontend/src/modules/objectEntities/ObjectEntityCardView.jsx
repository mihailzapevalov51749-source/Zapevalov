import { useCallback, useEffect, useMemo, useState } from "react";

import { EntityCardLayout } from "../../shared/entityCardShell";

import ObjectEntityCardHeader from "./components/ObjectEntityCardHeader";
import ObjectEntityCardSections from "./components/ObjectEntityCardSections";
import ObjectEntityCardSettingsPanel from "./components/ObjectEntityCardSettingsPanel";
import ObjectEntityComments from "./components/ObjectEntityComments";
import useObjectEntityRelations from "./hooks/useObjectEntityRelations";
import {
  buildDefaultObjectEntityCardUtLayout,
  isValidObjectEntityCardLayout,
  normalizeObjectEntityCardUtLayout,
  OBJECT_ENTITY_SECTION_TYPES,
  resolveVisibleUtSections,
} from "./services/objectEntityCardSectionsLayout";

export default function ObjectEntityCardView({
  mode = "edit",
  cardModel,
  formValues = {},
  fieldErrors = {},
  onFieldChange,
  onClose,
  onSave,
  submitting = false,
  submitError = "",
  initialContext = null,
  catalog = null,
  onEntityUpdated = null,
  cardLayout = null,
  canConfigureCard = false,
  onSaveCardLayout = null,
  cardSettingsSaving = false,
  onOpenRelatedEntity = null,
}) {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const utLayout = useMemo(() => {
    const normalized = normalizeObjectEntityCardUtLayout(
      cardLayout,
      cardModel?.editableFields || [],
      cardModel?.titleFieldKey || null,
    );

    if (!isValidObjectEntityCardLayout(normalized)) {
      return buildDefaultObjectEntityCardUtLayout(
        cardModel?.editableFields || [],
        cardModel?.titleFieldKey || null,
      );
    }

    return normalized;
  }, [cardLayout, cardModel?.editableFields, cardModel?.titleFieldKey]);

  const visibleSections = useMemo(
    () => resolveVisibleUtSections(utLayout),
    [utLayout],
  );

  const relationsTabEnabled = useMemo(
    () =>
      visibleSections.some(
        (section) =>
          section.type === OBJECT_ENTITY_SECTION_TYPES.tabs &&
          (section.tabIds || []).includes("relations"),
      ),
    [visibleSections],
  );

  const relationsState = useObjectEntityRelations({
    tenantId: cardModel?.tenantId,
    objectTypeKey: cardModel?.objectTypeKey,
    entityId: cardModel?.entityId,
    catalog,
    enabled: Boolean(cardModel?.entityId) && relationsTabEnabled,
  });

  const handleOpenRelatedEntity = useCallback(
    ({ entityId, objectTypeKey }) => {
      if (!entityId) {
        return;
      }

      onOpenRelatedEntity?.({
        entityId,
        objectTypeKey: objectTypeKey || cardModel?.objectTypeKey,
      });
    },
    [onOpenRelatedEntity, cardModel?.objectTypeKey],
  );

  const handleCloseCardSettings = useCallback(() => {
    setIsSettingsOpen(false);
  }, []);

  const handleSaveCardSettings = useCallback(
    async (nextLayout) => {
      const saved = await onSaveCardLayout?.(nextLayout);

      if (saved !== false) {
        setIsSettingsOpen(false);
      }
    },
    [onSaveCardLayout],
  );

  if (!cardModel) {
    return null;
  }

  const isCreate = mode === "create" || Boolean(cardModel.isCreate);
  const canSaveEntity = cardModel.editableFields.length > 0;
  const showCardSettings =
    !isCreate && canConfigureCard && typeof onSaveCardLayout === "function";

  const layoutForSections = {
    ...utLayout,
    sections: visibleSections,
  };

  return (
    <>
      <EntityCardLayout
        resetScrollKey={cardModel.entityId || "create"}
        header={
            <ObjectEntityCardHeader
              entityId={cardModel.entityId}
              createTitle={cardModel.createTitle}
              isCreate={isCreate}
              onClose={onClose}
              onBack={onClose}
              onOpenSettings={
                showCardSettings ? () => setIsSettingsOpen(true) : null
              }
              onSave={onSave}
              submitting={submitting}
              canSave={canSaveEntity}
            />
          }
          content={
            <ObjectEntityCardSections
              isCreate={isCreate}
              cardModel={cardModel}
              catalog={catalog}
              formValues={formValues}
              fieldErrors={fieldErrors}
              onFieldChange={onFieldChange}
              onEntityUpdated={onEntityUpdated}
              initialContext={initialContext}
              utLayout={layoutForSections}
              relationsState={relationsState}
              onOpenRelatedEntity={handleOpenRelatedEntity}
              parentContext={null}
              submitting={submitting}
              submitError={submitError}
            />
          }
          sidebar={
            <ObjectEntityComments
              runtimeEntityId={cardModel.entityId}
              isCreate={isCreate}
              initialContext={initialContext}
            />
          }
        />

      {showCardSettings ? (
        <ObjectEntityCardSettingsPanel
          open={isSettingsOpen}
          editableFields={cardModel.editableFields}
          titleFieldKey={cardModel.titleFieldKey}
          initialLayout={utLayout}
          onClose={handleCloseCardSettings}
          onSave={handleSaveCardSettings}
          saving={cardSettingsSaving}
          canCustomizeLayout={canConfigureCard}
        />
      ) : null}
    </>
  );
}
