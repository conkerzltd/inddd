import { useState, useCallback, useRef } from "react";

const HIGHLIGHT_DURATION_MS = 2500;

export function useTicketHighlight() {
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const highlight = useCallback((ticketId: string | null | undefined) => {
    if (!ticketId) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    setHighlightId(ticketId);
    timerRef.current = setTimeout(() => {
      setHighlightId(null);
      timerRef.current = null;
    }, HIGHLIGHT_DURATION_MS);
  }, []);

  return { highlightId, highlight };
}

/** CSS classes to apply on highlighted rows/cards — ring-based, no layout shift */
export const HIGHLIGHT_ROW_CLASS =
  "ring-2 ring-primary/40 bg-primary/5 transition-all duration-500 ease-in-out";
export const HIGHLIGHT_CARD_CLASS =
  "ring-2 ring-primary/40 bg-primary/5 transition-all duration-500 ease-in-out";
