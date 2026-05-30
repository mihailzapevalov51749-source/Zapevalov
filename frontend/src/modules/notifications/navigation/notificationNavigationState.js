function normalizeId(value) {
  return String(value ?? "").trim();
}

export function ensureNavigationState() {
  if (!window.__YASNOPRO_NAVIGATION_STATE__) {
    window.__YASNOPRO_NAVIGATION_STATE__ = {
      stack: [],
      current: null,
    };
  }

  return window.__YASNOPRO_NAVIGATION_STATE__;
}

export function pushNavigationState(state) {
  const navigationState = ensureNavigationState();

  if (navigationState.current) {
    navigationState.stack.push(navigationState.current);
  }

  navigationState.current = state;
}

export function popNavigationState() {
  const navigationState = ensureNavigationState();
  const previous = navigationState.stack.pop() || null;
  navigationState.current = previous;
  return previous;
}

export function createRuntimeRouteNavigator(navigate) {
  return (runtimeRoute) => {
    if (!runtimeRoute) {
      return;
    }

    if (typeof navigate === "function") {
      navigate(runtimeRoute);
      return;
    }

    window.history.pushState({}, "", runtimeRoute);
    window.dispatchEvent(new PopStateEvent("popstate"));
  };
}

export function shouldReturnToPreviousLocation() {
  return Boolean(window.__YASNOPRO_PENDING_NOTIFICATION_TARGET__);
}

export function handleReturnToPreviousLocation({ activePageId, onSelectPage }) {
  const previous = popNavigationState();

  if (!previous) {
    return;
  }

  if (
    previous.pageId &&
    normalizeId(previous.pageId) !== normalizeId(activePageId)
  ) {
    onSelectPage?.(previous.pageId);
  }
}
