"use client";

import { mergeProps } from "@base-ui/react/merge-props";
import { useRender } from "@base-ui/react/use-render";
import { useIsoLayoutEffect } from "@base-ui/utils/useIsoLayoutEffect";
import { useMergedRefs } from "@base-ui/utils/useMergedRefs";
import { useStableCallback } from "@base-ui/utils/useStableCallback";
import * as React from "react";
import { LIGHTBOX_STATE_ATTRIBUTES } from "../lightbox-state-attributes";
import { useLightboxRootContext } from "../root/lightbox-root-context";
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
 * thumbnail, like Base UI's `Tabs.Indicator`. Place it next to
 * `Lightbox.ThumbnailList`, in the same positioned box: it gets the active
 * thumbnail's box as CSS variables, relative to that box and following the
 * list as it scrolls. Style it with them and a transition:
 * `left: var(--active-thumbnail-left)`. Hidden from screen readers; renders
 * nothing until it has measured a thumbnail.
 * Renders a `<span>` element.
 */
export function LightboxThumbnailIndicator(
  props: LightboxThumbnailIndicatorProps,
): React.ReactElement | null {
  const { render, ref, style, ...elementProps } = props;

  const { index, activationDirection, thumbnailList } =
    useLightboxRootContext();
  const [rect, setRect] = React.useState<LightboxRect | null>(null);
  const elementRef = React.useRef<HTMLElement | null>(null);
  const mergedRef = useMergedRefs(ref, elementRef);

  const measure = useStableCallback(() => {
    const thumbnail = thumbnailList?.getThumbnail(index);
    const element = elementRef.current;
    if (!thumbnail || !thumbnailList) {
      setRect(null);
      return;
    }
    // Before the first measure there is no element yet: measure against the
    // list's box, which the indicator shares.
    const container =
      element?.offsetParent ?? thumbnailList.element.offsetParent;
    if (!container) return;
    const next = getLightboxRelativeRect(
      thumbnail.getBoundingClientRect(),
      container.getBoundingClientRect(),
      // Positions start inside the border.
      { left: container.clientLeft, top: container.clientTop },
    );
    setRect((current) => (isSameRect(current, next) ? current : next));
  });

  useIsoLayoutEffect(measure, [measure, index, thumbnailList]);

  useIsoLayoutEffect(() => {
    if (!thumbnailList) return undefined;
    const list = thumbnailList.element;
    list.addEventListener("scroll", measure, { passive: true });
    if (typeof ResizeObserver === "undefined") {
      return () => list.removeEventListener("scroll", measure);
    }
    const observer = new ResizeObserver(measure);
    observer.observe(list);
    return () => {
      list.removeEventListener("scroll", measure);
      observer.disconnect();
    };
  }, [thumbnailList, measure]);

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
    ref: mergedRef,
    state,
    enabled: rect !== null,
    stateAttributesMapping: LIGHTBOX_STATE_ATTRIBUTES,
    props: mergeProps<"span">(
      { role: "presentation", "aria-hidden": true },
      elementProps,
      {
        style: {
          ...style,
          ...cssVars,
        },
      },
    ),
  });
}
