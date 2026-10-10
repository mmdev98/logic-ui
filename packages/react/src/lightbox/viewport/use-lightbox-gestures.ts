"use client";

import { ownerWindow } from "@base-ui/utils/owner";
import { useStableCallback } from "@base-ui/utils/useStableCallback";
import { useTimeout } from "@base-ui/utils/useTimeout";
import * as React from "react";
import {
  LIGHTBOX_DISMISS_DISTANCE,
  LIGHTBOX_DISMISS_VELOCITY,
  LIGHTBOX_DOUBLE_TAP_DELAY,
  LIGHTBOX_DOUBLE_TAP_DISTANCE,
  LIGHTBOX_DRAG_THRESHOLD,
  LIGHTBOX_SWIPE_DISTANCE,
  LIGHTBOX_SWIPE_VELOCITY,
  LIGHTBOX_ZOOM_SCALE,
} from "../constants";
import type {
  LightboxMediaEntry,
  LightboxRootContextValue,
} from "../root/lightbox-root-context";
import { LightboxPhase, type LightboxZoom } from "../types";
import {
  clampLightboxValue,
  clampLightboxZoom,
  LIGHTBOX_IDENTITY_DISMISS,
  getLightboxPanBounds,
  isLightboxZoomed,
  rubberbandLightboxOverflow,
  rubberbandLightboxValue,
  zoomLightboxAroundPoint,
} from "../utils/lightbox-geometry";
import {
  getLightboxSwipeStep,
  getLightboxSwipeStrength,
} from "../utils/lightbox-motion";

/** Velocity is measured over the last moves within this time (ms). */
const VELOCITY_WINDOW = 100;
/** A released pan glides on for this long at its speed (ms). */
const PAN_GLIDE_TIME = 200;
/** Share of a pinch past the zoom limits that still follows the fingers. */
const PINCH_OVERSHOOT = 0.3;

type Point = { x: number; y: number };
type Sample = Point & { time: number };

enum GestureMode {
  Idle,
  /** Pressed, not moved far enough to be a drag yet. */
  Press,
  Swipe,
  Pan,
  Dismiss,
  Pinch,
  /** A pinch ended with a finger still down; wait until it lifts. */
  Settled,
}

type GestureState = {
  mode: GestureMode;
  pointers: Map<number, Point>;
  pointerType: string;
  start: Sample;
  samples: Sample[];
  zoomStart: LightboxZoom;
  offsetStart: number;
  pinchDistance: number;
  pinchCenter: Point;
  lastTap: Sample | null;
};

export interface UseLightboxGesturesOptions {
  root: LightboxRootContextValue;
  getViewport: () => HTMLElement | null;
  getWidth: () => number;
  /** Width of an item plus the gap after it (px). */
  getStride: () => number;
  directionSign: 1 | -1;
  getOffset: () => number;
  /** Moves the track, in px along the reading direction. */
  setOffset: (offset: number) => void;
  animateOffset: (offset: number) => void;
  /** Sets how fast the track settles after a release, 0.1 to 1 (`--lightbox-swipe-strength`). */
  setStrength: (strength: number) => void;
}

export interface UseLightboxGesturesResult {
  onPointerDown: React.PointerEventHandler<HTMLElement>;
  onPointerMove: React.PointerEventHandler<HTMLElement>;
  onPointerUp: React.PointerEventHandler<HTMLElement>;
  onPointerCancel: React.PointerEventHandler<HTMLElement>;
}

