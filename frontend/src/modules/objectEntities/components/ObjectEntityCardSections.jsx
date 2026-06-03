import { useEffect, useMemo, useRef } from "react";

import { OBJECT_ENTITY_SECTION_TYPES } from "../services/objectEntityCardSectionsLayout";
import { getFileFieldsFromCatalog } from "../services/getFileFieldsFromCatalog";
import { findDescriptionField } from "../services/runtimeEntityCardAdapter";

import EntityCardPendingSection from "./EntityCardPendingSection";
import ObjectEntityAttachments from "./ObjectEntityAttachments";
import ObjectEntityCardFieldsGrid from "./ObjectEntityCardFieldsGrid";
import ObjectEntityCardMain from "./ObjectEntityCardMain";
import ObjectEntityCardParentSection from "./ObjectEntityCardParentSection";
import ObjectEntityCardTabsBlock from "./ObjectEntityCardTabsBlock";

const CREATE_PENDING_MESSAGE =
  "Сохраните запись, чтобы работать с этим разделом";

export default function ObjectEntityCardSections({
  isCreate = false,
  cardModel,
  catalog = null,
  formValues = {},
  fieldErrors = {},
  onFieldChange,
  onEntityUpdated = null,
  initialContext = null,
  utLayout = null,
  relationsState = null,
  onOpenRelatedEntity = null,
  parentContext = null,
  submitting = false,
  submitError = "",
}) {
  const editableFields = cardModel?.editableFields || [];
  const fieldsByKey = useMemo(
    () => new Map(editableFields.map((field) => [String(field.key), field])),
    [editableFields],
  );

  const titleField = useMemo(() => {
    const titleKey = String(cardModel?.titleFieldKey || "").trim();

    if (!titleKey) {
      return null;
    }

    return fieldsByKey.get(titleKey) || null;
  }, [cardModel?.titleFieldKey, fieldsByKey]);

  const descriptionField = useMemo(
    () => findDescriptionField(editableFields, cardModel?.titleFieldKey),
    [editableFields, cardModel?.titleFieldKey],
  );

  const sections = utLayout?.sections || [];
  const hasFileFields = useMemo(
    () =>
      getFileFieldsFromCatalog(catalog, cardModel?.objectTypeKey).length > 0,
    [catalog, cardModel?.objectTypeKey],
  );
  const attachmentsSectionRef = useRef(null);
  const notificationScrollDoneRef = useRef(false);

  useEffect(() => {
    notificationScrollDoneRef.current = false;
  }, [initialContext, cardModel?.entityId]);

  useEffect(() => {
    if (!initialContext || notificationScrollDoneRef.current) {
      return;
    }

    const targetTab = String(initialContext?.tab || "").trim();

    if (targetTab !== "attachments") {
      return;
    }

    notificationScrollDoneRef.current = true;

    window.setTimeout(() => {
      attachmentsSectionRef.current?.scrollIntoView?.({
        behavior: "smooth",
        block: "start",
      });
    }, 350);
  }, [initialContext, sections]);

  const mainSection = useMemo(
    () =>
      sections.find(
        (section) => section.type === OBJECT_ENTITY_SECTION_TYPES.mainFields,
      ),
    [sections],
  );

  const resolvedTitleField = useMemo(() => {
    const mainKeys = mainSection?.fieldKeys || [];
    const configuredKey = String(mainKeys[0] || "").trim();
    const titleKey = String(cardModel?.titleFieldKey || "").trim();

    if (configuredKey && fieldsByKey.has(configuredKey)) {
      return fieldsByKey.get(configuredKey);
    }

    if (titleKey && fieldsByKey.has(titleKey)) {
      return fieldsByKey.get(titleKey);
    }

    return titleField;
  }, [mainSection?.fieldKeys, cardModel?.titleFieldKey, fieldsByKey, titleField]);

  const resolvedDescriptionField = useMemo(() => {
    const mainKeys = mainSection?.fieldKeys || [];
    const configuredKey = String(mainKeys[1] || "").trim();

    if (configuredKey && fieldsByKey.has(configuredKey)) {
      return fieldsByKey.get(configuredKey);
    }

    return descriptionField;
  }, [mainSection?.fieldKeys, fieldsByKey, descriptionField]);

  return (
    <div
      style={{
        width: "100%",
        boxSizing: "border-box",
        display: "flex",
        flexDirection: "column",
        gap: 18,
        minHeight: 0,
        paddingBottom: 12,
      }}
    >
      {submitError ? (
        <div
          role="alert"
          style={{
            margin: "4px 8px 0",
            padding: "8px 12px",
            borderRadius: 10,
            background: "#FEF2F2",
            border: "1px solid #FECACA",
            color: "#B91C1C",
            fontSize: 12,
            fontWeight: 600,
            lineHeight: 1.4,
          }}
        >
          {submitError}
        </div>
      ) : null}

      {!isCreate && (cardModel?.readOnlyFields || []).length > 0 ? (
        <ObjectEntityCardFieldsGrid
          fields={cardModel.readOnlyFields}
          formValues={{
            ...formValues,
            ...(cardModel?.rawEntity?.values && typeof cardModel.rawEntity.values === "object"
              ? cardModel.rawEntity.values
              : {}),
          }}
          fieldErrors={{}}
          onFieldChange={null}
          readOnly
        />
      ) : null}

      {sections.map((section) => {
        if (section.visible === false) {
          return null;
        }

        let renderedSection = null;

        if (section.type === OBJECT_ENTITY_SECTION_TYPES.parentRow) {
          renderedSection = (
            <ObjectEntityCardParentSection
              parent={parentContext}
              onOpenParent={onOpenRelatedEntity}
            />
          );
        } else if (section.type === OBJECT_ENTITY_SECTION_TYPES.mainFields) {
          renderedSection = (
            <ObjectEntityCardMain
              titleField={resolvedTitleField}
              descriptionField={resolvedDescriptionField}
              formValues={formValues}
              onFieldChange={onFieldChange}
              readOnly={submitting}
              fallbackTitle={cardModel?.title}
            />
          );
        } else if (section.type === OBJECT_ENTITY_SECTION_TYPES.fieldsGrid) {
          const fields = (section.fieldKeys || [])
            .map((key) => fieldsByKey.get(String(key)))
            .filter(Boolean);

          renderedSection = (
            <ObjectEntityCardFieldsGrid
              fields={fields}
              formValues={formValues}
              fieldErrors={fieldErrors}
              onFieldChange={onFieldChange}
              readOnly={false}
              alwaysEditing={isCreate}
            />
          );
        } else if (section.type === OBJECT_ENTITY_SECTION_TYPES.attachments) {
          if (!hasFileFields) {
            renderedSection = null;
          } else {
          renderedSection = (
            <div
              ref={attachmentsSectionRef}
              data-oec-section="attachments"
              style={{ width: "100%", boxSizing: "border-box" }}
            >
              {isCreate ? (
                <EntityCardPendingSection message="Сохраните запись для добавления вложений" />
              ) : (
                <ObjectEntityAttachments
                  runtimeEntityId={cardModel.entityId}
                  objectTypeKey={cardModel.objectTypeKey}
                  tenantId={cardModel.tenantId}
                  catalog={catalog}
                  entity={cardModel.rawEntity}
                  initialContext={initialContext}
                  onEntityUpdated={onEntityUpdated}
                />
              )}
            </div>
          );
          }
        } else if (section.type === OBJECT_ENTITY_SECTION_TYPES.tabs) {
          renderedSection = (
            <ObjectEntityCardTabsBlock
              tabIds={section.tabIds || []}
              cardModel={cardModel}
              catalog={catalog}
              initialContext={initialContext}
              relationsState={relationsState}
              onOpenRelatedEntity={onOpenRelatedEntity}
              isCreate={isCreate}
              createPendingMessage={CREATE_PENDING_MESSAGE}
            />
          );
        }

        if (!renderedSection) {
          return null;
        }

        return (
          <div key={section.id} style={{ width: "100%", boxSizing: "border-box" }}>
            {renderedSection}
          </div>
        );
      })}
    </div>
  );
}
