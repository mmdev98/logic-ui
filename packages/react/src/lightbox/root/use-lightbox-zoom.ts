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
  animateZoom: (zoom: LightboxZoom, options?: { clamp?: boolean }) => void;
  setDismiss: (dismiss: LightboxDismiss, progress: number) => void;
  /** Animates the close drag to `dismiss`, then calls `onComplete`. */
  animateDismiss: (dismiss: LightboxDismiss, onComplete?: () => void) => void;
  /** Puts the active image back at rest at once, without animation. */
  reset: () => void;
  /** Stops the running zoom and close-drag animations where they are, writing nothing. */
  stop: () => void;
  /** Writes the CSS variables again, to a popup or backdrop that just mounted. */
  refresh: () => void;
}

function mix(from: number, to: number, progress: number): number {
  return from + (to - from) * progress;
}

/**
 * Zoom, pan and close-drag of the active media. The values live in refs and
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

  // The drag to close and the zoom as CSS variables on the popup and the
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
    (zoom: LightboxZoom, animateOptions?: { clamp?: boolean }) => {
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

  const reset = useStableCallback(() => {
    stopZoom();
    stopDismiss();
    zoomRef.current = LIGHTBOX_IDENTITY_ZOOM;
    dismissRef.current = LIGHTBOX_IDENTITY_DISMISS;
    dismissProgressRef.current = 0;
    write();
  });

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
    stop,
    refresh: writeVariables,
  };
}
