"use client";

import { ownerWindow } from "@base-ui/utils/owner";
import { useIsoLayoutEffect } from "@base-ui/utils/useIsoLayoutEffect";
import { useStableCallback } from "@base-ui/utils/useStableCallback";
import * as React from "react";
import { LIGHTBOX_DRAG_THRESHOLD } from "../constants";
import { prefersLightboxReducedMotion } from "../utils/lightbox-flight";

export interface UseLightboxThumbnailListScrollOptions {
  orientation: "horizontal" | "vertical";
  /** Index of the item shown in the viewer: its thumbnail is kept centred. */
  activeIndex: number;
  getThumbnail: (index: number) => HTMLElement | undefined;
}

export interface UseLightboxThumbnailListScrollResult {
  ref: React.RefObject<HTMLDivElement | null>;
  /** Whether thumbnails are hidden before the start of the strip. */
  overflowStart: boolean;
  /** Whether thumbnails are hidden past the end of the strip. */
  overflowEnd: boolean;
  /** Whether the mouse drags the strip. */
  dragging: boolean;
  props: React.HTMLAttributes<HTMLDivElement>;
}

type DragState = {
  pointerId: number;
  start: number;
  startScroll: number;
  moved: boolean;
};

/** Edge tolerance (px): sub-pixel scroll positions still count as the end. */
const EDGE = 1;

/**
 * Scrolls the strip of `Lightbox.ThumbnailList`: keeps the active thumbnail
 * centred, lets the mouse drag the strip and the wheel scroll a horizontal
 * one, and reports which ends have hidden thumbnails. Touch scrolls natively.
 */
export function useLightboxThumbnailListScroll(
  options: UseLightboxThumbnailListScrollOptions,
): UseLightboxThumbnailListScrollResult {
  const { orientation, activeIndex, getThumbnail } = options;
  const horizontal = orientation === "horizontal";

  const ref = React.useRef<HTMLDivElement | null>(null);
  const dragRef = React.useRef<DragState | null>(null);
  const suppressClickRef = React.useRef(false);
  const centredOnceRef = React.useRef(false);
  const [overflow, setOverflow] = React.useState({ start: false, end: false });
  const [dragging, setDragging] = React.useState(false);

  const updateOverflow = useStableCallback(() => {
    const strip = ref.current;
    if (!strip) return;
    // `scrollLeft` is negative in right-to-left layouts; its size is the distance from the start.
    const position = Math.abs(horizontal ? strip.scrollLeft : strip.scrollTop);
    const max = horizontal
      ? strip.scrollWidth - strip.clientWidth
      : strip.scrollHeight - strip.clientHeight;
    const start = position > EDGE;
    const end = max - position > EDGE;
    setOverflow((current) =>
      current.start === start && current.end === end ? current : { start, end },
    );
  });

  /** Scrolls the strip so the active thumbnail sits in its middle. */
  const centreActive = useStableCallback((animate: boolean) => {
    const strip = ref.current;
    const thumbnail = getThumbnail(activeIndex);
    if (!strip || !thumbnail || dragRef.current?.moved) return;
    if (typeof strip.scrollBy !== "function") return;
    const stripRect = strip.getBoundingClientRect();
    const rect = thumbnail.getBoundingClientRect();
    const delta = horizontal
      ? rect.left + rect.width / 2 - (stripRect.left + stripRect.width / 2)
      : rect.top + rect.height / 2 - (stripRect.top + stripRect.height / 2);
    if (Math.abs(delta) < EDGE) return;
    const smooth = animate && !prefersLightboxReducedMotion(ownerWindow(strip));
    strip.scrollBy({
      [horizontal ? "left" : "top"]: delta,
      behavior: smooth ? "smooth" : "auto",
    });
  });

  useIsoLayoutEffect(() => {
    const strip = ref.current;
    if (!strip) return undefined;
    updateOverflow();
    strip.addEventListener("scroll", updateOverflow, { passive: true });
    if (typeof ResizeObserver === "undefined") {
      return () => strip.removeEventListener("scroll", updateOverflow);
    }
    const observer = new ResizeObserver(updateOverflow);
    observer.observe(strip);
    return () => {
      strip.removeEventListener("scroll", updateOverflow);
      observer.disconnect();
    };
  }, [updateOverflow]);

  // Jumps to the active thumbnail when the strip appears, then glides to it.
  useIsoLayoutEffect(() => {
    centreActive(centredOnceRef.current);
    centredOnceRef.current = true;
  }, [activeIndex, centreActive]);

  // The wheel scrolls a horizontal strip, for mice without a horizontal wheel.
  // Not a React handler: it must be able to prevent the default (passive in React).
  React.useEffect(() => {
    const strip = ref.current;
    if (!strip || !horizontal) return undefined;
    const handleWheel = (event: WheelEvent) => {
      if (event.ctrlKey || Math.abs(event.deltaY) <= Math.abs(event.deltaX))
        return;
      if (strip.scrollWidth <= strip.clientWidth) return;
      event.preventDefault();
      const rtl =
        ownerWindow(strip).getComputedStyle(strip).direction === "rtl";
      strip.scrollLeft += rtl ? -event.deltaY : event.deltaY;
    };
    strip.addEventListener("wheel", handleWheel, { passive: false });
    return () => strip.removeEventListener("wheel", handleWheel);
  }, [horizontal]);

  const endDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    dragRef.current = null;
    if (!drag.moved) return;
    // The click that ends a drag doesn't show the thumbnail under the pointer.
    suppressClickRef.current = true;
    setDragging(false);
    if (event.currentTarget.hasPointerCapture?.(event.pointerId))
      event.currentTarget.releasePointerCapture(event.pointerId);
  };

  const props: React.HTMLAttributes<HTMLDivElement> = {
    onPointerDown: (event) => {
      if (event.pointerType !== "mouse" || event.button !== 0) return;
      suppressClickRef.current = false;
      const strip = event.currentTarget;
      dragRef.current = {
        pointerId: event.pointerId,
        start: horizontal ? event.clientX : event.clientY,
        startScroll: horizontal ? strip.scrollLeft : strip.scrollTop,
        moved: false,
      };
    },
    onPointerMove: (event) => {
      const drag = dragRef.current;
      if (!drag || drag.pointerId !== event.pointerId) return;
      const strip = event.currentTarget;
      const delta = (horizontal ? event.clientX : event.clientY) - drag.start;
      if (!drag.moved) {
        if (Math.abs(delta) < LIGHTBOX_DRAG_THRESHOLD) return;
        drag.moved = true;
        setDragging(true);
        strip.setPointerCapture?.(event.pointerId);
      }
      if (horizontal) strip.scrollLeft = drag.startScroll - delta;
      else strip.scrollTop = drag.startScroll - delta;
    },
    onPointerUp: endDrag,
    onPointerCancel: endDrag,
    onClickCapture: (event) => {
      if (!suppressClickRef.current) return;
      suppressClickRef.current = false;
      event.preventDefault();
      event.stopPropagation();
    },
    // Images inside thumbnails would start a native drag instead.
    onDragStart: (event) => event.preventDefault(),
    // A thumbnail that grows when active (a CSS transition) is centred again once it has.
    onTransitionEnd: (event) => {
      if (event.target === getThumbnail(activeIndex)) centreActive(true);
    },
  };

  return {
    ref,
    overflowStart: overflow.start,
    overflowEnd: overflow.end,
    dragging,
    props,
  };
}
