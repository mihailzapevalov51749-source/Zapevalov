import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "react-router-dom";

import FileViewerModal from "../../../shared/files/components/FileViewerModal";
import { getPublishedCatalog } from "../../designer/api/runtimeCatalogApi";
import ObjectEntityCardModal from "../../objectEntities/ObjectEntityCardModal";
import useObjectEntityCard from "../../objectEntities/hooks/useObjectEntityCard";
import {
  buildObjectEntityNotificationContext,
} from "../../objectEntities/services/buildObjectEntityNotificationContext";
import { resolveCatalogCardContext } from "../../objectEntities/services/resolveCatalogCardContext";
import { subscribePendingTarget } from "../navigation/notificationNavigationBus";
import { normalizeNotificationContext } from "../navigation/notificationNavigationMapper";
import {
  isBlockedNotificationTarget,
  isFileNotificationTarget,
  isRuntimeEntityNotificationTarget,
  resolveNotificationTenantId,
  resolveObjectOverlayContext,
} from "../navigation/notificationTargetRouting";
import { Z_INDEX_TOKENS } from "../../../shared/layout/zIndexTokens";
import { LAYOUT_MODES } from "../../../shared/layout/layoutModes";
import { resolveWorkspaceLeftOffset } from "../../../shared/layout/shellGeometry";
import { readShellSidebarCollapsedForCurrentUrl } from "../../../shared/shell/useShellSidebarState";
import { fetchProtectedFileBlobUrl, isProtectedDocumentFilePath } from "../../../shared/files/api/filesApi";
import { fetchLibraryDocumentBlobUrl } from "../../documentLibraries/api/documentLibrariesApi";
import {
  getLibraryDocumentByFileKey,
} from "../../documentLibraries/services/documentLibrariesService";

function normalizeId(value) {
  return String(value ?? "").trim();
}

function buildUploadedFilePath(fileId) {
  if (!fileId) return "";
  return `/files/documents/${fileId}`;
}

const BLOCKED_OVERLAY_STYLE = {
  position: "fixed",
  right: 24,
  top: 24,
  zIndex: Z_INDEX_TOKENS.overlays.notificationBlocked,
  width: 420,
  maxWidth: "calc(100vw - 48px)",
  padding: "14px 16px",
  borderRadius: 12,
  border: "1px solid #FECACA",
  background: "#FEF2F2",
  color: "#991B1B",
  boxShadow: "0 12px 28px rgba(15,23,42,0.12)",
  boxSizing: "border-box",
};

function NotificationBlockedOverlay({ title, message, onClose }) {
  return (
    <div style={BLOCKED_OVERLAY_STYLE}>
      <div style={{ fontWeight: 700, marginBottom: 6 }}>{title}</div>
      <div style={{ fontSize: 13, lineHeight: 1.4 }}>{message}</div>
      <button
        type="button"
        onClick={onClose}
        style={{
          marginTop: 10,
          border: "1px solid #FCA5A5",
          background: "#FFFFFF",
          color: "#991B1B",
          borderRadius: 8,
          padding: "6px 10px",
          cursor: "pointer",
        }}
      >
        Закрыть
      </button>
    </div>
  );
}

function getBlockedCopy(type) {
  if (type === "access_denied") {
    return {
      title: "Нет доступа",
      message: "У вас нет доступа к этому объекту или разделу.",
    };
  }

  if (type === "runtime_context_missing") {
    return {
      title: "Контекст уведомления недоступен",
      message:
        "Объект не опубликован, удалён или ссылка из уведомления устарела.",
    };
  }

  if (type === "tenant_unresolved") {
    return {
      title: "Не удалось открыть уведомление",
      message: "Не удалось определить компанию для открытия уведомления.",
    };
  }

  return {
    title: "Не удалось открыть объект",
    message: "Уведомление создано по устаревшему формату.",
  };
}

