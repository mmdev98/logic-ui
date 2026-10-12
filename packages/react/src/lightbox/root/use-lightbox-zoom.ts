"use client";

import { useStableCallback } from "@base-ui/utils/useStableCallback";
import * as React from "react";
import {
  LIGHTBOX_DISMISS_PROGRESS_VARIABLE,
  LIGHTBOX_SETTLE_DURATION,
} from "../constants";
import type { LightboxDismiss, LightboxZoom } from "../types";
import {
  clampLightboxValue,
  clampLightboxZoom,
  formatLightboxTransform,
  LIGHTBOX_IDENTITY_DISMISS,
  LIGHTBOX_IDENTITY_ZOOM,
} from "../utils/lightbox-geometry";
import { tweenLightbox } from "../utils/lightbox-motion";
import {
  dismissMovementX,
  dismissMovementY,
  zoomProgress,
  zoomScale,
} from "../popup/lightbox-popup-css-vars";
import type { LightboxMediaEntry } from "./lightbox-root-context";

export interface UseLightboxZoomOptions {
  getActiveMedia: () => LightboxMediaEntry | undefined;
  /** Elements that receive `--lightbox-dismiss-progress`. */
  getDismissTargets: () => (HTMLElement | null)[];
  minScale: number;
  maxScale: number;
}

export interface UseLightboxZoomResult {
  /** Scale of the active image, rounded to hundredths, for rendering. */
  scale: number;
  getZoom: () => LightboxZoom;
  /** Where the running zoom animation ends, or the current zoom. */
  getTargetZoom: () => LightboxZoom;
  setZoom: (zoom: LightboxZoom) => void;
  animateZoom: (
    zoom: LightboxZoom,
    options?: { clamp?: boolean | undefined },
  ) => void;
  setDismiss: (dismiss: LightboxDismiss, progress: number) => void;
  /** Animates the pull to dismiss to `dismiss`, then calls `onComplete`. */
  animateDismiss: (dismiss: LightboxDismiss, onComplete?: () => void) => void;
  /** Puts the active image back at rest at once, without animation. */
  reset: () => void;
  /**
   * Lets the active image go as another item becomes active: it keeps its
   * zoom while it slides out, and the zoom starts again at rest for the next
   * one. `updateLeft` resets it once it is out of sight.
   */
  leave: () => void;
  /**
   * Resets the zoom of the images left by `leave` that no longer show in
   * `viewport`. Once `settled`, it animates the ones still in sight back to
   * rest. An image that is active again takes its zoom back.
   */
  updateLeft: (viewport: HTMLElement | null, settled: boolean) => void;
  /** Stops the running zoom and pull animations where they are, writing nothing. */
  stop: () => void;
  /** Writes the CSS variables again, to a popup or backdrop that just mounted. */
  refresh: () => void;
}

function mix(from: number, to: number, progress: number): number {
  return from + (to - from) * progress;
}

/**
 * Zoom, pan and pull to dismiss of the active media. The values live in refs and
 * are written to the elements directly, so a gesture frame only re-renders
 * the parts that show the scale: the zoom to the media's `<img>`, the close
 * drag to the `Lightbox.Media` box, so all of its content moves with it.
 */