function getDistance(a: Point, b: Point): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function getCenter(a: Point, b: Point): Point {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

function getVelocity(samples: Sample[]): Point {
  const last = samples.at(-1);
  const first = samples[0];
  if (!first || !last || last.time === first.time) return { x: 0, y: 0 };
  const time = last.time - first.time;
  return { x: (last.x - first.x) / time, y: (last.y - first.y) / time };
}

/**
 * One gesture engine for the viewer, so swiping, zooming, panning and
 * dragging to close never fight over the same touch:
 *
 * - one finger at rest: swipe between items, or drag down or up to close;
 * - one finger while zoomed: pan, and swipe on once the image's edge is reached;
 * - two fingers: pinch to zoom around them;
 * - tap: show or hide the controls; double tap: zoom in at the point, or out;
 * - wheel or trackpad pinch: zoom around the cursor.
 */
export function useLightboxGestures(
  options: UseLightboxGesturesOptions,
): UseLightboxGesturesResult {
  const {
    root,
    getViewport,
    getWidth,
    getStride,
    directionSign,
    getOffset,
    setOffset,
    animateOffset,
    setStrength,
  } = options;

  const tapTimeout = useTimeout();
  const stateRef = React.useRef<GestureState>({
    mode: GestureMode.Idle,
    pointers: new Map(),
    pointerType: "mouse",
    start: { x: 0, y: 0, time: 0 },
    samples: [],
    zoomStart: { scale: 1, x: 0, y: 0 },
    offsetStart: 0,
    pinchDistance: 0,
    pinchCenter: { x: 0, y: 0 },
    lastTap: null,
  });

  const minScale = root.minScale;
  const maxScale = root.maxScale;

  /** Pointer position in px from the viewport's top-left corner. */
  const toPoint = (event: { clientX: number; clientY: number }): Point => {
    const rect = getViewport()?.getBoundingClientRect();
    return {
      x: event.clientX - (rect?.left ?? 0),
      y: event.clientY - (rect?.top ?? 0),
    };
  };

  /**
   * Height the close drag is measured against: the slide's, or the viewport's
   * when the slide has no `Lightbox.Media`.
   */
  const getDismissHeight = (entry: LightboxMediaEntry | undefined): number =>
    entry?.layout.slideHeight || getViewport()?.clientHeight || 1;

  /** `data-dragging` on the viewport only, for the cursor. */
  const setViewportDragging = (dragging: boolean) => {
    const viewport = getViewport();
    if (!viewport) return;
    if (dragging) viewport.setAttribute("data-dragging", "");
    else viewport.removeAttribute("data-dragging");
  };

  /**
   * `data-dragging` on the viewport, the popup and the backdrop. While it is
   * set, the app turns its transitions off so the page follows the finger.
   */
  const setDragging = (dragging: boolean) => {
    setViewportDragging(dragging);
    root.setDragging(dragging);
  };

  /** Puts the close drag back at rest; the popup keeps `data-dragging` until it's there. */
  const settleDismiss = () => {
    root.animateDismiss(LIGHTBOX_IDENTITY_DISMISS, () =>
      root.setDragging(false),
    );
  };

  /** Track offset with a rubber band past the first and last items. */
  const rubberbandOffset = (offset: number) => {
    const width = getWidth();
    if (offset > 0 && !root.hasPrevious)
      return rubberbandLightboxOverflow(offset, width);
    if (offset < 0 && !root.hasNext)
      return rubberbandLightboxOverflow(offset, width);
    return offset;
  };

  /**
   * Settles the track on an item after a gesture. Every gesture ends here, so
   * a press that caught the track mid-animation never leaves it between items.
   */
  const releaseTrack = (velocity: number) => {
    const offset = getOffset();
    if (offset === 0) return;
    const step = getLightboxSwipeStep({
      offset,
      startOffset: stateRef.current.offsetStart,
      velocity,
      stride: getStride(),
      minDistance: LIGHTBOX_SWIPE_DISTANCE,
      minVelocity: LIGHTBOX_SWIPE_VELOCITY,
    });
    const canStep =
      (step === 1 && root.hasNext) || (step === -1 && root.hasPrevious);
    // A flick settles as fast as it was thrown.
    const remaining = canStep
      ? getStride() - Math.abs(offset)
      : Math.abs(offset);
    setStrength(getLightboxSwipeStrength(remaining, velocity));
    if (canStep) root.stepIndex(step, offset);
    else animateOffset(0);
  };

  const startPinch = (state: GestureState) => {
    const [a, b] = [...state.pointers.values()];
    if (!a || !b) return;
    state.mode = GestureMode.Pinch;
    state.pinchDistance = getDistance(a, b) || 1;
    state.pinchCenter = getCenter(a, b);
    state.zoomStart = root.getZoom();
    tapTimeout.clear();
    // A swipe in progress goes back while the fingers zoom.
    if (getOffset() !== 0) animateOffset(0);
    setDragging(true);
  };

  const handleTap = (point: Point, time: number, pointerType: string) => {
    const state = stateRef.current;
    const lastTap = state.lastTap;
    const isDoubleTap =
      lastTap !== null &&
      time - lastTap.time < LIGHTBOX_DOUBLE_TAP_DELAY &&
      getDistance(lastTap, point) < LIGHTBOX_DOUBLE_TAP_DISTANCE;

    if (!isDoubleTap) {
      state.lastTap = { ...point, time };
      // A mouse click has no single-click action, so it doesn't wait.
      if (pointerType !== "mouse") {
        tapTimeout.start(LIGHTBOX_DOUBLE_TAP_DELAY, root.toggleControls);
      }
      return;
    }

    state.lastTap = null;
    tapTimeout.clear();
    const entry = root.getActiveMedia();
    if (!entry?.zoomElement) return;
    const zoom = root.getZoom();
    if (isLightboxZoomed(zoom.scale, minScale)) {
      root.animateZoom({ scale: minScale, x: 0, y: 0 });
    } else {
      const scale = Math.min(LIGHTBOX_ZOOM_SCALE.doubleTap, maxScale);
      root.animateZoom(
        zoomLightboxAroundPoint(zoom, scale, point, entry.layout),
        { clamp: true },
      );
    }
  };

  const onPointerDown = useStableCallback(
    (event: React.PointerEvent<HTMLElement>) => {
      if (root.phase !== LightboxPhase.Open) return;
      if (event.pointerType === "mouse" && event.button !== 0) return;
      const state = stateRef.current;
      try {
        event.currentTarget.setPointerCapture(event.pointerId);
      } catch {
        // Synthetic events in tests have no active pointer to capture.
      }
      const point = toPoint(event);
      state.pointers.set(event.pointerId, point);

      if (state.pointers.size === 1) {
        state.mode = GestureMode.Press;
        state.pointerType = event.pointerType;
        state.start = { ...point, time: event.timeStamp };
        state.samples = [state.start];
        // Catch the image and the track where they are, mid-animation.
        state.zoomStart = root.getZoom();
        root.setZoom(state.zoomStart);
        state.offsetStart = getOffset();
        setStrength(1);
        setOffset(state.offsetStart);
      } else if (state.pointers.size === 2) {
        startPinch(state);
      }
    },
  );

  const onPointerMove = useStableCallback(
    (event: React.PointerEvent<HTMLElement>) => {
      const state = stateRef.current;
      if (!state.pointers.has(event.pointerId)) return;
      const point = toPoint(event);
      state.pointers.set(event.pointerId, point);
      const entry = root.getActiveMedia();

      if (state.mode === GestureMode.Pinch) {
        const [a, b] = [...state.pointers.values()];
        if (!a || !b || !entry?.zoomElement) return;
        const center = getCenter(a, b);
        const rawScale =
          (state.zoomStart.scale * getDistance(a, b)) / state.pinchDistance;
        const scale =
          rawScale < minScale
            ? minScale - (minScale - rawScale) * PINCH_OVERSHOOT
            : rawScale > maxScale
              ? maxScale + (rawScale - maxScale) * PINCH_OVERSHOOT
              : rawScale;
        const zoom = zoomLightboxAroundPoint(
          state.zoomStart,
          scale,
          state.pinchCenter,
          entry.layout,
        );
        // The image also follows the fingers' centre as it moves.
        root.setZoom({
          scale,
          x: zoom.x + center.x - state.pinchCenter.x,
          y: zoom.y + center.y - state.pinchCenter.y,
        });
        return;
      }
      if (state.pointers.size !== 1) return;

      const deltaX = point.x - state.start.x;
      const deltaY = point.y - state.start.y;
      state.samples.push({ ...point, time: event.timeStamp });
      state.samples = state.samples.filter(
        (sample) => event.timeStamp - sample.time <= VELOCITY_WINDOW,
      );

      if (state.mode === GestureMode.Press) {
        if (Math.hypot(deltaX, deltaY) < LIGHTBOX_DRAG_THRESHOLD) return;
        tapTimeout.clear();
        state.lastTap = null;
        if (isLightboxZoomed(state.zoomStart.scale, minScale)) {
          state.mode = GestureMode.Pan;
        } else if (
          // A press that caught the track mid-swipe keeps swiping.
          state.offsetStart !== 0 ||
          Math.abs(deltaX) > Math.abs(deltaY)
        ) {
          state.mode = GestureMode.Swipe;
        } else {
          state.mode = GestureMode.Dismiss;
        }
        setDragging(true);
      }

      if (state.mode === GestureMode.Swipe) {
        setOffset(rubberbandOffset(state.offsetStart + deltaX * directionSign));
      } else if (state.mode === GestureMode.Pan && entry) {
        const { scale } = state.zoomStart;
        const bounds = getLightboxPanBounds(entry.layout, scale);
        const targetX = state.zoomStart.x + deltaX;
        const x = clampLightboxValue(targetX, bounds.minX, bounds.maxX);
        const y = rubberbandLightboxValue(
          state.zoomStart.y + deltaY,
          bounds.minY,
          bounds.maxY,
          entry.layout.slideHeight,
        );
        root.setZoom({ scale, x, y });
        // Past the image's edge, the drag carries on as a swipe.
        setOffset(
          rubberbandOffset(state.offsetStart + (targetX - x) * directionSign),
        );
      } else if (state.mode === GestureMode.Dismiss) {
        const height = getDismissHeight(entry);
        const distance = Math.abs(deltaY) / height;
        root.setDismiss(
          { x: deltaX, y: deltaY, scale: 1 - Math.min(0.3, distance * 0.6) },
          Math.min(1, distance * 2),
        );
      }
    },
  );

  const endPointer = useStableCallback(
    (event: React.PointerEvent<HTMLElement>, cancelled: boolean) => {
      const state = stateRef.current;
      if (!state.pointers.has(event.pointerId)) return;
      state.pointers.delete(event.pointerId);
      try {
        event.currentTarget.releasePointerCapture(event.pointerId);
      } catch {
        // Already released.
      }

      if (
        state.mode === GestureMode.Pinch ||
        state.mode === GestureMode.Settled
      ) {
        if (state.mode === GestureMode.Pinch) {
          root.animateZoom(root.getZoom(), { clamp: true });
        }
        state.mode =
          state.pointers.size > 0 ? GestureMode.Settled : GestureMode.Idle;
        if (state.mode === GestureMode.Idle) setDragging(false);
        return;
      }
      if (state.pointers.size > 0) return;

      const mode = state.mode;
      state.mode = GestureMode.Idle;
      setViewportDragging(false);
      // The drag to close keeps `data-dragging` on the popup while it settles.
      if (mode !== GestureMode.Dismiss) root.setDragging(false);
      // A pointer that stopped before it was released has no speed left.
      const velocity = getVelocity(
        state.samples.filter(
          (sample) => event.timeStamp - sample.time <= VELOCITY_WINDOW,
        ),
      );
      const entry = root.getActiveMedia();

      if (mode === GestureMode.Press) {
        if (!cancelled) {
          handleTap(state.start, event.timeStamp, state.pointerType);
        }
        releaseTrack(0);
      } else if (mode === GestureMode.Swipe) {
        releaseTrack(velocity.x * directionSign);
      } else if (mode === GestureMode.Pan) {
        if (getOffset() !== 0) {
          releaseTrack(velocity.x * directionSign);
          root.animateZoom(root.getZoom(), { clamp: true });
        } else {
          const zoom = root.getZoom();
          root.animateZoom(
            {
              ...zoom,
              x: zoom.x + velocity.x * PAN_GLIDE_TIME,
              y: zoom.y + velocity.y * PAN_GLIDE_TIME,
            },
            { clamp: true },
          );
        }
      } else if (mode === GestureMode.Dismiss) {
        const height = getDismissHeight(entry);
        const deltaY =
          (state.samples.at(-1)?.y ?? state.start.y) - state.start.y;
        const isFar = Math.abs(deltaY) > height * LIGHTBOX_DISMISS_DISTANCE;
        const isFast =
          Math.abs(velocity.y) > LIGHTBOX_DISMISS_VELOCITY &&
          Math.sign(velocity.y) === Math.sign(deltaY);
        if (!cancelled && (isFar || isFast)) {
          // Transitions back on, so the backdrop fades out as the viewer closes.
          root.setDragging(false);
          root.close();
        } else {
          settleDismiss();
        }
        releaseTrack(0);
      }
    },
  );

  // Wheel and trackpad pinch zoom around the cursor. React's `onWheel` is
  // passive, so the listener is native to be able to stop the page scroll.
  React.useEffect(() => {
    const viewport = getViewport();
    if (!viewport) return undefined;
    const handleWheel = (event: WheelEvent) => {
      event.preventDefault();
      if (root.phase !== LightboxPhase.Open) return;
      const entry = root.getActiveMedia();
      if (!entry?.zoomElement) return;
      const lineHeight = event.deltaMode === 1 ? 16 : 1;
      // A trackpad pinch arrives as a wheel event with `ctrlKey`.
      const speed = event.ctrlKey ? 0.01 : 0.002;
      const factor = Math.exp(-event.deltaY * lineHeight * speed);
      const zoom = root.getZoom();
      const scale = clampLightboxValue(zoom.scale * factor, minScale, maxScale);
      root.setZoom(
        clampLightboxZoom(
          zoomLightboxAroundPoint(zoom, scale, toPoint(event), entry.layout),
          entry.layout,
          minScale,
          maxScale,
        ),
      );
    };
    viewport.addEventListener("wheel", handleWheel, { passive: false });
    return () => viewport.removeEventListener("wheel", handleWheel);
  });

  // A pointer that leaves the window mid-gesture never sends `pointerup`.
  React.useEffect(() => {
    const viewport = getViewport();
    if (!viewport) return undefined;
    const win = ownerWindow(viewport);
    const handleBlur = () => {
      const state = stateRef.current;
      state.pointers.clear();
      state.mode = GestureMode.Idle;
      setViewportDragging(false);
      if (getOffset() !== 0) animateOffset(0);
      settleDismiss();
    };
    win.addEventListener("blur", handleBlur);
    return () => win.removeEventListener("blur", handleBlur);
  });

  return {
    onPointerDown,
    onPointerMove,
    onPointerUp: (event) => endPointer(event, false),
    onPointerCancel: (event) => endPointer(event, true),
  };
}
