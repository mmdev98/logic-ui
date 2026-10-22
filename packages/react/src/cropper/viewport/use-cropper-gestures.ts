"use client";

import { useStableCallback } from "@base-ui/utils/useStableCallback";
import { useTimeout } from "@base-ui/utils/useTimeout";
import * as React from "react";
import {
  CROPPER_TOUCH_DRAG_THRESHOLD,
  CROPPER_WHEEL_RATIO,
  CROPPER_WHEEL_TIMEOUT,
} from "../constants";
import * as REASONS from "../cropper-reasons";
import type { CropperHandlePosition } from "../handle/cropper-handle";
import type { CropperRootContextValue } from "../root/cropper-root-context";
import type { CropperCoordinates, CropperPoint } from "../types";
import { getCropperDistance } from "../utils/cropper-geometry";
import {
  type CropperPointer,
  getCropperPointersTransform,
  getCropperWheelTransform,
} from "../utils/cropper-transform";
import type { CropperViewportTarget } from "./cropper-viewport-context";

type GestureMode =
  | "idle"
  /** A finger is on the stencil, not moved far enough to drag it yet. */
  | "stencil-pending"
  | "stencil"
  | "handle"
  | "image"
  | "pinch";

interface GestureState {
  mode: GestureMode;
  pointers: Map<number, CropperPointer>;
  previous: CropperPointer[];
  start: CropperPointer;
  /** Element being dragged and the point where it was grabbed, relative to it. */
  element: Element | null;
  anchor: CropperPoint;
  handle: CropperHandlePosition | null;
  /** The crop when a handle drag started. */
  reference: CropperCoordinates | null;
}

export interface UseCropperGesturesOptions {
  root: CropperRootContextValue;
  getViewport: () => HTMLElement | null;
  /** The viewport's padding: where the boundary starts. */
  getInset: () => CropperPoint;
  getTarget: (
    element: Element,
  ) => { element: Element; target: CropperViewportTarget } | null;
  isTransitioning: () => boolean;
  zoomOnWheel: boolean;
  zoomOnPinch: boolean;
  rotateOnPinch: boolean;
  panOnDrag: boolean;
  onActiveHandleChange: (handle: CropperHandlePosition | null) => void;
}

export interface UseCropperGesturesResult {
  onPointerDown: React.PointerEventHandler<HTMLElement>;
  onPointerMove: React.PointerEventHandler<HTMLElement>;
  onPointerUp: React.PointerEventHandler<HTMLElement>;
  onPointerCancel: React.PointerEventHandler<HTMLElement>;
  onWheel: (event: WheelEvent) => void;
}

/** Controls an app may place in the viewport: their presses are theirs. */
const INTERACTIVE =
  "button, a[href], input, select, textarea, [contenteditable='true']";

function toPointer(event: {
  clientX: number;
  clientY: number;
}): CropperPointer {
  return { clientX: event.clientX, clientY: event.clientY };
}

/** The top left corner of the boundary, in client pixels: inside the border and the padding. */
function getOrigin(element: Element, inset: CropperPoint): CropperPoint {
  const rect = element.getBoundingClientRect();
  return {
    left: rect.left + element.clientLeft + inset.left,
    top: rect.top + element.clientTop + inset.top,
  };
}

/**
 * The move of a pointer, without the axes on which it goes back towards
 * where it grabbed the element: the element stopped at a limit, and the
 * pointer must reach it again before it moves on.
 */
function getCropperAnchoredMove(
  element: Element | null,
  anchor: CropperPoint,
  previous: CropperPointer,
  current: CropperPointer,
): CropperPoint {
  const move = {
    left: current.clientX - previous.clientX,
    top: current.clientY - previous.clientY,
  };
  if (!element) return move;
  const { left, top } = element.getBoundingClientRect();
  if (
    Math.abs(current.clientX - anchor.left - left) <
    Math.abs(previous.clientX - anchor.left - left)
  ) {
    move.left = 0;
  }
  if (
    Math.abs(current.clientY - anchor.top - top) <
    Math.abs(previous.clientY - anchor.top - top)
  ) {
    move.top = 0;
  }
  return move;
}

