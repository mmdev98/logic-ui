"use client";

import { mergeProps } from "@base-ui/react/merge-props";
import { useRender } from "@base-ui/react/use-render";
import { useIsoLayoutEffect } from "@base-ui/utils/useIsoLayoutEffect";
import { useStableCallback } from "@base-ui/utils/useStableCallback";
import * as React from "react";
import { LIGHTBOX_STATE_ATTRIBUTES } from "../lightbox-state-attributes";
import { useLightboxRootContext } from "../root/lightbox-root-context";
import { useLightboxThumbnailListContext } from "../thumbnail-list/lightbox-thumbnail-list-context";
import type { LightboxActivationDirection, LightboxRect } from "../types";
import { getLightboxRelativeRect } from "../utils/lightbox-geometry";
import {
  activeThumbnailHeight,
  activeThumbnailLeft,
  activeThumbnailTop,
  activeThumbnailWidth,
} from "./lightbox-thumbnail-indicator-css-vars";

export type LightboxThumbnailIndicatorState = {
  /** Side of the previous item the item shown came from, on screen. */
  activationDirection: LightboxActivationDirection;
};

export type LightboxThumbnailIndicatorProps = useRender.ComponentProps<
  "span",
  LightboxThumbnailIndicatorState
>;

function isSameRect(a: LightboxRect | null, b: LightboxRect): boolean {
  return (
    a !== null &&
    a.left === b.left &&
    a.top === b.top &&
    a.width === b.width &&
    a.height === b.height
  );
}

/**
 * Marks the active thumbnail with one element that moves from thumbnail to
 * thumbnail, like Base UI's `Tabs.Indicator`. Place it in
 * `Lightbox.ThumbnailList`, after the function child, and make the list
 * `position: relative`: it gets the active thumbnail's box in the list as
 * CSS variables, and scrolls with the list. Style it with them and a
 * transition: `left: var(--active-thumbnail-left)`. Hidden from screen
 * readers; renders nothing until it has measured a thumbnail.
 * Renders a `<span>` element.
 */
export function LightboxThumbnailIndicator(
  props: LightboxThumbnailIndicatorProps,
): React.ReactElement | null {
  const { render, ref, style, ...elementProps } = props;

  const { index, activationDirection } = useLightboxRootContext();
  const { element: list, getThumbnail } = useLightboxThumbnailListContext();
  const [rect, setRect] = React.useState<LightboxRect | null>(null);

  const measure = useStableCallback(() => {
    const thumbnail = getThumbnail(index);
    if (!list || !thumbnail) {
      setRect(null);
      return;
    }
    // In the list's content, inside its border: the indicator scrolls with it.
    const next = getLightboxRelativeRect(
      thumbnail.getBoundingClientRect(),
      list.getBoundingClientRect(),
      {
        left: list.clientLeft - list.scrollLeft,
        top: list.clientTop - list.scrollTop,
      },
    );
    setRect((current) => (isSameRect(current, next) ? current : next));
  });

  useIsoLayoutEffect(measure, [measure, index, list]);

  useIsoLayoutEffect(() => {
    if (!list || typeof ResizeObserver === "undefined") return undefined;
    const observer = new ResizeObserver(measure);
    observer.observe(list);
    return () => observer.disconnect();
  }, [list, measure]);

  const state: LightboxThumbnailIndicatorState = React.useMemo(
    () => ({ activationDirection }),
    [activationDirection],
  );

  const cssVars = rect
    ? ({
        [activeThumbnailLeft]: `${rect.left}px`,
        [activeThumbnailTop]: `${rect.top}px`,
        [activeThumbnailWidth]: `${rect.width}px`,
        [activeThumbnailHeight]: `${rect.height}px`,
      } as React.CSSProperties)
    : undefined;

  return useRender({
    defaultTagName: "span",
    render,
    ref,
    state,
    enabled: rect !== null,
    stateAttributesMapping: LIGHTBOX_STATE_ATTRIBUTES,
    props: mergeProps<"span">(
      { role: "presentation", "aria-hidden": true },
      elementProps,
      { style: { ...style, ...cssVars } },
    ),
  });
}
