import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  readYasiiPinned,
  writeYasiiPinned,
  YASII_PINNED_CHANGED_EVENT,
} from "../workspace/yasiiWorkspaceModeStorage.js";

const YasiiAssistantContext = createContext(null);

const DEFAULT_WELCOME_MESSAGE =
  "ЯСИИ — цифровой сотрудник платформы. Задайте вопрос о текущем контексте.";

function createWelcomeMessage(text = DEFAULT_WELCOME_MESSAGE) {
  return {
    id: "yasii-embedded-welcome",
    role: "yasii",
    text,
  };
}

export function YasiiAssistantProvider({ children }) {
  const [isPinned, setIsPinned] = useState(() => readYasiiPinned());
  const [isFloatingOpen, setFloatingOpen] = useState(() => readYasiiPinned());
  const [messages, setMessages] = useState(() => [createWelcomeMessage()]);

  useEffect(() => {
    const handlePinnedChanged = (event) => {
      setIsPinned(Boolean(event?.detail?.pinned));
    };

    window.addEventListener(YASII_PINNED_CHANGED_EVENT, handlePinnedChanged);
    return () => {
      window.removeEventListener(YASII_PINNED_CHANGED_EVENT, handlePinnedChanged);
    };
  }, []);

  useEffect(() => {
    if (isPinned) {
      setFloatingOpen(true);
    }
  }, [isPinned]);

  const togglePinned = useCallback(() => {
    const nextPinned = !isPinned;
    setIsPinned(nextPinned);
    writeYasiiPinned(nextPinned);
    if (nextPinned) {
      setFloatingOpen(true);
    }
  }, [isPinned]);

  const value = useMemo(
    () => ({
      isPinned,
      isFloatingOpen,
      setFloatingOpen,
      togglePinned,
      messages,
      setMessages,
      resetWelcomeMessage: (welcomeMessage) => {
        setMessages([createWelcomeMessage(welcomeMessage || DEFAULT_WELCOME_MESSAGE)]);
      },
    }),
    [isPinned, isFloatingOpen, messages, togglePinned],
  );

  return (
    <YasiiAssistantContext.Provider value={value}>
      {children}
    </YasiiAssistantContext.Provider>
  );
}

export function useYasiiAssistantSession() {
  return useContext(YasiiAssistantContext);
}