/**
 * One gesture engine for the viewport, so the crop and the image never
 * fight over the same press:
 *
 * - a handle: resize the crop (Shift keeps its aspect ratio);
 * - the stencil: move the crop (a finger must travel a little first, so a
 *   second one can start a pinch);
 * - the image: move the image;
 * - two fingers: pinch to zoom (and turn, with `rotateOnPinch`);
 * - wheel or trackpad pinch: zoom around the cursor.
 */
export function useCropperGestures(
  options: UseCropperGesturesOptions,
): UseCropperGesturesResult {
  const {
    root,
    getViewport,
    getInset,
    getTarget,
    isTransitioning,
    zoomOnWheel,
    zoomOnPinch,
    rotateOnPinch,
    panOnDrag,
    onActiveHandleChange,
  } = options;
  const { engine } = root;
  const wheelTimeout = useTimeout();
  const stateRef = React.useRef<GestureState>({
    mode: "idle",
    pointers: new Map(),
    previous: [],
    start: { clientX: 0, clientY: 0 },
    element: null,
    anchor: { left: 0, top: 0 },
    handle: null,
    reference: null,
  });

  const endCropDrag = (event: Event | undefined) => {
    const gesture = stateRef.current;
    if (gesture.mode === "stencil") {
      engine.moveCoordinatesEnd({ reason: REASONS.stencilDrag, event });
    } else if (gesture.mode === "handle") {
      engine.resizeCoordinatesEnd({ reason: REASONS.handleDrag, event });
      onActiveHandleChange(null);
    }
    gesture.handle = null;
    gesture.element = null;
    gesture.reference = null;
  };

  const onPointerDown = useStableCallback(
    (event: React.PointerEvent<HTMLElement>) => {
      const viewport = event.currentTarget;
      const gesture = stateRef.current;
      if (root.disabled || !engine.getSnapshot().state) return;
      if (event.pointerType === "mouse" && event.button !== 0) return;

      const element = event.target as Element;
      const found = getTarget(element);
      if (!found) {
        const control = element.closest?.(INTERACTIVE);
        if (control && viewport.contains(control)) return;
      }

      gesture.pointers.set(event.pointerId, toPointer(event));
      try {
        viewport.setPointerCapture(event.pointerId);
      } catch {
        // A pointer the browser no longer tracks: the drag works without capture.
      }
      const pointers = [...gesture.pointers.values()];

      if (pointers.length > 1) {
        // A second finger: the crop drag gives way to a pinch.
        endCropDrag(event.nativeEvent);
        gesture.mode =
          zoomOnPinch || rotateOnPinch || panOnDrag ? "pinch" : "idle";
        gesture.previous = pointers;
        return;
      }

      gesture.start = toPointer(event);
      gesture.previous = pointers;
      if (found?.target.kind === "handle" && !found.target.isDisabled()) {
        const rect = found.element.getBoundingClientRect();
        gesture.mode = "handle";
        gesture.handle = found.target.position;
        gesture.element = found.element;
        gesture.anchor = {
          left: event.clientX - rect.left,
          top: event.clientY - rect.top,
        };
        gesture.reference = engine.getSnapshot().state?.coordinates ?? null;
        onActiveHandleChange(found.target.position);
      } else if (found?.target.kind === "stencil" && found.target.isMovable()) {
        const rect = found.element.getBoundingClientRect();
        gesture.mode =
          event.pointerType === "touch" ? "stencil-pending" : "stencil";
        gesture.element = found.element;
        gesture.anchor = {
          left: event.clientX - rect.left,
          top: event.clientY - rect.top,
        };
      } else {
        gesture.mode = panOnDrag ? "image" : "idle";
      }
    },
  );

  const onPointerMove = useStableCallback(
    (event: React.PointerEvent<HTMLElement>) => {
      const gesture = stateRef.current;
      if (!gesture.pointers.has(event.pointerId)) return;
      gesture.pointers.set(event.pointerId, toPointer(event));
      const current = [...gesture.pointers.values()];
      const previous = gesture.previous;
      const nativeEvent = event.nativeEvent;

      if (gesture.mode === "stencil-pending") {
        const [pointer] = current;
        if (
          pointer &&
          getCropperDistance(
            { left: pointer.clientX, top: pointer.clientY },
            { left: gesture.start.clientX, top: gesture.start.clientY },
          ) > CROPPER_TOUCH_DRAG_THRESHOLD
        ) {
          gesture.mode = "stencil";
        } else {
          return;
        }
      }

      const [pointer] = current;
      const [previousPointer] = previous;
      if (gesture.mode === "stencil" && pointer && previousPointer) {
        engine.moveCoordinates(
          getCropperAnchoredMove(
            gesture.element,
            gesture.anchor,
            previousPointer,
            pointer,
          ),
          { reason: REASONS.stencilDrag, event: nativeEvent },
        );
      } else if (
        gesture.mode === "handle" &&
        gesture.handle &&
        pointer &&
        previousPointer
      ) {
        const position = gesture.handle;
        const horizontal = position === "left" || position === "right";
        const vertical = position === "top" || position === "bottom";
        engine.resizeCoordinates(
          position,
          getCropperAnchoredMove(
            gesture.element,
            gesture.anchor,
            previousPointer,
            pointer,
          ),
          {
            reference: gesture.reference,
            preserveAspectRatio: event.shiftKey,
            respectDirection: horizontal
              ? "width"
              : vertical
                ? "height"
                : undefined,
            compensate: true,
          },
          { reason: REASONS.handleDrag, event: nativeEvent },
        );
      } else if (
        (gesture.mode === "image" || gesture.mode === "pinch") &&
        !isTransitioning()
      ) {
        const viewport = getViewport();
        if (viewport) {
          const transform = getCropperPointersTransform(
            current,
            previous,
            getOrigin(viewport, getInset()),
            gesture.mode === "image"
              ? { move: true, scale: false, rotate: false }
              : { move: panOnDrag, scale: zoomOnPinch, rotate: rotateOnPinch },
          );
          if (transform.move || transform.scale || transform.rotate) {
            wheelTimeout.clear();
            engine.transformImage(transform, {
              reason:
                gesture.mode === "image" ? REASONS.imageDrag : REASONS.pinch,
              event: nativeEvent,
            });
          }
        }
      }
      gesture.previous = current;
    },
  );

  const onPointerEnd = useStableCallback(
    (event: React.PointerEvent<HTMLElement>) => {
      const gesture = stateRef.current;
      if (!gesture.pointers.delete(event.pointerId)) return;
      const remaining = [...gesture.pointers.values()];
      gesture.previous = remaining;
      const nativeEvent = event.nativeEvent;

      if (gesture.mode === "stencil" || gesture.mode === "handle") {
        endCropDrag(nativeEvent);
        gesture.mode = "idle";
      } else if (gesture.mode === "image" || gesture.mode === "pinch") {
        if (remaining.length === 0) {
          const reason =
            gesture.mode === "image" ? REASONS.imageDrag : REASONS.pinch;
          gesture.mode = "idle";
          if (engine.getSnapshot().interactions.transformImage) {
            engine.transformImageEnd({ reason, event: nativeEvent });
          }
        } else if (remaining.length === 1) {
          // One finger is left after a pinch: it moves the image.
          gesture.mode = panOnDrag ? "image" : "pinch";
        }
      } else if (remaining.length === 0) {
        gesture.mode = "idle";
      }
    },
  );

  const onWheel = useStableCallback((event: WheelEvent) => {
    const viewport = getViewport();
    if (
      !zoomOnWheel ||
      root.disabled ||
      !viewport ||
      !engine.getSnapshot().state
    ) {
      return;
    }
    event.preventDefault();
    if (isTransitioning()) return;
    const origin = getOrigin(viewport, getInset());
    engine.transformImage(
      getCropperWheelTransform(
        event,
        { left: event.clientX - origin.left, top: event.clientY - origin.top },
        CROPPER_WHEEL_RATIO,
      ),
      { reason: REASONS.wheel, event },
    );
    if (stateRef.current.pointers.size === 0) {
      wheelTimeout.start(CROPPER_WHEEL_TIMEOUT, () => {
        engine.transformImageEnd({ reason: REASONS.wheel, event });
      });
    }
  });

  return {
    onPointerDown,
    onPointerMove,
    onPointerUp: onPointerEnd,
    onPointerCancel: onPointerEnd,
    onWheel,
  };
}
