"use client";

import { mergeProps } from "@base-ui/react/merge-props";
import { useRender } from "@base-ui/react/use-render";
import { ownerWindow } from "@base-ui/utils/owner";
import { useIsoLayoutEffect } from "@base-ui/utils/useIsoLayoutEffect";
import { useMergedRefs } from "@base-ui/utils/useMergedRefs";
import { useStableCallback } from "@base-ui/utils/useStableCallback";
import { useValueAsRef } from "@base-ui/utils/useValueAsRef";
import * as React from "react";
import {
  LIGHTBOX_RENDERED_NEIGHBORS,
  LIGHTBOX_SETTLE_DURATION,
} from "../constants";
import { LIGHTBOX_STATE_ATTRIBUTES } from "../lightbox-state-attributes";
import { TRACK_PROGRESS } from "./lightbox-viewport-track";
import { swipeDistance } from "./lightbox-viewport-css-vars";
import { useLightboxRootContext } from "../root/lightbox-root-context";
import type { LightboxRootActivationDirection } from "../root/lightbox-root";
import { prefersLightboxReducedMotion } from "../utils/lightbox-flight";
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
  activationDirection: LightboxRootActivationDirection;
};

export interface LightboxViewportProps extends Omit<
  useRender.ComponentProps<"div", LightboxViewportState>,
  "children"
> {
  /**
   * Renders one item: a `Lightbox.Slide` with a `Lightbox.Image` or other
   * content inside. Receives the item as passed to `items`. Called only for
   * the active item and its `neighbors`, and the items a swipe brings into view.
   */
  // The items can have any shape, like Base UI's `Combobox.List` children.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  children: (item: any, index: number) => React.ReactNode;
  /**
   * Items rendered on each side of the one shown. Raise it for a transition
   * that shows more than the next item, like a coverflow; the others stay
   * empty until they come near. While swiping, items around the visible part
   * of the track are also rendered.
   * @default 1
   */
  neighbors?: number | undefined;
}

const INITIAL_METRICS: LightboxViewportContextValue = {
  width: 0,
  gap: 0,
  directionSign: 1,
};

/**
 * The window the slides swipe through: a carousel region that handles the
 * gestures (swipe, pinch, double tap, pan, pull to dismiss, wheel zoom). Give
 * it a size (usually `position: absolute; inset: 0` in the popup), and set
 * the space between slides with `column-gap` (`gap-4`).
 * One slide of finger travel is the viewport's width plus that gap. When the
 * CSS draws the slides closer together, as a coverflow does, set
 * `--lightbox-swipe-distance` on it so they follow the finger.
 * It doesn't clip: the slides next to the one shown, the zoomed image and the
 * media pulled to dismiss are drawn past its edges. In a viewer smaller than
 * the screen, clip them with `overflow: hidden`; leave it off for a pulled
 * card or a 3D transition to leave the viewport.
 * A press that starts on a control inside a slide (a button, a link, a
 * player) is left to that control, and so is one on content marked with
 * Base UI's `data-base-ui-swipe-ignore`, such as a 3D model that rotates
 * with a drag: with no value, all its drags; with `"x"` or `"y"`, only
 * those along that axis. It has `data-swiping` while a finger or
 * the mouse drags, and `data-activation-direction` after the item shown
 * changes.
 * Renders a `<div>` element.
 */
