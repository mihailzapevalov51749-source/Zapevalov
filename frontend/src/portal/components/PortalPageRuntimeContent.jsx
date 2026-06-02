import { useEffect, useMemo, useState } from "react";

import { getPageFull } from "../../api/pagesApi";
import ContentSection from "../../modules/sections/components/ContentSection";
import SystemMessage from "../../system/SystemMessage";

const EMPTY_SECTIONS = [];

export default function PortalPageRuntimeContent({
  portalId,
  pageId,
  workspace,
  workspaceTab,
  isEditMode = false,
}) {
  const [pageData, setPageData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const resolvedPageId = useMemo(() => {
    const normalized = Number(pageId);
    return Number.isFinite(normalized) && normalized > 0 ? normalized : null;
  }, [pageId]);

  useEffect(() => {
    let cancelled = false;

    async function loadPage() {
      if (!resolvedPageId) {
        setPageData(null);
        setError("");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError("");
        const data = await getPageFull(resolvedPageId);
        if (!cancelled) {
          setPageData(data);
        }
      } catch {
        if (!cancelled) {
          setPageData(null);
          setError("Не удалось загрузить страницу");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadPage();
    return () => {
      cancelled = true;
    };
  }, [resolvedPageId]);

  if (!resolvedPageId) {
    return <SystemMessage>Страница не указана</SystemMessage>;
  }

  if (loading) {
    return <SystemMessage>Загрузка...</SystemMessage>;
  }

  if (error) {
    return <SystemMessage>{error}</SystemMessage>;
  }

  if (!pageData) {
    return <SystemMessage>Страница не найдена</SystemMessage>;
  }

  const sections = Array.isArray(pageData?.sections) ? pageData.sections : EMPTY_SECTIONS;
  if (sections.length === 0) {
    const pageTitle = String(pageData?.page?.title || workspaceTab?.title || "Главная").trim();
    return (
      <div
        data-runtime-page-content
        data-runtime-page-empty="true"
        data-portal-id={portalId}
        data-workspace-id={workspace?.id}
        data-workspace-tab-id={workspaceTab?.id}
        style={{ width: "100%", padding: "24px 0" }}
      >
        <SystemMessage>{pageTitle}: страница пока пуста</SystemMessage>
      </div>
    );
  }

  return (
    <div
      data-runtime-page-content
      data-portal-id={portalId}
      data-workspace-id={workspace?.id}
      data-workspace-tab-id={workspaceTab?.id}
      style={{
        width: "100%",
        display: "flex",
        flexDirection: "column",
        gap: 0,
      }}
    >
      {sections.map(({ section, blocks }) => (
        <div key={section.id} data-section-host-id={section.id}>
          <ContentSection
            section={section}
            blocks={Array.isArray(blocks) ? blocks : []}
            sections={sections}
            isEditMode={isEditMode}
          />
        </div>
      ))}
    </div>
  );
}
