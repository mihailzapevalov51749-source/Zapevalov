import { useCallback, useEffect, useMemo, useState } from "react";

import { useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom";



import PortalLayout from "../layouts/PortalLayout";

import useNavigationTree from "../modules/navigation/hooks/useNavigationTree";

import DocumentWorkspaceView from "../modules/documentLibraries/components/DocumentWorkspaceView";

import LibraryPageView from "../modules/documentLibraries/components/LibraryPageView";

import { buildLibraryDeepLinkSearchParams } from "../modules/documentLibraries/utils/libraryDeepLink";

import { buildLibraryHeaderBreadcrumbItems } from "../modules/documentLibraries/utils/buildLibraryHeaderBreadcrumbs";

import { parseLibraryDeepLink } from "../modules/documentLibraries/utils/libraryDeepLink";

import WorkspaceTopBar from "./components/WorkspaceTopBar";

import SearchResultsOverlay from "../shared/search/SearchResultsOverlay";

import { useHeaderSearchContext } from "../shared/search/useHeaderSearchContext";

import { useHeaderSearchController } from "../shared/search/useHeaderSearchController";

import { PORTAL_NAVIGATION_RELOAD_EVENT } from "../modules/designer/utils/navigationReload";



function findLibraryNavigationItem(items, libraryId) {

  if (!Array.isArray(items)) {

    return null;

  }



  for (const item of items) {

    if (Number(item?.library_id) === Number(libraryId)) {

      return item;

    }



    const nested = findLibraryNavigationItem(item?.children, libraryId);

    if (nested) {

      return nested;

    }

  }



  return null;

}



export default function PortalLibraryRuntimePage() {

  const navigate = useNavigate();

  const location = useLocation();

  const [searchParams] = useSearchParams();

  const { portalId: portalIdParam, libraryId: libraryIdParam } = useParams();



  const portalId = Number(portalIdParam || 1);

  const libraryId = Number(libraryIdParam);

  const tenantId = portalId;



  const deepLink = parseLibraryDeepLink(searchParams);

  const isDocumentWorkspace =

    deepLink.shouldOpenDocument && deepLink.documentId != null;



  const { navigation, reloadNavigation } = useNavigationTree(portalId, {

    scope: "runtime",

  });



  useEffect(() => {

    const handlePortalNavigationReload = () => {

      reloadNavigation();

    };



    window.addEventListener(

      PORTAL_NAVIGATION_RELOAD_EVENT,

      handlePortalNavigationReload,

    );



    return () => {

      window.removeEventListener(

        PORTAL_NAVIGATION_RELOAD_EVENT,

        handlePortalNavigationReload,

      );

    };

  }, [reloadNavigation]);



  const [menuScale, setMenuScale] = useState(() => {

    const saved = localStorage.getItem("leftMenuScale");

    return saved ? Number(saved) : 1;

  });

  const [runtimeHeaderModel, setRuntimeHeaderModel] = useState(null);

  const [libraryContextPath, setLibraryContextPath] = useState({

    rootTitle: "",

    folderPath: [],

  });

  const [documentHeaderContext, setDocumentHeaderContext] = useState(null);



  const activeNavigationItem = useMemo(

    () => findLibraryNavigationItem(navigation, libraryId),

    [navigation, libraryId],

  );



  const topBarTitle =

    activeNavigationItem?.display_title ||

    activeNavigationItem?.title ||

    "Библиотека документов";



  useEffect(() => {

    if (!isDocumentWorkspace) {

      setDocumentHeaderContext(null);

    }

  }, [isDocumentWorkspace, deepLink.documentId]);



  useEffect(() => {

    const handleGoRoot = (event) => {

      const targetLibraryId = Number(event?.detail?.libraryId);

      if (Number.isFinite(targetLibraryId) && targetLibraryId !== libraryId) {

        return;

      }



      navigate(`/portal/${portalId}/library/${libraryId}`);

    };



    const handleGoFolder = (event) => {

      const targetLibraryId = Number(event?.detail?.libraryId);

      const targetFolderId = Number(event?.detail?.folderId);



      if (Number.isFinite(targetLibraryId) && targetLibraryId !== libraryId) {

        return;

      }

      if (!Number.isFinite(targetFolderId)) {

        return;

      }



      const params = buildLibraryDeepLinkSearchParams({

        folderId: targetFolderId,

        documentId: null,

        open: null,

      });

      const query = params.toString();

      navigate(

        `/portal/${portalId}/library/${libraryId}${query ? `?${query}` : ""}`,

      );

    };



    window.addEventListener("yasnopro:library:go-root", handleGoRoot);

    window.addEventListener("yasnopro:library:go-folder", handleGoFolder);



    return () => {

      window.removeEventListener("yasnopro:library:go-root", handleGoRoot);

      window.removeEventListener("yasnopro:library:go-folder", handleGoFolder);

    };

  }, [navigate, portalId, libraryId]);



  const headerBreadcrumbItems = useMemo(() => {

    const folderPath = isDocumentWorkspace

      ? documentHeaderContext?.folderPath ?? []

      : libraryContextPath.folderPath;



    return buildLibraryHeaderBreadcrumbItems({

      libraryTitle: topBarTitle,

      libraryId,

      portalId,

      folderPath,

      documentTitle: isDocumentWorkspace

        ? documentHeaderContext?.documentTitle

        : null,

    });

  }, [

    isDocumentWorkspace,

    documentHeaderContext,

    libraryContextPath.folderPath,

    topBarTitle,

    libraryId,

    portalId,

  ]);



  const changeMenuScale = useCallback((nextScale) => {

    const normalized = Math.min(1.4, Math.max(0.8, nextScale));

    const rounded = Number(normalized.toFixed(1));

    setMenuScale(rounded);

    localStorage.setItem("leftMenuScale", String(rounded));

  }, []);



  const handleSelectPage = useCallback(

    (nextPageId) => {

      if (!nextPageId) {

        return;

      }

      navigate(`/portal/${portalId}/page/${nextPageId}`);

    },

    [navigate, portalId],

  );



  const handleNavigateToPath = useCallback(

    (path) => {

      if (!path) {

        return;

      }

      navigate(path);

    },

    [navigate],

  );



  const handleSidebarItemAction = useCallback(

    (item, event) => {

      const pageId = item?.pageId ?? item?.page_id ?? item?.meta?.page_id;

      const itemLibraryId = item?.library_id;



      if (itemLibraryId != null) {

        event?.preventDefault?.();

        navigate(`/portal/${portalId}/library/${itemLibraryId}`);

        return;

      }



      if (pageId != null) {

        event?.preventDefault?.();

        handleSelectPage(pageId);

      }

    },

    [navigate, portalId, handleSelectPage],

  );



  const handleUnifiedHeaderModel = useCallback((nextModel) => {

    setRuntimeHeaderModel((previous) => {

      if (previous?.contract === nextModel?.contract) {

        return previous;

      }

      return nextModel;

    });

  }, []);



  const handleLibraryContextPathChange = useCallback((nextContext) => {

    setLibraryContextPath({

      rootTitle: nextContext?.rootTitle || "",

      folderPath: Array.isArray(nextContext?.folderPath)

        ? nextContext.folderPath

        : [],

    });

  }, []);



  const handleDocumentLoaded = useCallback((nextContext) => {
    setDocumentHeaderContext({
      folderPath: Array.isArray(nextContext?.folderPath)
        ? nextContext.folderPath
        : [],
      documentTitle: nextContext?.documentTitle || "",
    });
  }, []);

  const handleCloseDocument = useCallback(() => {
    const params = buildLibraryDeepLinkSearchParams({
      folderId: deepLink.folderId,
      documentId: null,
      open: null,
    });
    const query = params.toString();
    navigate(
      `/portal/${portalId}/library/${libraryId}${query ? `?${query}` : ""}`,
    );
    setDocumentHeaderContext(null);
  }, [deepLink.folderId, navigate, portalId, libraryId]);



  const headerSearchContextInput = useMemo(

    () => ({

      pathname: location.pathname,

      routeParams: {

        portalId,

        tenantId: portalId,

        libraryId,

      },

      currentLibrary: {

        libraryId,

        folderPath: isDocumentWorkspace

          ? documentHeaderContext?.folderPath ?? []

          : libraryContextPath.folderPath,

      },

      currentSection: activeNavigationItem

        ? {

            id: activeNavigationItem.id,

            type: activeNavigationItem.type,

            libraryId: activeNavigationItem.library_id,

          }

        : undefined,

    }),

    [

      location.pathname,

      portalId,

      libraryId,

      isDocumentWorkspace,

      documentHeaderContext?.folderPath,

      libraryContextPath.folderPath,

      activeNavigationItem,

    ],

  );



  const searchContext = useHeaderSearchContext(headerSearchContextInput);

  const headerSearch = useHeaderSearchController({ searchContext, enabled: true });



  return (

    <PortalLayout

      portalId={portalId}

      navigation={navigation}

      activePageId={location.pathname}

      onSelectPage={handleSelectPage}

      onNavigateToPath={handleNavigateToPath}

      onSidebarItemAction={handleSidebarItemAction}

      reloadNavigation={reloadNavigation}

      menuScale={menuScale}

      onChangeMenuScale={changeMenuScale}

      headerContract={runtimeHeaderModel?.contract}

      onHeaderAction={runtimeHeaderModel?.onAction}

      searchOverlay={

        <SearchResultsOverlay

          isVisible={headerSearch.isOverlayVisible}

          isLoading={headerSearch.isLoading}

          error={headerSearch.error}

          results={headerSearch.results}

          scopeLabel={searchContext.label}

          onClose={headerSearch.closeResults}

        />

      }

    >

      <div

        data-page-scroll

        style={{

          width: "100%",

          height: "100%",

          minHeight: 0,

          display: "flex",

          flexDirection: "column",

          boxSizing: "border-box",

          overflow: "hidden",

          background: "#f1f5f9",

        }}

      >

        <WorkspaceTopBar

          title={topBarTitle}

          subtitle="Портал"

          sectionTitle={topBarTitle}

          breadcrumbItems={headerBreadcrumbItems}

          searchQuery={headerSearch.searchQuery}

          onQueryChange={headerSearch.onQueryChange}

          searchPlaceholder={searchContext.label}

          onOpenFirstResult={headerSearch.openFirstResult}

          onCloseSearchResults={headerSearch.closeResults}

          onClearSearch={headerSearch.clearResults}

          isEditMode={false}

          tenantId={tenantId}

          inlineRender={false}

          onUnifiedHeaderModel={handleUnifiedHeaderModel}

        />



        <div

          data-page-canvas

          style={{

            flex: 1,

            minHeight: 0,

            width: "100%",

            display: "flex",

            flexDirection: "column",

            overflow: "hidden",

            padding: "10px 16px 16px",

            boxSizing: "border-box",

          }}

        >

          {isDocumentWorkspace ? (

            <DocumentWorkspaceView
              documentId={deepLink.documentId}
              libraryId={libraryId}
              folderId={deepLink.folderId}
              onDocumentLoaded={handleDocumentLoaded}
              onClose={handleCloseDocument}
            />

          ) : (

            <LibraryPageView

              libraryId={libraryId}

              title={topBarTitle}

              onContextPathChange={handleLibraryContextPathChange}

            />

          )}

        </div>

      </div>

    </PortalLayout>

  );

}


