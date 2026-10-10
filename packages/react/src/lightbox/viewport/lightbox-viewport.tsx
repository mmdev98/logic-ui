"use client";

import { mergeProps } from "@base-ui/react/merge-props";
import { useRender } from "@base-ui/react/use-render";
import { ownerWindow } from "@base-ui/utils/owner";
import { useIsoLayoutEffect } from "@base-ui/utils/useIsoLayoutEffect";
import { useMergedRefs } from "@base-ui/utils/useMergedRefs";
import { useStableCallback } from "@base-ui/utils/useStableCallback";
import * as React from "react";
import { LIGHTBOX_SETTLE_DURATION } from "../constants";
import { LIGHTBOX_STATE_ATTRIBUTES } from "../lightbox-state-attributes";
import { useLightboxRootContext } from "../root/lightbox-root-context";
import type { LightboxActivationDirection } from "../types";
import { isLightboxItemRendered } from "../utils/lightbox-items";
import { tweenLightbox } from "../utils/lightbox-motion";
import {
  LightboxViewportContext,
  LightboxViewportSlideContext,
  type LightboxViewportContextValue,
} from "./lightbox-viewport-context";
import { useLightboxGestures } from "./use-lightbox-gestures";

export type LightboxViewportState = {
  /** Whether the active image is zoomed in. */
  zoomed: boolean;
  /** Side of the previous item the item shown came from, on screen. */
  activationDirection: LightboxActivationDirection;
};

export interface LightboxViewportProps extends Omit<
  useRender.ComponentProps<"div", LightboxViewportState>,
  "children"
> {
  /**
   * Renders one item: a `Lightbox.Slide` with a `Lightbox.Image` or other
   * content inside. Receives the item as passed to `items`. Called only for
   * the active item and its neighbours.
   */
  // The items can have any shape, like Base UI's `Combobox.List` children.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  children: (item: any, index: number) => React.ReactNode;
}

const INITIAL_METRICS: LightboxViewportContextValue = {
  width: 0,
  gap: 0,
  directionSign: 1,
};

/**
 * The window the slides swipe through: a carousel region that clips them and
 * handles the gestures (swipe, pinch, double tap, pan, drag to close, wheel
 * zoom). Give it a size (usually `position: absolute; inset: 0` in the
 * popup), and set the space between slides with `column-gap` (`gap-4`).
 * It has `data-dragging` while a finger or the mouse drags, and
 * `data-activation-direction` after the item shown changes.
 * Renders a `<div>` element.
 */
