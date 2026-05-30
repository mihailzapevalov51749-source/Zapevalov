import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";

import FileViewerModal from "../../../shared/files/components/FileViewerModal";
import { getPublishedCatalog } from "../../designer/api/runtimeCatalogApi";
import ObjectEntityCardModal from "../../objectEntities/ObjectEntityCardModal";
import useObjectEntityCard from "../../objectEntities/hooks/useObjectEntityCard";
import {
  buildObjectEntityNotificationContext,
} from "../../objectEntities/services/buildObjectEntityNotificationContext";
import { subscribePendingTarget } from "../navigation/notificationNavigationBus";
import { normalizeNotificationContext } from "../navigation/notificationNavigationMapper";
import {
  isBlockedNotificationTarget,
  isFileNotificationTarget,
  isRuntimeEntityNotificationTarget,
  resolveObjectOverlayContext,
  resolvePortalIdFromPathname,
} from "../navigation/notificationTargetRouting";
import { Z_INDEX_TOKENS } from "../../../shared/layout/zIndexTokens";
import { LAYOUT_MODES } from "../../../shared/layout/layoutModes";
import { resolveWorkspaceLeftOffset } from "../../../shared/layout/shellGeometry";
import { apiClient } from "../../../api/apiClient";
import {
  getLibraryDocumentByFileKey,
  getFileUrl,
} from "../../documentLibraries/services/documentLibrariesService";

const API_BASE_URL = String(apiClient?.defaults?.baseURL || "").replace(/\/$/, "");

function normalizeId(value) {
  return String(value ?? "").trim();
}

function buildUploadedFileUrl(fileId) {
  if (!fileId) return "";
  return `${API_BASE_URL}/files/documents/${fileId}`;
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
  const openedRef = useRef(false);

  const entityCard = useObjectEntityCard({
    tenantId,
    objectTypeKey: overlayContext.objectTypeKey,
    catalog,
    listItems: [],
    enabled: true,
    mode: "edit",
  });

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const catalogResponse = await getPublishedCatalog(tenantId);
        if (!cancelled) {
          setCatalog(catalogResponse);
        }
      } catch {
        if (!cancelled) {
          setCatalog(null);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [tenantId]);

  useEffect(() => {
    if (openedRef.current || !entityCard.openCard) {
      return;
    }

    openedRef.current = true;

    void entityCard.openCard(overlayContext.runtimeEntityId, {
      objectTypeKey: overlayContext.objectTypeKey,
      initialContext: buildObjectEntityNotificationContext(target),
    });
  }, [entityCard.openCard, overlayContext, target]);

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
      mode="edit"
      cardModel={entityCard.cardModel}
      formValues={entityCard.formValues}
      fieldErrors={entityCard.fieldErrors}
      onFieldChange={entityCard.setFieldValue}
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
  const tenantId = resolvePortalIdFromPathname(location.pathname);

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

        try {
          const document = await getLibraryDocumentByFileKey(fileId);
          const fileUrl = getFileUrl(document);
          const normalizedDocumentId = normalizeId(document?.id) || fileId;

          lastTargetKeyRef.current = targetKey;
          updateOverlayState({
            type: "library_file",
            file: {
              raw: document,
              fileId: normalizedDocumentId,
              fileUrl,
              fileName: document.title,
              fileType: document.document_type,
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

        const uploadedFileUrl =
          context.file_url || buildUploadedFileUrl(fileId);

        if (!uploadedFileUrl) {
          updateOverlayState({
            type: "notification_unavailable",
            ...getBlockedCopy("notification_unavailable"),
          });
          return;
        }

        lastTargetKeyRef.current = targetKey;
        updateOverlayState({
          type: "uploaded_file",
          file: {
            raw: { id: fileId },
            fileId,
            fileUrl: uploadedFileUrl,
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
  }, []);

  const workspaceLeftOffset = resolveWorkspaceLeftOffset({
    mode: LAYOUT_MODES.RUNTIME,
    collapsed: localStorage.getItem("yasnopro-sidebar-collapsed") === "true",
    explicitWorkspaceLeftOffset: 240,
  });

  return (
    <>
      {objectOverlaySession ? (
        <NotificationObjectEntityOverlay
          key={`${objectOverlaySession.overlayContext.objectTypeKey}:${objectOverlaySession.overlayContext.runtimeEntityId}`}
          tenantId={tenantId}
          target={objectOverlaySession.target}
          overlayContext={objectOverlaySession.overlayContext}
          onClose={clearObjectOverlaySession}
        />
      ) : null}

      {!overlayState ? null : (
        <>
          {overlayState.type === "notification_unavailable" ||
          overlayState.type === "runtime_context_missing" ||
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
