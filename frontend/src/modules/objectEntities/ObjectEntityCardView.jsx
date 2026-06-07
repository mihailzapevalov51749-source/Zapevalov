import { useCallback, useMemo, useState } from "react";



import { EntityCardLayout } from "../../shared/entityCardShell";



import ObjectEntityCardHeader from "./components/ObjectEntityCardHeader";

import ObjectEntityCardSections from "./components/ObjectEntityCardSections";

import ObjectEntityCardSettingsPanel from "./components/ObjectEntityCardSettingsPanel";

import ObjectEntityComments from "./components/ObjectEntityComments";

import { resolveRuntimeQuickCreateFields } from "../objectViews/entity/resolveActiveQuickFormView";

import { getFileFieldsFromCatalog } from "./services/getFileFieldsFromCatalog";

import useObjectEntityRelations from "./hooks/useObjectEntityRelations";

import useObjectEntityParentContext from "./hooks/useObjectEntityParentContext";

import {

  buildDefaultObjectEntityCardUtLayout,

  isValidObjectEntityCardLayout,

  normalizeObjectEntityCardUtLayout,

  isCommentsSectionVisible,

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

  onBeginCreateSubtask = null,

  subtasksReloadToken = 0,

}) {

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);



  const isCreate = mode === "create" || Boolean(cardModel?.isCreate);

  const canSaveEntity = useMemo(
    () => resolveRuntimeQuickCreateFields(catalog, cardModel?.objectTypeKey).length > 0,
    [catalog, cardModel?.objectTypeKey],
  );



  const catalogFileFieldKeys = useMemo(

    () =>

      getFileFieldsFromCatalog(catalog, cardModel?.objectTypeKey).map(

        (field) => field.key,

      ),

    [catalog, cardModel?.objectTypeKey],

  );



  const utLayout = useMemo(() => {

    const normalized = normalizeObjectEntityCardUtLayout(

      cardLayout,

      cardModel?.editableFields || [],

      cardModel?.titleFieldKey || null,

      catalogFileFieldKeys,

    );



    if (!isValidObjectEntityCardLayout(normalized)) {

      return buildDefaultObjectEntityCardUtLayout(

        cardModel?.editableFields || [],

        cardModel?.titleFieldKey || null,

      );

    }



    return normalized;

  }, [

    cardLayout,

    cardModel?.editableFields,

    cardModel?.titleFieldKey,

    catalogFileFieldKeys,

  ]);



  const visibleSections = useMemo(

    () => resolveVisibleUtSections(utLayout),

    [utLayout],

  );



  const showCommentsSidebar = useMemo(

    () => isCommentsSectionVisible(utLayout),

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



  const parentSectionEnabled = useMemo(

    () =>

      visibleSections.some(

        (section) => section.type === OBJECT_ENTITY_SECTION_TYPES.parentRow,

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



  const parentState = useObjectEntityParentContext({

    tenantId: cardModel?.tenantId,

    objectTypeKey: cardModel?.objectTypeKey,

    entityId: cardModel?.entityId,

    catalog,

    enabled: Boolean(cardModel?.entityId) && parentSectionEnabled,

    reloadToken: (relationsState.reloadToken ?? 0) + subtasksReloadToken,

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



  const handleBeginCreateHierarchyChild = useCallback(

    (relationKey) => {

      const normalizedRelationKey = String(relationKey || "").trim();



      if (!normalizedRelationKey) {

        return;

      }



      onBeginCreateSubtask?.(normalizedRelationKey);

    },

    [onBeginCreateSubtask],

  );



  const canCreateHierarchyChild = Boolean(

    !isCreate &&

      canSaveEntity &&

      relationsState.primaryHierarchyRelationKey &&

      typeof onBeginCreateSubtask === "function",

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

              parentContext={parentState.parent}

              canCreateHierarchyChild={canCreateHierarchyChild}

              onBeginCreateHierarchyChild={handleBeginCreateHierarchyChild}

              submitting={submitting}

              submitError={submitError}

            />

          }

          sidebar={

            showCommentsSidebar ? (

              <ObjectEntityComments

                runtimeEntityId={cardModel.entityId}

                isCreate={isCreate}

                initialContext={initialContext}

              />

            ) : null

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