export function LightboxViewport(
  props: LightboxViewportProps,
): React.ReactElement {
  const { children, render, ref, ...elementProps } = props;

  const root = useLightboxRootContext();
  const {
    items,
    values,
    index,
    zoomed,
    activationDirection,
    takeTrackTransition,
  } = root;

  const viewportRef = React.useRef<HTMLDivElement | null>(null);
  const trackRef = React.useRef<HTMLDivElement | null>(null);
  const mergedRef = useMergedRefs(ref, viewportRef);
  const [metrics, setMetrics] = React.useState(INITIAL_METRICS);
  const metricsRef = React.useRef(metrics);
  const offsetRef = React.useRef(0);
  const stopOffsetRef = React.useRef<(() => void) | null>(null);

  const stride = metrics.width + metrics.gap;

  /** Positions the track: the active item, moved by the swipe offset. */
  const writeTrack = useStableCallback(() => {
    const track = trackRef.current;
    if (!track) return;
    const { directionSign } = metricsRef.current;
    const x = (-index * stride + offsetRef.current) * directionSign;
    track.style.transform = `translate3d(${x}px, 0px, 0px)`;
  });

  const setOffset = useStableCallback((offset: number) => {
    stopOffsetRef.current?.();
    stopOffsetRef.current = null;
    offsetRef.current = offset;
    writeTrack();
  });

  const animateOffset = useStableCallback(
    (offset: number, onComplete?: () => void) => {
      stopOffsetRef.current?.();
      const from = offsetRef.current;
      stopOffsetRef.current = tweenLightbox(
        LIGHTBOX_SETTLE_DURATION,
        (progress) => {
          offsetRef.current = from + (offset - from) * progress;
          writeTrack();
        },
        onComplete,
      );
    },
  );

  // A jump of several items (a thumbnail, Home, End) slides like a step to a
  // neighbour: the item it leaves is drawn next to the new one until the
  // slide ends, instead of sliding past every item in between.
  const [jump, setJump] = React.useState<{ from: number; to: number } | null>(
    null,
  );
  const [lastIndex, setLastIndex] = React.useState(index);
  if (index !== lastIndex) {
    setLastIndex(index);
    setJump(
      Math.abs(index - lastIndex) > 1 ? { from: lastIndex, to: index } : null,
    );
  }
  const activeJump = jump?.to === index ? jump : null;
  // The slot next to the new item, on the side the jump came from.
  const jumpSlot = activeJump
    ? index - Math.sign(index - activeJump.from)
    : null;

  const measure = useStableCallback(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    const style = ownerWindow(viewport).getComputedStyle(viewport);
    const next: LightboxViewportContextValue = {
      width: viewport.clientWidth,
      gap: parseFloat(style.columnGap) || 0,
      directionSign: style.direction === "rtl" ? -1 : 1,
    };
    const current = metricsRef.current;
    if (
      current.width === next.width &&
      current.gap === next.gap &&
      current.directionSign === next.directionSign
    )
      return;
    metricsRef.current = next;
    setMetrics(next);
  });

  useIsoLayoutEffect(() => {
    measure();
    const viewport = viewportRef.current;
    if (!viewport || typeof ResizeObserver === "undefined") return undefined;
    const observer = new ResizeObserver(measure);
    observer.observe(viewport);
    return () => observer.disconnect();
  }, [measure]);

  // After the index changes, the track slides from where the swipe left it
  // (or from the previous item) to the new one. Every dependency but `index`
  // is stable, so a context change mid-slide doesn't restart or cut it.
  useIsoLayoutEffect(() => {
    const transition = takeTrackTransition();
    if (transition && stride > 0) {
      // A longer jump starts one item away, where the item it left is drawn.
      const step =
        Math.abs(transition.step) > 1
          ? Math.sign(transition.step)
          : transition.step;
      setOffset(transition.offset + step * stride);
      animateOffset(0, () => setJump(null));
    } else {
      setOffset(0);
      setJump(null);
    }
  }, [index, takeTrackTransition, setOffset, animateOffset]);

  useIsoLayoutEffect(writeTrack, [writeTrack, stride, metrics.directionSign]);

  React.useEffect(() => () => stopOffsetRef.current?.(), []);

  const gestures = useLightboxGestures({
    root,
    getViewport: () => viewportRef.current,
    getWidth: () => metricsRef.current.width,
    getStride: () => metricsRef.current.width + metricsRef.current.gap,
    directionSign: metrics.directionSign,
    getOffset: () => offsetRef.current,
    setOffset,
    animateOffset,
  });

  const state: LightboxViewportState = React.useMemo(
    () => ({ zoomed, activationDirection }),
    [zoomed, activationDirection],
  );

  const element = useRender({
    defaultTagName: "div",
    render,
    ref: mergedRef,
    state,
    stateAttributesMapping: LIGHTBOX_STATE_ATTRIBUTES,
    props: mergeProps<"div">(
      {
        // The WAI-ARIA carousel pattern.
        role: "region",
        "aria-roledescription": "carousel",
        "aria-label": "Gallery",
        // Its size and position come from the app (`position: absolute; inset: 0`).
        style: {
          overflow: "hidden",
          // The gestures handle every touch; the browser must not scroll or zoom.
          touchAction: "none",
          userSelect: "none",
          WebkitUserSelect: "none",
        },
        ...gestures,
        // The track moves the slides, never a scroll: undo one, such as the
        // browser revealing a focused element.
        onScroll: (event) => {
          const viewport = event.currentTarget;
          viewport.scrollLeft = 0;
          viewport.scrollTop = 0;
        },
        children: (
          <div
            ref={trackRef}
            style={{
              position: "relative",
              width: "100%",
              height: "100%",
              willChange: "transform",
            }}
          >
            {items.map((item, itemIndex) => {
              let position: number | null = isLightboxItemRendered(
                itemIndex,
                index,
              )
                ? itemIndex
                : null;
              // During a jump, the item it left takes the neighbour's slot.
              if (jumpSlot !== null && itemIndex === jumpSlot) position = null;
              if (activeJump && itemIndex === activeJump.from)
                position = jumpSlot;
              if (position === null) return null;
              return (
                <LightboxViewportSlideContext
                  key={values[itemIndex]}
                  value={{ index: itemIndex, position }}
                >
                  {children(item, itemIndex)}
                </LightboxViewportSlideContext>
              );
            })}
          </div>
        ),
      },
      elementProps,
    ),
  });

  return (
    <LightboxViewportContext value={metrics}>{element}</LightboxViewportContext>
  );
}