function NotificationObjectEntityOverlay({
  tenantId,
  target,
  overlayContext,
  onClose,
}) {
  const [catalog, setCatalog] = useState(null);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const openedRef = useRef(false);

  const { titleFieldKey } = useMemo(
    () => resolveCatalogCardContext(catalog, overlayContext.objectTypeKey),
    [catalog, overlayContext.objectTypeKey],
  );

  const entityCard = useObjectEntityCard({
    tenantId,
    objectTypeKey: overlayContext.objectTypeKey,
    catalog,
    listItems: [],
    titleFieldKey,
    enabled: true,
  });

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setCatalogLoading(true);

      try {
        const catalogResponse = await getPublishedCatalog(tenantId);
        if (!cancelled) {
          setCatalog(catalogResponse);
        }
      } catch {
        if (!cancelled) {
          setCatalog(null);
        }
      } finally {
        if (!cancelled) {
          setCatalogLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [tenantId]);

  useEffect(() => {
    if (openedRef.current || catalogLoading || !entityCard.openCard) {
      return;
    }

    openedRef.current = true;

    void entityCard.openCard(overlayContext.runtimeEntityId, {
      objectTypeKey: overlayContext.objectTypeKey,
      initialContext: buildObjectEntityNotificationContext(target),
      forceLoadEntity: true,
    });
  }, [
    catalog,
    catalogLoading,
    entityCard.openCard,
    overlayContext,
    target,
  ]);

  useEffect(() => {
    if (!entityCard.openError || entityCard.isOpen) {
      return;
    }

    const isAccessDenied = entityCard.openError.includes("доступ");
    onClose({
      type: isAccessDenied ? "access_denied" : "runtime_context_missing",
      message: entityCard.openError,
    });
    entityCard.clearOpenError?.();
  }, [entityCard.openCard, entityCard.openError, entityCard.isOpen, entityCard.clearOpenError, overlayContext, target, onClose]);

  if (entityCard.openError && !entityCard.isOpen) {
    return null;
  }

  return (
    <ObjectEntityCardModal
      open={entityCard.isOpen}
      mode={entityCard.cardMode}
      cardModel={entityCard.cardModel}
      formValues={entityCard.formValues}
      fieldErrors={entityCard.fieldErrors}
      onFieldChange={entityCard.updateFieldValue}
      onClose={() => {
        entityCard.closeCard();
        onClose(null);
      }}
      onSave={entityCard.save}
      submitting={entityCard.submitting}
      submitError={entityCard.submitError}
      initialContext={entityCard.initialContext}
      catalog={catalog}
      onEntityUpdated={entityCard.refreshEntity}
    />
  );
}

export default function NotificationOverlayHost() {
  const location = useLocation();

  const [overlayState, setOverlayState] = useState(null);
  const [objectOverlaySession, setObjectOverlaySession] = useState(null);
  const overlayStateRef = useRef(null);
  const objectOverlaySessionRef = useRef(null);
  const lastTargetKeyRef = useRef("");

  objectOverlaySessionRef.current = objectOverlaySession;

  function updateOverlayState(nextState) {
    overlayStateRef.current = nextState;
    setOverlayState(nextState);
  }

  function clearOverlayState() {
    const current = overlayStateRef.current;
    if (current?.file?.revokeOnCleanup && current?.file?.fileUrl) {
      URL.revokeObjectURL(current.file.fileUrl);
    }
    updateOverlayState(null);
    lastTargetKeyRef.current = "";
    window.__YASNOPRO_PENDING_NOTIFICATION_TARGET__ = null;
  }

  function clearObjectOverlaySession(blockedState = null) {
    setObjectOverlaySession(null);
    lastTargetKeyRef.current = "";

    if (blockedState) {
      const copy = getBlockedCopy(blockedState.type);
      updateOverlayState({
        type: blockedState.type,
        title: copy.title,
        message: blockedState.message || copy.message,
      });
      return;
    }

    window.__YASNOPRO_PENDING_NOTIFICATION_TARGET__ = null;
  }

  useEffect(() => {
    async function handlePendingTarget(event) {
      const rawDetail = event.detail || {};
      const context = normalizeNotificationContext(rawDetail);
      const mergedTarget = { ...rawDetail, ...context };

      if (isBlockedNotificationTarget(rawDetail)) {
        const copy = getBlockedCopy(normalizeId(rawDetail.type));
        updateOverlayState({
          type: rawDetail.type,
          title: copy.title,
          message: rawDetail.message || copy.message,
        });
        return;
      }

      if (
        isRuntimeEntityNotificationTarget(rawDetail) ||
        isRuntimeEntityNotificationTarget(context) ||
        isRuntimeEntityNotificationTarget(mergedTarget)
      ) {
        const overlayContext = resolveObjectOverlayContext(mergedTarget);

        if (!overlayContext) {
          updateOverlayState({
            type: "runtime_context_missing",
            ...getBlockedCopy("runtime_context_missing"),
          });
          return;
        }

        const resolvedTenantId = resolveNotificationTenantId(
          { ...rawDetail, context },
          location.pathname,
        );

        if (!resolvedTenantId) {
          console.warn(
            "[NotificationOverlayHost] tenant unresolved for runtime entity notification",
            {
              entityType: context.entity_type,
              entityId: context.entity_id,
              pathname: location.pathname,
            },
          );
          updateOverlayState({
            type: "tenant_unresolved",
            ...getBlockedCopy("tenant_unresolved"),
          });
          return;
        }

        const targetKey = [
          mergedTarget.type,
          overlayContext.objectTypeKey,
          overlayContext.runtimeEntityId,
          context.comment_id,
        ]
          .filter(Boolean)
          .join(":");

        if (
          lastTargetKeyRef.current === targetKey &&
          objectOverlaySessionRef.current
        ) {
          return;
        }

        lastTargetKeyRef.current = targetKey;
        setObjectOverlaySession({
          target: mergedTarget,
          overlayContext,
          tenantId: resolvedTenantId,
        });
        return;
      }

      const source = normalizeId(context.source || rawDetail.type);
      const fileId = normalizeId(context.file_id || rawDetail.fileId);
      const targetKey = [source, fileId, rawDetail.type, context.comment_id]
        .filter(Boolean)
        .join(":");

      if (lastTargetKeyRef.current === targetKey && overlayStateRef.current) {
        return;
      }

      if (source === "library_file" || rawDetail.type === "library_file") {
        if (!fileId) {
          updateOverlayState({
            type: "runtime_context_missing",
            ...getBlockedCopy("runtime_context_missing"),
          });
          return;
        }

        const resolvedTenantId = resolveNotificationTenantId(
          { ...rawDetail, context },
          location.pathname,
        );
        const libraryId = normalizeId(context.library_id || context.libraryId);

        if (!resolvedTenantId) {
          console.warn(
            "[NotificationOverlayHost] tenant unresolved for library file notification",
            {
              fileId,
              libraryId,
              pathname: location.pathname,
            },
          );
          updateOverlayState({
            type: "tenant_unresolved",
            ...getBlockedCopy("tenant_unresolved"),
          });
          return;
        }

        try {
          let blobUrl;
          let fileName = context.file_name || "Файл";
          let normalizedDocumentId = fileId;
          let fileType = context.file_type || "";

          if (libraryId) {
            const document = await getLibraryDocumentByFileKey(
              resolvedTenantId,
              libraryId,
              fileId,
            );
            blobUrl = await fetchLibraryDocumentBlobUrl(
              resolvedTenantId,
              document.id,
            );
            normalizedDocumentId = normalizeId(document?.id) || fileId;
            fileName = document.title || fileName;
            fileType = document.document_type || fileType;
          } else {
            const documentId = Number(fileId);
            if (!Number.isFinite(documentId) || documentId <= 0) {
              throw new Error("Invalid library document id");
            }

            blobUrl = await fetchLibraryDocumentBlobUrl(
              resolvedTenantId,
              documentId,
            );
            normalizedDocumentId = String(documentId);
          }

          lastTargetKeyRef.current = targetKey;
          updateOverlayState({
            type: "library_file",
            file: {
              raw: { id: normalizedDocumentId },
              fileId: normalizedDocumentId,
              fileUrl: blobUrl,
              revokeOnCleanup: true,
              fileName,
              fileType,
            },
            context: {
              ...context,
              entity_type: "file",
              entity_id: normalizedDocumentId,
              file_id: normalizedDocumentId,
              tab: "comments",
              highlight_id:
                context.highlight_id ||
                (context.comment_id ? `comment-${context.comment_id}` : null),
            },
          });
        } catch (error) {
          console.error("LIBRARY FILE LOAD ERROR:", error);
          updateOverlayState({
            type: "runtime_context_missing",
            ...getBlockedCopy("runtime_context_missing"),
          });
        }

        return;
      }

      if (
        source === "uploaded_file" ||
        rawDetail.type === "uploaded_file" ||
        (isFileNotificationTarget(rawDetail) && fileId)
      ) {
        if (!fileId) {
          updateOverlayState({
            type: "notification_unavailable",
            ...getBlockedCopy("notification_unavailable"),
          });
          return;
        }

        const uploadedFilePath =
          context.file_url || buildUploadedFilePath(fileId);

        if (!uploadedFilePath) {
          updateOverlayState({
            type: "notification_unavailable",
            ...getBlockedCopy("notification_unavailable"),
          });
          return;
        }

        let resolvedFileUrl = uploadedFilePath;
        let revokeOnCleanup = false;

        if (isProtectedDocumentFilePath(uploadedFilePath)) {
          try {
            resolvedFileUrl = await fetchProtectedFileBlobUrl(uploadedFilePath);
            revokeOnCleanup = true;
          } catch (error) {
            console.error("UPLOADED FILE LOAD ERROR:", error);
            updateOverlayState({
              type: "notification_unavailable",
              ...getBlockedCopy("notification_unavailable"),
            });
            return;
          }
        }

        lastTargetKeyRef.current = targetKey;
        updateOverlayState({
          type: "uploaded_file",
          file: {
            raw: { id: fileId },
            fileId,
            fileUrl: resolvedFileUrl,
            revokeOnCleanup,
            fileName: context.file_name || "Файл",
            fileType: "",
          },
          context: {
            ...context,
            entity_type: "file",
            entity_id: fileId,
            file_id: fileId,
            tab: context.tab || "comments",
            highlight_id:
              context.highlight_id ||
              (context.comment_id ? `comment-${context.comment_id}` : null),
          },
        });
        return;
      }

      updateOverlayState({
        type: "notification_unavailable",
        ...getBlockedCopy("notification_unavailable"),
      });
    }

    const unsubscribePendingTarget = subscribePendingTarget(handlePendingTarget);

    return () => {
      unsubscribePendingTarget();
    };
  }, [location.pathname]);

  const workspaceLeftOffset = resolveWorkspaceLeftOffset({
    mode: LAYOUT_MODES.RUNTIME,
    collapsed: readShellSidebarCollapsedForCurrentUrl(),
    explicitWorkspaceLeftOffset: 240,
  });

  return (
    <>
      {objectOverlaySession ? (
        <NotificationObjectEntityOverlay
          key={`${objectOverlaySession.overlayContext.objectTypeKey}:${objectOverlaySession.overlayContext.runtimeEntityId}`}
          tenantId={objectOverlaySession.tenantId}
          target={objectOverlaySession.target}
          overlayContext={objectOverlaySession.overlayContext}
          onClose={clearObjectOverlaySession}
        />
      ) : null}

      {!overlayState ? null : (
        <>
          {overlayState.type === "notification_unavailable" ||
          overlayState.type === "runtime_context_missing" ||
          overlayState.type === "tenant_unresolved" ||
          overlayState.type === "access_denied" ? (
            <NotificationBlockedOverlay
              title={overlayState.title}
              message={overlayState.message}
              onClose={clearOverlayState}
            />
          ) : null}

          {overlayState.type === "library_file" ||
          overlayState.type === "uploaded_file" ? (
            <FileViewerModal
              isOpen
              fileUrl={overlayState.file.fileUrl}
              fileName={overlayState.file.fileName}
              fileType={overlayState.file.fileType}
              fileId={overlayState.file.fileId}
              initialContext={overlayState.context}
              userId="1"
              userName="Михаил"
              mode="view"
              workspaceLeftOffset={workspaceLeftOffset}
              workspaceTopOffset={0}
              onClose={clearOverlayState}
            />
          ) : null}
        </>
      )}
    </>
  );
}