export function LightboxViewport(
  props: LightboxViewportProps,
): React.ReactElement {
  const {
    children,
    neighbors = LIGHTBOX_RENDERED_NEIGHBORS,
    render,
    ref,
    ...elementProps
  } = props;

  const root = useLightboxRootContext();
  const {
    items,
    values,
    index,
    activeValue,
    phase,
    zoomed,
    activationDirection,
    takeTrackTransition,
  } = root;

  const viewportRef = React.useRef<HTMLDivElement | null>(null);
  const trackRef = React.useRef<HTMLDivElement | null>(null);
  // Measures `--lightbox-swipe-distance`, which can be any CSS length.
  const swipeProbeRef = React.useRef<HTMLDivElement | null>(null);
  // Track px per px of finger travel: 1 unless `--lightbox-swipe-distance` is set.
  const swipeRatioRef = React.useRef(1);
  const mergedRef = useMergedRefs(ref, viewportRef);
  const [metrics, setMetrics] = React.useState(INITIAL_METRICS);
  const metricsRef = React.useRef(metrics);
  const offsetRef = React.useRef(0);
  const stopOffsetRef = React.useRef<(() => void) | null>(null);
  const swipeTargetRef = React.useRef<number | null>(null);
  const [visibleRange, setVisibleRange] = React.useState({
    start: index,
    end: index,
  });

  const stride = metrics.width + metrics.gap;

  /** Positions the track: the active item, moved by the swipe offset. */
  const writeTrack = useStableCallback(() => {
    const track = trackRef.current;
    if (!track) return;
    const { directionSign } = metricsRef.current;
    const x = (-index * stride + offsetRef.current) * directionSign;
    track.style.transform = `translate3d(${x}px, 0px, 0px)`;
    // In slides, for each slide's `--lightbox-slide-progress`.
    track.style.setProperty(
      TRACK_PROGRESS,
      String(stride > 0 ? Math.round((x / stride) * 10000) / 10000 : 0),
    );
    // The swipe, for the app's CSS and `Lightbox.ThumbnailIndicator`.
    const movement = offsetRef.current * directionSign;
    const progress = stride > 0 ? movement / stride : 0;
    root.setSwipe(
      Math.round(movement * 100) / 100,
      Math.round(progress * 10000) / 10000,
    );
    // Only re-render when a slide enters or leaves the visible window, not
    // on every frame. Keep both sides of a partially crossed slide mounted.
    const position = stride > 0 ? index - offsetRef.current / stride : index;
    const start = Math.max(0, Math.floor(position) - neighbors);
    const end = Math.min(items.length - 1, Math.ceil(position) + neighbors);
    setVisibleRange((current) =>
      current.start === start && current.end === end ? current : { start, end },
    );
  });

  const setOffset = useStableCallback((offset: number) => {
    stopOffsetRef.current?.();
    stopOffsetRef.current = null;
    offsetRef.current = offset;
    writeTrack();
  });

  // How fast the track settles after a released swipe; 1 otherwise.
  const strengthRef = React.useRef(1);
  const setStrength = useStableCallback((strength: number) => {
    strengthRef.current = strength;
    root.setSwipeStrength(strength);
  });

  const animateOffset = useStableCallback(
    (offset: number, onComplete?: () => void) => {
      stopOffsetRef.current?.();
      const from = offsetRef.current;
      const viewport = viewportRef.current;
      const reducedMotion =
        viewport && prefersLightboxReducedMotion(ownerWindow(viewport));
      stopOffsetRef.current = tweenLightbox(
        reducedMotion ? 0 : LIGHTBOX_SETTLE_DURATION * strengthRef.current,
        (progress) => {
          offsetRef.current = from + (offset - from) * progress;
          writeTrack();
        },
        () => {
          setStrength(1);
          onComplete?.();
        },
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
      Math.abs(index - lastIndex) > 1 && swipeTargetRef.current !== index
        ? { from: lastIndex, to: index }
        : null,
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
    const distance = swipeProbeRef.current?.getBoundingClientRect().width ?? 0;
    swipeRatioRef.current =
      distance > 0 ? (next.width + next.gap) / distance : 1;
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
    if (swipeProbeRef.current) observer.observe(swipeProbeRef.current);
    return () => observer.disconnect();
  }, [measure]);

  // Read when the index changes, without re-running the slide.
  const phaseRef = useValueAsRef(phase);
  const valuesRef = useValueAsRef(values);
  const activeValueRef = useValueAsRef(activeValue);
  const shownRef = React.useRef({ index, value: activeValue });

  // After the index changes, the track slides from where the swipe left it
  // (or from the previous item) to the new one. Every dependency but `index`
  // is stable, so a context change mid-slide doesn't restart or cut it.
  useIsoLayoutEffect(() => {
    const shown = shownRef.current;
    const value = activeValueRef.current;
    shownRef.current = { index, value };
    // The app changed `value` itself while the viewer is open (its own next
    // button, a timer): it slides in like Next. Not when items were added
    // before the item shown, or it was removed.
    const isNavigation =
      phaseRef.current === "open" &&
      shown.value !== value &&
      shown.value !== undefined &&
      valuesRef.current.includes(shown.value);
    const transition =
      takeTrackTransition() ??
      (isNavigation ? { step: index - shown.index, offset: 0 } : null);
    const isSwipe = swipeTargetRef.current === index;
    swipeTargetRef.current = null;
    if (transition && stride > 0) {
      // Only a programmatic jump starts one item away. A swipe keeps the
      // full displacement, so releasing it doesn't move the track backwards.
      const step = isSwipe
        ? index - shown.index
        : Math.sign(index - shown.index);
      // A controlled app can accept later, after the track has started back.
      setOffset((isSwipe ? offsetRef.current : 0) + step * stride);
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
    getSwipeRatio: () => swipeRatioRef.current,
    directionSign: metrics.directionSign,
    getOffset: () => offsetRef.current,
    setOffset,
    animateOffset,
    setStrength,
    onSwipe: (step) => {
      swipeTargetRef.current = index + step;
    },
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
          <React.Fragment>
            <div
              ref={trackRef}
              style={{
                position: "relative",
                width: "100%",
                height: "100%",
                willChange: "transform",
                // A `perspective` on the viewport reaches slides turned in 3D.
                transformStyle: "preserve-3d",
              }}
            >
              {items.map((item, itemIndex) => {
                let position: number | null =
                  isLightboxItemRendered(itemIndex, index, neighbors) ||
                  (itemIndex >= visibleRange.start &&
                    itemIndex <= visibleRange.end)
                    ? itemIndex
                    : null;
                // During a jump, the item it left takes the neighbour's slot.
                if (jumpSlot !== null && itemIndex === jumpSlot)
                  position = null;
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
            {/* As wide as `--lightbox-swipe-distance`, or 0 without it. */}
            <div
              ref={swipeProbeRef}
              aria-hidden
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: `var(${swipeDistance}, 0px)`,
                height: 0,
                visibility: "hidden",
                pointerEvents: "none",
              }}
            />
          </React.Fragment>
        ),
      },
      elementProps,
    ),
  });

  return (
    <LightboxViewportContext value={metrics}>{element}</LightboxViewportContext>
  );
}
