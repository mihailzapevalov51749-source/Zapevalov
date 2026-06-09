import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useLocation } from "react-router-dom";

import {
  YASII_PRESENTATION,
  isYasiiPanelPresentation,
  resolveInitialYasiiPresentation,
} from "../presentation/yasiiPresentationState.js";
import {
  readYasiiPinned,
  writeYasiiPinned,
  YASII_PINNED_CHANGED_EVENT,
} from "../workspace/yasiiWorkspaceModeStorage.js";

const YasiiAssistantContext = createContext(null);

const DEFAULT_WELCOME_MESSAGE =
  "ЯСИИ — цифровой сотрудник платформы. Задайте вопрос о текущем контексте.";

function isYasiiWorkspaceRoute(pathname) {
  return pathname === "/yasii" || pathname.startsWith("/yasii/");
}

function YasiiPresentationRouteSync({ presentation, leaveYasiiPageMinimized }) {
  const location = useLocation();

  useEffect(() => {
    if (isYasiiWorkspaceRoute(location.pathname)) {
      return;
    }

    if (presentation === YASII_PRESENTATION.PAGE) {
      leaveYasiiPageMinimized();
    }
  }, [leaveYasiiPageMinimized, location.pathname, presentation]);

  return null;
}

function createWelcomeMessage(text = DEFAULT_WELCOME_MESSAGE) {
  return {
    id: "yasii-embedded-welcome",
    role: "yasii",
    text,
  };
}

export function YasiiAssistantProvider({ children }) {
  const [isPinned, setIsPinned] = useState(() => readYasiiPinned());
  const [presentation, setPresentation] = useState(() =>
    resolveInitialYasiiPresentation(readYasiiPinned()),
  );
  const [messages, setMessages] = useState(() => [createWelcomeMessage()]);

  const isFloatingOpen = isYasiiPanelPresentation(presentation);

  useEffect(() => {
    const handlePinnedChanged = (event) => {
      setIsPinned(Boolean(event?.detail?.pinned));
    };

    window.addEventListener(YASII_PINNED_CHANGED_EVENT, handlePinnedChanged);
    return () => {
      window.removeEventListener(YASII_PINNED_CHANGED_EVENT, handlePinnedChanged);
    };
  }, []);

  const setFloatingOpen = useCallback((open) => {
    setPresentation((current) => {
      if (open) {
        return YASII_PRESENTATION.PANEL;
      }

      if (current === YASII_PRESENTATION.PANEL) {
        return YASII_PRESENTATION.CLOSED;
      }

      return current;
    });
  }, []);

  const enterYasiiPage = useCallback(() => {
    setPresentation(YASII_PRESENTATION.PAGE);
  }, []);

  const leaveYasiiPageToPanel = useCallback(() => {
    setPresentation(YASII_PRESENTATION.PANEL);
  }, []);

  const leaveYasiiPageMinimized = useCallback(() => {
    setPresentation(YASII_PRESENTATION.CLOSED);
  }, []);

  const togglePinned = useCallback(() => {
    const nextPinned = !isPinned;
    setIsPinned(nextPinned);
    writeYasiiPinned(nextPinned);

    if (nextPinned) {
      setPresentation((current) =>
        current === YASII_PRESENTATION.PAGE ? current : YASII_PRESENTATION.PANEL,
      );
      return;
    }

    setPresentation((current) =>
      current === YASII_PRESENTATION.PANEL ? YASII_PRESENTATION.CLOSED : current,
    );
  }, [isPinned]);

  const value = useMemo(
    () => ({
      isPinned,
      presentation,
      isFloatingOpen,
      setFloatingOpen,
      enterYasiiPage,
      leaveYasiiPageToPanel,
      leaveYasiiPageMinimized,
      togglePinned,
      messages,
      setMessages,
      resetWelcomeMessage: (welcomeMessage) => {
        setMessages([createWelcomeMessage(welcomeMessage || DEFAULT_WELCOME_MESSAGE)]);
      },
    }),
    [
      enterYasiiPage,
      isFloatingOpen,
      isPinned,
      leaveYasiiPageMinimized,
      leaveYasiiPageToPanel,
      messages,
      presentation,
      togglePinned,
    ],
  );

  return (
    <YasiiAssistantContext.Provider value={value}>
      <YasiiPresentationRouteSync
        presentation={presentation}
        leaveYasiiPageMinimized={leaveYasiiPageMinimized}
      />
      {children}
    </YasiiAssistantContext.Provider>
  );
}

export function useYasiiAssistantSession() {
  return useContext(YasiiAssistantContext);
}
