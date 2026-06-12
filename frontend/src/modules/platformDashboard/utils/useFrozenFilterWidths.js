import { useEffect, useRef, useState } from "react";

import {
  computeFixedDateFilterWidth,
  computeSelectWidth,
} from "./computeFilterControlWidth";

/**
 * Computes filter control widths once per field and keeps them stable
 * while the user changes selected values.
 */
export function useFrozenFilterWidths(categories = [], eventTypes = []) {
  const categoryFrozenRef = useRef(false);
  const eventTypeFrozenRef = useRef(false);

  const [widths, setWidths] = useState(() => ({
    category: computeSelectWidth(["Все"]),
    eventType: computeSelectWidth(["Все"]),
    date: computeFixedDateFilterWidth(),
  }));

  useEffect(() => {
    if (categoryFrozenRef.current || categories.length === 0) {
      return;
    }

    categoryFrozenRef.current = true;
    setWidths((previous) => ({
      ...previous,
      category: computeSelectWidth(["Все", ...categories.map((item) => item.label)]),
    }));
  }, [categories]);

  useEffect(() => {
    if (eventTypeFrozenRef.current || eventTypes.length === 0) {
      return;
    }

    eventTypeFrozenRef.current = true;
    setWidths((previous) => ({
      ...previous,
      eventType: computeSelectWidth(["Все", ...eventTypes.map((item) => item.label)]),
    }));
  }, [eventTypes]);

  return widths;
}
