"use client";

import { useDirection } from "@base-ui/react/direction-provider";
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
import { formatLightboxSwipeFollow } from "../utils/lightbox-indicator";
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

/** The boxes of the active thumbnail and its neighbours, in the list. */
type IndicatorBoxes = {
  active: LightboxRect;
  previous: LightboxRect | null;
  next: LightboxRect | null;
};

function isSameRect(a: LightboxRect | null, b: LightboxRect | null): boolean {
  if (a === null || b === null) return a === b;
  return (
    a.left === b.left &&
    a.top === b.top &&
    a.width === b.width &&
    a.height === b.height
  );
}

function isSameBoxes(a: IndicatorBoxes | null, b: IndicatorBoxes): boolean {
  return (
    a !== null &&
    isSameRect(a.active, b.active) &&
    isSameRect(a.previous, b.previous) &&
    isSameRect(a.next, b.next)
  );
}

/**
 * Marks the active thumbnail with one element that moves from thumbnail to
 * thumbnail, like Base UI's `Tabs.Indicator`. Place it in
 * `Lightbox.ThumbnailList`, after the function child, and make the list
 * `position: relative`: it gets the active thumbnail's box in the list as
 * CSS variables, and scrolls with the list. While a swipe drags the slides,
 * they move towards the next or previous thumbnail with it. Style it with
 * them, and a transition that is off during the drag:
 * `left: var(--active-thumbnail-left)`. Hidden from screen readers; renders
 * nothing until it has measured a thumbnail.
 * Renders a `<span>` element.
 */
export function LightboxThumbnailIndicator(
  props: LightboxThumbnailIndicatorProps,
): React.ReactElement | null {
  const { render, ref, style, ...elementProps } = props;

  const { items, index, activationDirection } = useLightboxRootContext();
  const { element: list, getThumbnail } = useLightboxThumbnailListContext();
  const direction = useDirection();
  const [boxes, setBoxes] = React.useState<IndicatorBoxes | null>(null);

  const measure = useStableCallback(() => {
    const thumbnail = getThumbnail(index);
    if (!list || !thumbnail) {
      setBoxes(null);
      return;
    }
    // In the list's content, inside its border: the indicator scrolls with it.
    const listRect = list.getBoundingClientRect();
    const offset = {
      left: list.clientLeft - list.scrollLeft,
      top: list.clientTop - list.scrollTop,
    };
    const boxOf = (element: HTMLElement | undefined) =>
      element
        ? getLightboxRelativeRect(
            element.getBoundingClientRect(),
            listRect,
            offset,
          )
        : null;
    // The neighbours, to move towards while a swipe drags the slides.
    const next: IndicatorBoxes = {
      active: boxOf(thumbnail) as LightboxRect,
      previous: boxOf(getThumbnail(index - 1)),
      next: boxOf(getThumbnail(index + 1)),
    };
    setBoxes((current) => (isSameBoxes(current, next) ? current : next));
  });

  useIsoLayoutEffect(measure, [measure, index, list]);

  // A thumbnail that changes size (a CSS transition that widens the active
  // one) moves the active thumbnail's box: follow it frame by frame.
  useIsoLayoutEffect(() => {
    if (!list || typeof ResizeObserver === "undefined") return undefined;
    const observer = new ResizeObserver(measure);
    observer.observe(list);
    for (let itemIndex = 0; itemIndex < items.length; itemIndex += 1) {
      const thumbnail = getThumbnail(itemIndex);
      if (thumbnail) observer.observe(thumbnail);
    }
    return () => observer.disconnect();
  }, [list, items, getThumbnail, measure]);

  const state: LightboxThumbnailIndicatorState = React.useMemo(
    () => ({ activationDirection }),
    [activationDirection],
  );

  // The slides move right to bring the previous item in, left in right-to-left.
  const previousSign = direction === "rtl" ? -1 : 1;
  const follow = (key: keyof LightboxRect) =>
    boxes
      ? formatLightboxSwipeFollow(
          boxes.active[key],
          boxes.previous?.[key] ?? null,
          boxes.next?.[key] ?? null,
          previousSign,
        )
      : undefined;
  const cssVars = boxes
    ? ({
        [activeThumbnailLeft]: follow("left"),
        [activeThumbnailTop]: follow("top"),
        [activeThumbnailWidth]: follow("width"),
        [activeThumbnailHeight]: follow("height"),
      } as React.CSSProperties)
    : undefined;

  return useRender({
    defaultTagName: "span",
    render,
    ref,
    state,
    enabled: boxes !== null,
    stateAttributesMapping: LIGHTBOX_STATE_ATTRIBUTES,
    props: mergeProps<"span">(
      { role: "presentation", "aria-hidden": true },
      elementProps,
      { style: { ...style, ...cssVars } },
    ),
  });
}
