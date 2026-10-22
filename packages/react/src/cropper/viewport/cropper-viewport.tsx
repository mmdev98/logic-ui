"use client";

import { mergeProps } from "@base-ui/react/merge-props";
import { useRender } from "@base-ui/react/use-render";
import { ownerWindow } from "@base-ui/utils/owner";
import { useIsoLayoutEffect } from "@base-ui/utils/useIsoLayoutEffect";
import { useMergedRefs } from "@base-ui/utils/useMergedRefs";
import * as React from "react";
import { CROPPER_STATE_ATTRIBUTES } from "../cropper-state-attributes";
import type { CropperHandlePosition } from "../handle/cropper-handle";
import type { CropperRootState } from "../root/cropper-root";
import type { CropperPoint } from "../types";
import {
  useCropperRootContext,
  useCropperRootStateContext,
} from "../root/cropper-root-context";
import {
  CropperViewportContext,
  type CropperViewportContextValue,
  type CropperViewportTarget,
} from "./cropper-viewport-context";
import { useCropperGestures } from "./use-cropper-gestures";

export type CropperViewportState = CropperRootState;

export interface CropperViewportProps extends useRender.ComponentProps<
  "div",
  CropperViewportState
> {
  /**
   * Whether the wheel and a trackpad pinch zoom the image.
   * @default true
   */
  zoomOnWheel?: boolean | undefined;
  /**
   * Whether two fingers pinch to zoom the image.
   * @default true
   */
  zoomOnPinch?: boolean | undefined;
  /**
   * Whether two fingers turn the image.
   * @default false
   */
  rotateOnPinch?: boolean | undefined;
  /**
   * Whether dragging the image moves it.
   * @default true
   */
  panOnDrag?: boolean | undefined;
}

/**
 * The area that shows the image and the crop. Its size on screen is the
 * cropper's: give it one, such as `aspect-(--cropper-image-aspect-ratio)`.
 * Its padding is room the crop and the fitted image stay out of, where a
 * zoomed or moved image still shows: under bars laid over it, for example.
 * Drags, pinches and the wheel on it move and zoom the image.
 * Renders a `<div>` element.
 */
export function CropperViewport(
  props: CropperViewportProps,
): React.ReactElement {
  const {
    zoomOnWheel = true,
    zoomOnPinch = true,
    rotateOnPinch = false,
    panOnDrag = true,
    render,
    ref,
    ...elementProps
  } = props;

  const root = useCropperRootContext();
  const { interacting, transitioning } = useCropperRootStateContext();
  const { setBoundary, status, disabled } = root;
  const viewportRef = React.useRef<HTMLDivElement | null>(null);
  const mergedRef = useMergedRefs(ref, viewportRef);
  const getViewport = React.useCallback(() => viewportRef.current, []);

  const targetsRef = React.useRef(new Map<Element, CropperViewportTarget>());
  const registerTarget = React.useCallback(
    (element: Element, target: CropperViewportTarget) => {
      targetsRef.current.set(element, target);
      return () => {
        targetsRef.current.delete(element);
      };
    },
    [],
  );
  const getTarget = React.useCallback((element: Element) => {
    const viewport = viewportRef.current;
    let current: Element | null = element;
    while (current && current !== viewport) {
      const target = targetsRef.current.get(current);
      if (target) return { element: current, target };
      current = current.parentElement;
    }
    return null;
  }, []);

  const [inset, setInset] = React.useState<CropperPoint>({ left: 0, top: 0 });
  const [activeHandle, setActiveHandle] =
    React.useState<CropperHandlePosition | null>(null);

  const gestures = useCropperGestures({
    root,
    getViewport,
    getTarget,
    getInset: () => inset,
    isTransitioning: () => root.engine.getSnapshot().transitioning,
    zoomOnWheel,
    zoomOnPinch,
    rotateOnPinch,
    panOnDrag,
    onActiveHandleChange: setActiveHandle,
  });

  // The wheel listener must not be passive, to keep the page from scrolling.
  const { onWheel } = gestures;
  React.useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return undefined;
    viewport.addEventListener("wheel", onWheel, { passive: false });
    return () => viewport.removeEventListener("wheel", onWheel);
  }, [onWheel]);

  // The viewport's content box is the cropper's boundary: its padding is
  // room the crop stays out of, where the image still shows.
  useIsoLayoutEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return undefined;
    const win = ownerWindow(viewport);
    const style = win.getComputedStyle(viewport);
    // The image and the crop are placed against it.
    if (style.position === "static") viewport.style.position = "relative";
    const measure = () => {
      const padding = win.getComputedStyle(viewport);
      const read = (value: string) => Number.parseFloat(value) || 0;
      const left = read(padding.paddingLeft);
      const top = read(padding.paddingTop);
      const width = viewport.clientWidth - left - read(padding.paddingRight);
      const height = viewport.clientHeight - top - read(padding.paddingBottom);
      setInset((previous) =>
        previous.left === left && previous.top === top
          ? previous
          : { left, top },
      );
      setBoundary(width > 0 && height > 0 ? { width, height } : null);
    };
    measure();
    if (typeof win.ResizeObserver === "undefined") {
      win.addEventListener("resize", measure);
      return () => win.removeEventListener("resize", measure);
    }
    const observer = new win.ResizeObserver(measure);
    observer.observe(viewport);
    return () => observer.disconnect();
  }, [setBoundary]);

  const contextValue: CropperViewportContextValue = React.useMemo(
    () => ({ registerTarget, activeHandle, inset }),
    [registerTarget, activeHandle, inset],
  );

  const state: CropperViewportState = React.useMemo(
    () => ({ status, disabled, interacting, transitioning }),
    [status, disabled, interacting, transitioning],
  );

  const element = useRender({
    defaultTagName: "div",
    render,
    ref: mergedRef,
    state,
    stateAttributesMapping: CROPPER_STATE_ATTRIBUTES,
    props: mergeProps<"div">(
      {
        onPointerDown: gestures.onPointerDown,
        onPointerMove: gestures.onPointerMove,
        onPointerUp: gestures.onPointerUp,
        onPointerCancel: gestures.onPointerCancel,
        // The image and the crop are clipped by it.
        style: {
          overflow: "hidden",
          touchAction: "none",
          userSelect: "none",
        },
      },
      elementProps,
    ),
  });

  return (
    <CropperViewportContext value={contextValue}>
      {element}
    </CropperViewportContext>
  );
}
