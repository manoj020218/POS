import { useRef } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';

const longPressThresholdMs = 500;

export type LongPressHandlers = {
  onPointerCancel: (event: ReactPointerEvent) => void;
  onPointerDown: (event: ReactPointerEvent) => void;
  onPointerLeave: (event: ReactPointerEvent) => void;
  onPointerUp: (event: ReactPointerEvent) => void;
};

/**
 * Distinguishes a plain tap from a long press on the same element without a
 * gesture library. `onTap` fires on a normal quick release; `onLongPress`
 * fires (and suppresses `onTap`) once the pointer has been held down for
 * `longPressThresholdMs`.
 */
export const useLongPress = (onTap: () => void, onLongPress: () => void): LongPressHandlers => {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressFiredRef = useRef(false);

  const clear = () => {
    if (timeoutRef.current !== null) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  };

  return {
    onPointerCancel: () => {
      clear();
    },
    onPointerDown: () => {
      longPressFiredRef.current = false;
      clear();
      timeoutRef.current = setTimeout(() => {
        longPressFiredRef.current = true;
        onLongPress();
      }, longPressThresholdMs);
    },
    onPointerLeave: () => {
      clear();
    },
    onPointerUp: () => {
      clear();
      if (!longPressFiredRef.current) {
        onTap();
      }
    }
  };
};
