import { Component, lazy, Suspense, useState } from "react";

const UniversalTableViewLazy = lazy(() =>
  import("../../../modules/universalTable").then((module) => {
    if (!module.UniversalTableView) {
      throw new Error("UniversalTableView export is missing");
    }

    return { default: module.UniversalTableView };
  })
);

class LegacyStorageSupportErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error) {
    this.props.onError?.(error);
  }

  componentDidUpdate(prevProps) {
    if (prevProps.resetKey !== this.props.resetKey && this.state.error) {
      this.setState({ error: null });
    }
  }

  render() {
    if (this.state.error) {
      return this.props.fallback;
    }

    return this.props.children;
  }
}

function SupportModeLoadingState() {
  return (
    <div
      className="legacy-storage-support-boundary__loading"
      role="status"
      aria-live="polite"
    >
      Загрузка legacy-таблицы...
    </div>
  );
}

function SupportModeErrorState({ onRetry }) {
  return (
    <div className="legacy-storage-support-boundary__error" role="alert">
      <p style={{ margin: 0 }}>Не удалось загрузить legacy-таблицу</p>
      <button
        type="button"
        className="legacy-storage-placeholder__button"
        onClick={onRetry}
      >
        Повторить
      </button>
    </div>
  );
}

/**
 * Lazy boundary for existing legacy Universal Table storage support runtime.
 * UniversalTableView is loaded only through dynamic import.
 */
export default function LegacyStorageSupportModeBoundary(props) {
  const [resetKey, setResetKey] = useState(0);
  const [loadError, setLoadError] = useState(null);

  const handleRetry = () => {
    setLoadError(null);
    setResetKey((value) => value + 1);
  };

  if (loadError) {
    return <SupportModeErrorState onRetry={handleRetry} />;
  }

  return (
    <div
      className="legacy-storage-support-boundary"
      data-legacy-storage-support-boundary="true"
    >
      <LegacyStorageSupportErrorBoundary
        key={resetKey}
        resetKey={resetKey}
        onError={setLoadError}
        fallback={<SupportModeErrorState onRetry={handleRetry} />}
      >
        <Suspense fallback={<SupportModeLoadingState />}>
          <UniversalTableViewLazy {...props} />
        </Suspense>
      </LegacyStorageSupportErrorBoundary>
    </div>
  );
}
