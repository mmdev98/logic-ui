import { ownerWindow } from "@base-ui/utils/owner";
import type {
  LightboxDismiss,
  LightboxMediaLayout,
  LightboxMediaSize,
  LightboxRect,
  LightboxZoom,
} from "../types";

export const LIGHTBOX_IDENTITY_ZOOM: LightboxZoom = { scale: 1, x: 0, y: 0 };

export const LIGHTBOX_IDENTITY_DISMISS: LightboxDismiss = {
  x: 0,
  y: 0,
  scale: 1,
};

export function clampLightboxValue(
  value: number,
  min: number,
  max: number,
): number {
  return Math.min(Math.max(value, min), max);
}

/** Largest box of `aspectRatio` that fits in `width` × `height`. */
export function getLightboxContainedSize(
  aspectRatio: number,
  width: number,
  height: number,
): LightboxMediaSize {
  const containedWidth = Math.max(0, Math.min(width, height * aspectRatio));
  return { width: containedWidth, height: containedWidth / aspectRatio };
}

/** Whether some of `rect` lies inside `area`. */
export function isLightboxRectVisible(
  rect: LightboxRect,
  area: LightboxRect,
): boolean {
  return (
    rect.width > 0 &&
    rect.height > 0 &&
    rect.left < area.left + area.width &&
    rect.top < area.top + area.height &&
    rect.left + rect.width > area.left &&
    rect.top + rect.height > area.top
  );
}

/** Where two boxes overlap: an empty box at the nearest corner when they don't. */
export function intersectLightboxRects(
  a: LightboxRect,
  b: LightboxRect,
): LightboxRect {
  const left = Math.max(a.left, b.left);
  const top = Math.max(a.top, b.top);
  const right = Math.min(a.left + a.width, b.left + b.width);
  const bottom = Math.min(a.top + a.height, b.top + b.height);
  return {
    left,
    top,
    width: Math.max(0, right - left),
    height: Math.max(0, bottom - top),
  };
}

/**
 * The part of the window where `element` can be seen: the window, cut by
 * each ancestor that clips its content, such as a scrolling list. A trigger
 * scrolled out of its list is inside the window but can't be seen.
 */
export function getLightboxVisibleArea(element: Element): LightboxRect {
  const win = ownerWindow(element);
  const html = win.document.documentElement;
  let area: LightboxRect = {
    left: 0,
    top: 0,
    width: html.clientWidth,
    height: html.clientHeight,
  };
  for (
    let parent = element.parentElement;
    parent && parent !== html;
    parent = parent.parentElement
  ) {
    const style = win.getComputedStyle(parent);
    if (style.overflowX === "visible" && style.overflowY === "visible")
      continue;
    area = intersectLightboxRects(area, toLightboxRect(parent));
  }
  return area;
}

export function formatLightboxTransform(
  zoom: LightboxZoom,
  dismiss: LightboxDismiss = LIGHTBOX_IDENTITY_DISMISS,
): string {
  const x = zoom.x + dismiss.x;
  const y = zoom.y + dismiss.y;
  return `translate3d(${x}px, ${y}px, 0px) scale(${zoom.scale * dismiss.scale})`;
}

/** Pan limits at `scale`, so a zoomed image always covers its item. */
export function getLightboxPanBounds(
  layout: LightboxMediaLayout,
  scale: number,
): { minX: number; maxX: number; minY: number; maxY: number } {
  const getAxis = (start: number, size: number, itemSize: number) => {
    const scaledSize = size * scale;
    const center = start + size / 2;
    if (scaledSize <= itemSize) {
      // An off-center image can fit but still grow past one edge.
      const offset = clampLightboxValue(
        0,
        scaledSize / 2 - center,
        itemSize - scaledSize / 2 - center,
      );
      return { min: offset, max: offset };
    }
    return {
      min: itemSize - (center + scaledSize / 2),
      max: -(center - scaledSize / 2),
    };
  };
  const x = getAxis(layout.left, layout.width, layout.slideWidth);
  const y = getAxis(layout.top, layout.height, layout.slideHeight);
  return { minX: x.min, maxX: x.max, minY: y.min, maxY: y.max };
}

/** Distance an overflow moves under the finger: less and less as it grows. */
export function rubberbandLightboxOverflow(
  overflow: number,
  dimension: number,
): number {
  if (dimension <= 0) return 0;
  const sign = Math.sign(overflow);
  const distance = Math.abs(overflow);
  return sign * (1 - 1 / ((distance * 0.55) / dimension + 1)) * dimension;
}

/** `value` inside `[min, max]`, with a rubber band past the limits. */
export function rubberbandLightboxValue(
  value: number,
  min: number,
  max: number,
  dimension: number,
): number {
  if (value < min)
    return min + rubberbandLightboxOverflow(value - min, dimension);
  if (value > max)
    return max + rubberbandLightboxOverflow(value - max, dimension);
  return value;
}

/**
 * Zoom to `scale` keeping `point` (px from the item's corner) under the
 * finger or cursor.
 */
export function zoomLightboxAroundPoint(
  zoom: LightboxZoom,
  scale: number,
  point: { x: number; y: number },
  layout: LightboxMediaLayout,
): LightboxZoom {
  const centerX = layout.left + layout.width / 2;
  const centerY = layout.top + layout.height / 2;
  const ratio = scale / zoom.scale;
  return {
    scale,
    x: point.x - centerX - (point.x - centerX - zoom.x) * ratio,
    y: point.y - centerY - (point.y - centerY - zoom.y) * ratio,
  };
}

/** `zoom` with its scale in `[minScale, maxScale]` and its pan in bounds. */
export function clampLightboxZoom(
  zoom: LightboxZoom,
  layout: LightboxMediaLayout,
  minScale: number,
  maxScale: number,
): LightboxZoom {
  const scale = clampLightboxValue(zoom.scale, minScale, maxScale);
  // Scaling back to rest also drops the pan.
  if (scale <= minScale) return { scale, x: 0, y: 0 };
  const bounds = getLightboxPanBounds(layout, scale);
  return {
    scale,
    x: clampLightboxValue(zoom.x, bounds.minX, bounds.maxX),
    y: clampLightboxValue(zoom.y, bounds.minY, bounds.maxY),
  };
}

export function isLightboxZoomed(scale: number, minScale: number): boolean {
  return scale > minScale + 0.01;
}

export function toLightboxRect(element: Element): LightboxRect {
  const { left, top, width, height } = element.getBoundingClientRect();
  return { left, top, width, height };
}

/**
 * `rect` relative to `container`, both from `getBoundingClientRect`, moved
 * by `offset`: the container's border minus its scroll, for the coordinates
 * of an absolutely positioned child that scrolls with its content.
 */
export function getLightboxRelativeRect(
  rect: LightboxRect,
  container: LightboxRect,
  offset: { left: number; top: number } = { left: 0, top: 0 },
): LightboxRect {
  return {
    left: rect.left - container.left - offset.left,
    top: rect.top - container.top - offset.top,
    width: rect.width,
    height: rect.height,
  };
}
