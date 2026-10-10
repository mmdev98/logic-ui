"use client";

import { AnimationFrame } from "@base-ui/utils/useAnimationFrame";
import { useIsoLayoutEffect } from "@base-ui/utils/useIsoLayoutEffect";
import * as React from "react";

/**
 * Whether to set `data-starting-style` now: for one frame after `key`
 * changes while `enabled`, like Base UI does when a popup appears. The app
 * styles where its content starts from and a CSS transition animates it to
 * rest, so new content (the next item's caption) animates in.
 */
export function useLightboxStartingStyle(
  key: unknown,
  enabled: boolean,
): boolean {
  const [lastKey, setLastKey] = React.useState(key);
  const [starting, setStarting] = React.useState(false);

  if (key !== lastKey) {
    setLastKey(key);
    if (enabled) setStarting(true);
  }

  useIsoLayoutEffect(() => {
    if (!starting) return undefined;
    const frame = AnimationFrame.request(() => setStarting(false));
    return () => AnimationFrame.cancel(frame);
  }, [starting, key]);

  return starting;
}
