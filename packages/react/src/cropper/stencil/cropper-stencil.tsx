"use client";

import { mergeProps } from "@base-ui/react/merge-props";
import { useRender } from "@base-ui/react/use-render";
import { useIsoLayoutEffect } from "@base-ui/utils/useIsoLayoutEffect";
import { useMergedRefs } from "@base-ui/utils/useMergedRefs";
import * as React from "react";
import {
  CROPPER_KEYBOARD_LARGE_STEP,
  CROPPER_KEYBOARD_STEP,
  CROPPER_ZOOM_STEP,
} from "../constants";
import * as REASONS from "../cropper-reasons";
import {
  useCropperRootContext,
  useCropperRootStateContext,
} from "../root/cropper-root-context";
import {
  getCropperStencilCoordinates,
  isCropperStateInitialized,
} from "../utils/cropper-restrictions";
import { useCropperViewportContext } from "../viewport/cropper-viewport-context";

export type CropperStencilState = {
  /** Whether the crop can be dragged and moved with the arrow keys. */
  movable: boolean;
  /** Whether the crop is being dragged. */
  moving: boolean;
  /** Whether a handle is being dragged. */
  resizing: boolean;
  /** Whether a drag, pinch or wheel zoom is in progress. */
  interacting: boolean;
  /** Whether a change animates. */
  transitioning: boolean;
  /** Whether the cropper ignores the user. */
  disabled: boolean;
};

export interface CropperStencilProps extends useRender.ComponentProps<
  "div",
  CropperStencilState
> {
  /**
   * Whether the crop can be dragged. A drag on a fixed crop moves the image.
   * @default true
   */
  movable?: boolean | undefined;
}

const ARROWS: Record<string, { left: number; top: number }> = {
  ArrowLeft: { left: -1, top: 0 },
  ArrowRight: { left: 1, top: 0 },
  ArrowUp: { left: 0, top: -1 },
  ArrowDown: { left: 0, top: 1 },
};

/**
 * The crop, placed over the image in `Cropper.Viewport`. Drag it or use the
 * arrow keys to move it (Shift for larger steps), and + and − to zoom.
 * Style the area outside it with a large shadow, and its shape with
 * `border-radius`. Renders nothing until the image is on screen.
 * Renders a `<div>` element.
 */
export function CropperStencil(
  props: CropperStencilProps,
): React.ReactElement | null {
  const { movable: movableProp = true, render, ref, ...elementProps } = props;
  const { engine, disabled, fixedStencil, runAction } = useCropperRootContext();
  const {
    state: cropperState,
    interactions,
    interacting,
    transitioning,
  } = useCropperRootStateContext();
  const { registerTarget, inset } = useCropperViewportContext();

  const movable = movableProp && !fixedStencil && !disabled;
  const movableRef = React.useRef(movable);
  useIsoLayoutEffect(() => {
    movableRef.current = movable;
  });
  // Presses on the stencil drag the crop, through `Cropper.Viewport`.
  const registerRef = React.useCallback(
    (element: HTMLDivElement | null) =>
      element
        ? registerTarget(element, {
            kind: "stencil",
            isMovable: () => movableRef.current,
          })
        : undefined,
    [registerTarget],
  );

  const mergedRef = useMergedRefs(ref, registerRef);

  const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    // Keys pressed on a handle inside are the handle's.
    if (event.target !== event.currentTarget) return;
    if (disabled || event.altKey || event.ctrlKey || event.metaKey) return;
    const arrow = ARROWS[event.key];
    const options = { reason: REASONS.keyboard, event: event.nativeEvent };
    if (arrow && movable) {
      event.preventDefault();
      const step = event.shiftKey
        ? CROPPER_KEYBOARD_LARGE_STEP
        : CROPPER_KEYBOARD_STEP;
      engine.moveCoordinates(
        { left: arrow.left * step, top: arrow.top * step },
        { ...options, interaction: false, immediately: true },
      );
    } else if (event.key === "+" || event.key === "=") {
      event.preventDefault();
      runAction(REASONS.keyboard, event.nativeEvent, (actions) =>
        actions.zoom(CROPPER_ZOOM_STEP),
      );
    } else if (event.key === "-" || event.key === "_") {
      event.preventDefault();
      runAction(REASONS.keyboard, event.nativeEvent, (actions) =>
        actions.zoom(1 / CROPPER_ZOOM_STEP),
      );
    }
  };

  const { left, top, width, height } =
    getCropperStencilCoordinates(cropperState);

  const state: CropperStencilState = React.useMemo(
    () => ({
      movable,
      moving: interactions.moveCoordinates,
      resizing: interactions.resizeCoordinates,
      interacting,
      transitioning,
      disabled,
    }),
    [movable, interactions, interacting, transitioning, disabled],
  );

  return useRender({
    enabled: isCropperStateInitialized(cropperState),
    defaultTagName: "div",
    render,
    ref: mergedRef,
    state,
    props: mergeProps<"div">(
      {
        role: "group",
        "aria-label": "Crop area",
        "aria-keyshortcuts": "ArrowLeft ArrowRight ArrowUp ArrowDown + -",
        tabIndex: disabled ? -1 : 0,
        onKeyDown,
        // Position and size written by the cropper.
        style: {
          position: "absolute",
          left: inset.left,
          top: inset.top,
          width,
          height,
          transform: `translate3d(${left}px, ${top}px, 0px)`,
        },
      },
      elementProps,
    ),
  });
}
