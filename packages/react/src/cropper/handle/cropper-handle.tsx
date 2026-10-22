"use client";

import { mergeProps } from "@base-ui/react/merge-props";
import { useRender } from "@base-ui/react/use-render";
import { useIsoLayoutEffect } from "@base-ui/utils/useIsoLayoutEffect";
import { useMergedRefs } from "@base-ui/utils/useMergedRefs";
import * as React from "react";
import {
  CROPPER_KEYBOARD_LARGE_STEP,
  CROPPER_KEYBOARD_STEP,
} from "../constants";
import * as REASONS from "../cropper-reasons";
import { useCropperRootContext } from "../root/cropper-root-context";
import { useCropperViewportContext } from "../viewport/cropper-viewport-context";

/**
 * The corner or edge of the crop a handle resizes:
 * - `"top-left"`, `"top-right"`, `"bottom-right"`, `"bottom-left"`: a corner, both axes.
 * - `"top"`, `"right"`, `"bottom"`, `"left"`: an edge, one axis.
 */
export type CropperHandlePosition =
  | "top-left"
  | "top"
  | "top-right"
  | "right"
  | "bottom-right"
  | "bottom"
  | "bottom-left"
  | "left";

export type CropperHandleState = {
  /** The corner or edge it resizes, as `data-position`. */
  position: CropperHandlePosition;
  /** Whether it is being dragged. */
  resizing: boolean;
  /** Whether it can't resize the crop now. */
  disabled: boolean;
};

export interface CropperHandleProps extends useRender.ComponentProps<
  "div",
  CropperHandleState
> {
  /** The corner or edge of the crop it resizes. */
  position: CropperHandlePosition;
  /**
   * Whether it can't resize the crop. Handles are disabled with
   * `stencilSize` too.
   * @default false
   */
  disabled?: boolean | undefined;
}

const ARROWS: Record<string, { left: number; top: number }> = {
  ArrowLeft: { left: -1, top: 0 },
  ArrowRight: { left: 1, top: 0 },
  ArrowUp: { left: 0, top: -1 },
  ArrowDown: { left: 0, top: 1 },
};

/**
 * Resizes the crop from a corner or an edge: drag it, or use the arrow
 * keys (Shift for larger steps). Hold Shift while dragging to keep the
 * aspect ratio. Place it in `Cropper.Stencil` and position it with
 * `data-position`; an edge handle can be styled as a line along the edge.
 * Renders a `<div>` element.
 */
export function CropperHandle(props: CropperHandleProps): React.ReactElement {
  const {
    position,
    disabled: disabledProp = false,
    render,
    ref,
    ...elementProps
  } = props;
  const {
    engine,
    disabled: rootDisabled,
    fixedStencil,
  } = useCropperRootContext();
  const { registerTarget, activeHandle } = useCropperViewportContext();

  const disabled = disabledProp || rootDisabled || fixedStencil;
  const disabledRef = React.useRef(disabled);
  useIsoLayoutEffect(() => {
    disabledRef.current = disabled;
  });
  // Presses on the handle resize the crop, through `Cropper.Viewport`.
  const registerRef = React.useCallback(
    (element: HTMLDivElement | null) =>
      element
        ? registerTarget(element, {
            kind: "handle",
            position,
            isDisabled: () => disabledRef.current,
          })
        : undefined,
    [registerTarget, position],
  );

  const mergedRef = useMergedRefs(ref, registerRef);

  const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const arrow = ARROWS[event.key];
    if (!arrow || disabled || event.altKey || event.ctrlKey || event.metaKey) {
      return;
    }
    event.preventDefault();
    const step = event.shiftKey
      ? CROPPER_KEYBOARD_LARGE_STEP
      : CROPPER_KEYBOARD_STEP;
    engine.resizeCoordinates(
      position,
      { left: arrow.left * step, top: arrow.top * step },
      { compensate: true },
      {
        reason: REASONS.keyboard,
        event: event.nativeEvent,
        interaction: false,
        immediately: true,
      },
    );
  };

  const state: CropperHandleState = React.useMemo(
    () => ({ position, resizing: activeHandle === position, disabled }),
    [position, activeHandle, disabled],
  );

  return useRender({
    defaultTagName: "div",
    render,
    ref: mergedRef,
    state,
    props: mergeProps<"div">(
      {
        role: "button",
        "aria-label": `Resize ${position.replace("-", " ")}`,
        "aria-disabled": disabled || undefined,
        tabIndex: disabled ? -1 : 0,
        onKeyDown,
      },
      elementProps,
    ),
  });
}