export function useLightboxZoom(
  options: UseLightboxZoomOptions,
): UseLightboxZoomResult {
  const { getActiveMedia, getDismissTargets, minScale, maxScale } = options;

  const [scale, setScale] = React.useState(minScale);
  const zoomRef = React.useRef(LIGHTBOX_IDENTITY_ZOOM);
  const dismissRef = React.useRef(LIGHTBOX_IDENTITY_DISMISS);
  const dismissProgressRef = React.useRef(0);
  const stopZoomRef = React.useRef<(() => void) | null>(null);
  const targetZoomRef = React.useRef<LightboxZoom | null>(null);
  const stopDismissRef = React.useRef<(() => void) | null>(null);
  // Images left zoomed by `leave`, until they're out of sight.
  const leftRef = React.useRef<
    { element: HTMLElement; zoom: LightboxZoom; stop: (() => void) | null }[]
  >([]);

  // The pull to dismiss and the zoom as CSS variables on the popup and the
  // backdrop, so the app's styles can follow them frame by frame.
  const writeVariables = useStableCallback(() => {
    const { scale: zoomScaleValue } = zoomRef.current;
    const zoomProgressValue = clampLightboxValue(
      (zoomScaleValue - minScale) / (maxScale - minScale || 1),
      0,
      1,
    );
    for (const target of getDismissTargets()) {
      if (!target) continue;
      const { style } = target;
      style.setProperty(
        LIGHTBOX_DISMISS_PROGRESS_VARIABLE,
        String(dismissProgressRef.current),
      );
      style.setProperty(dismissMovementX, `${dismissRef.current.x}px`);
      style.setProperty(dismissMovementY, `${dismissRef.current.y}px`);
      style.setProperty(
        zoomScale,
        String(Math.round(zoomScaleValue * 1000) / 1000),
      );
      style.setProperty(
        zoomProgress,
        String(Math.round(zoomProgressValue * 1000) / 1000),
      );
    }
  });

  const write = useStableCallback(() => {
    const entry = getActiveMedia();
    if (entry?.zoomElement) {
      entry.zoomElement.style.transform = formatLightboxTransform(
        zoomRef.current,
      );
    }
    if (entry) {
      // The individual `translate` and `scale` properties, so they add to
      // the `transform` of a flight.
      const { x, y, scale: dismissScale } = dismissRef.current;
      const atRest = x === 0 && y === 0 && dismissScale === 1;
      entry.element.style.translate = atRest ? "" : `${x}px ${y}px`;
      entry.element.style.scale = atRest ? "" : String(dismissScale);
    }
    writeVariables();
    setScale(Math.round(zoomRef.current.scale * 100) / 100);
  });

  const stopZoom = () => {
    stopZoomRef.current?.();
    stopZoomRef.current = null;
    targetZoomRef.current = null;
  };

  const stopDismiss = () => {
    stopDismissRef.current?.();
    stopDismissRef.current = null;
  };

  const getZoom = useStableCallback(() => zoomRef.current);
  const getTargetZoom = useStableCallback(
    () => targetZoomRef.current ?? zoomRef.current,
  );

  const setZoom = useStableCallback((zoom: LightboxZoom) => {
    stopZoom();
    zoomRef.current = zoom;
    write();
  });

  const animateZoom = useStableCallback(
    (zoom: LightboxZoom, animateOptions?: { clamp?: boolean | undefined }) => {
      stopZoom();
      const entry = getActiveMedia();
      const target =
        animateOptions?.clamp && entry
          ? clampLightboxZoom(zoom, entry.layout, minScale, maxScale)
          : zoom;
      const from = zoomRef.current;
      targetZoomRef.current = target;
      stopZoomRef.current = tweenLightbox(
        LIGHTBOX_SETTLE_DURATION,
        (progress) => {
          zoomRef.current = {
            scale: mix(from.scale, target.scale, progress),
            x: mix(from.x, target.x, progress),
            y: mix(from.y, target.y, progress),
          };
          write();
        },
        () => {
          targetZoomRef.current = null;
        },
      );
    },
  );

  const setDismiss = useStableCallback(
    (dismiss: LightboxDismiss, progress: number) => {
      stopDismiss();
      dismissRef.current = dismiss;
      dismissProgressRef.current = progress;
      write();
    },
  );

  const animateDismiss = useStableCallback(
    (dismiss: LightboxDismiss, onComplete?: () => void) => {
      stopDismiss();
      const from = dismissRef.current;
      const fromProgress = dismissProgressRef.current;
      const isRest = dismiss.x === 0 && dismiss.y === 0 && dismiss.scale === 1;
      stopDismissRef.current = tweenLightbox(
        LIGHTBOX_SETTLE_DURATION,
        (progress) => {
          dismissRef.current = {
            x: mix(from.x, dismiss.x, progress),
            y: mix(from.y, dismiss.y, progress),
            scale: mix(from.scale, dismiss.scale, progress),
          };
          dismissProgressRef.current = isRest
            ? mix(fromProgress, 0, progress)
            : fromProgress;
          write();
        },
        onComplete,
      );
    },
  );

  /** Puts a left image back at rest and forgets it. */
  const releaseLeft = (index: number, element: HTMLElement) => {
    leftRef.current[index]?.stop?.();
    leftRef.current.splice(index, 1);
    element.style.transform = formatLightboxTransform(LIGHTBOX_IDENTITY_ZOOM);
  };

  const releaseAllLeft = () => {
    for (let index = leftRef.current.length - 1; index >= 0; index -= 1)
      releaseLeft(index, leftRef.current[index]!.element);
  };

  const reset = useStableCallback(() => {
    stopZoom();
    stopDismiss();
    releaseAllLeft();
    zoomRef.current = LIGHTBOX_IDENTITY_ZOOM;
    dismissRef.current = LIGHTBOX_IDENTITY_DISMISS;
    dismissProgressRef.current = 0;
    write();
  });

  const leave = useStableCallback(() => {
    // Where a zoom animation was going, so it slides out where it was headed.
    const zoom = targetZoomRef.current ?? zoomRef.current;
    stopZoom();
    stopDismiss();
    const entry = getActiveMedia();
    const isAtRest = zoom.scale === 1 && zoom.x === 0 && zoom.y === 0;
    if (entry?.zoomElement && !isAtRest) {
      entry.zoomElement.style.transform = formatLightboxTransform(zoom);
      leftRef.current.push({ element: entry.zoomElement, zoom, stop: null });
    }
    if (entry) {
      entry.element.style.translate = "";
      entry.element.style.scale = "";
    }
    zoomRef.current = LIGHTBOX_IDENTITY_ZOOM;
    dismissRef.current = LIGHTBOX_IDENTITY_DISMISS;
    dismissProgressRef.current = 0;
    writeVariables();
    setScale(LIGHTBOX_IDENTITY_ZOOM.scale);
  });

  const updateLeft = useStableCallback(
    (viewport: HTMLElement | null, settled: boolean) => {
      const left = leftRef.current;
      if (left.length === 0) return;
      const active = getActiveMedia()?.zoomElement;
      const bounds = viewport?.getBoundingClientRect();
      for (let index = left.length - 1; index >= 0; index -= 1) {
        const item = left[index]!;
        const { element } = item;
        if (!element.isConnected) {
          left.splice(index, 1);
          continue;
        }
        // Swiped back to before it left sight: it is zoomed as it was, or at
        // rest if it had started back there.
        if (element === active) {
          item.stop?.();
          left.splice(index, 1);
          if (!item.stop) zoomRef.current = item.zoom;
          write();
          continue;
        }
        const rect = element.getBoundingClientRect();
        const inSight =
          !bounds ||
          (rect.right > bounds.left &&
            rect.left < bounds.right &&
            rect.bottom > bounds.top &&
            rect.top < bounds.bottom);
        if (!inSight) releaseLeft(index, element);
        else if (settled && !item.stop) {
          // Still in sight once the track has settled, beside the active
          // item: it zooms back to rest.
          const from = item.zoom;
          item.stop = tweenLightbox(
            LIGHTBOX_SETTLE_DURATION,
            (progress) => {
              element.style.transform = formatLightboxTransform({
                scale: mix(from.scale, 1, progress),
                x: mix(from.x, 0, progress),
                y: mix(from.y, 0, progress),
              });
            },
            () => {
              const at = leftRef.current.indexOf(item);
              if (at !== -1) leftRef.current.splice(at, 1);
            },
          );
        }
      }
    },
  );

  const stop = useStableCallback(() => {
    stopZoom();
    stopDismiss();
  });

  return {
    scale,
    getZoom,
    getTargetZoom,
    setZoom,
    animateZoom,
    setDismiss,
    animateDismiss,
    reset,
    leave,
    updateLeft,
    stop,
    refresh: writeVariables,
  };
}
