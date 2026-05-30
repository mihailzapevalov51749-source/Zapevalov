import { useEffect } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";

import { Z_INDEX_LAYERS } from "../layout/zIndexTokens";

import { useSearchInputAnchor } from "./useSearchInputAnchor.js";

import "./searchResultsOverlay.css";

function normalizeResult(result) {
  if (!result || typeof result !== "object") {
    return null;
  }

  const title = String(result.title ?? "").trim();
  if (!title) {
    return null;
  }

  return {
    id: String(result.id ?? title),
    title,
    subtitle: String(result.subtitle ?? "").trim(),
    path: typeof result.path === "string" ? result.path : "",
    type: String(result.type ?? ""),
    source: String(result.source ?? ""),
  };
}

export default function SearchResultsOverlay({
  isVisible = false,
  isLoading = false,
  error = "",
  results = [],
  scopeLabel = "",
  workspaceLeftOffset = 0,
  onClose,
}) {
  const navigate = useNavigate();
  const anchorRect = useSearchInputAnchor(isVisible);

  useEffect(() => {
    if (!isVisible) {
      return undefined;
    }

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose?.();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isVisible, onClose]);

  if (!isVisible) {
    return null;
  }

  const normalizedResults = results.map(normalizeResult).filter(Boolean);

  const handleSelect = (result) => {
    if (result.path) {
      navigate(result.path);
    }
    onClose?.();
  };

  const overlayStyle = anchorRect
    ? {
        top: `${anchorRect.top}px`,
        left: `${anchorRect.left}px`,
        width: `${anchorRect.width}px`,
        zIndex: Z_INDEX_LAYERS.dropdowns,
      }
    : {
        top: "56px",
        right: "20px",
        width: "420px",
        zIndex: Z_INDEX_LAYERS.dropdowns,
      };

  const overlay = (
    <div
      className="search-results-overlay"
      role="listbox"
      aria-label="Подсказки поиска"
      style={overlayStyle}
      data-workspace-left-offset={Number(workspaceLeftOffset) || 0}
    >
      {scopeLabel ? (
        <div className="search-results-overlay__scope">{scopeLabel}</div>
      ) : null}

      <div className="search-results-overlay__body">
        {isLoading ? (
          <div className="search-results-overlay__state">Поиск...</div>
        ) : error ? (
          <div className="search-results-overlay__state is-error">{error}</div>
        ) : normalizedResults.length === 0 ? (
          <div className="search-results-overlay__state">Ничего не найдено</div>
        ) : (
          <ul className="search-results-overlay__list">
            {normalizedResults.map((result) => (
              <li key={result.id}>
                <button
                  type="button"
                  role="option"
                  className="search-results-overlay__item"
                  onClick={() => handleSelect(result)}
                >
                  <span className="search-results-overlay__title">{result.title}</span>
                  {result.subtitle ? (
                    <span className="search-results-overlay__subtitle">
                      {result.subtitle}
                    </span>
                  ) : null}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );

  return createPortal(overlay, document.body);
}

export { normalizeResult };
