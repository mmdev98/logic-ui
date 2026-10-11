"use client";

import { createContext, use } from "react";
import {
  type LightboxDismiss,
  type LightboxMediaLayout,
  type LightboxMediaSize,
  type LightboxItemValue,
  type LightboxZoom,
} from "../types";
import type {
  LightboxRootActivationDirection,
  LightboxRootPhase,
  LightboxRootChangeEventDetails,
} from "./lightbox-root";

/**
 * Slide of the track after the index changed by `step`. `offset` is where a
 * swipe left it, in px along the reading direction (towards the end is negative).
 */
export type LightboxTrackTransition = {
  step: number;
  offset: number;
};

/** A media registered by `Lightbox.Media`, for gestures and flights. */
export type LightboxMediaEntry = {
  /** The `Lightbox.Media` box: it flies and follows the pull to dismiss. */
  element: HTMLElement;
  /** Its `<img>`, which zooms and pans, or `null` when the media can't zoom. */
  zoomElement: HTMLElement | null;
  slideElement: HTMLElement;
  layout: LightboxMediaLayout;
  /** Measures the media again; it registers again with its new layout. */
  measure: () => void;
};

/**
 * A `Lightbox.ThumbnailList` registered with the root, so the slides know
 * they are its tab panels.
 */
export type LightboxThumbnailListEntry = {
  element: HTMLElement;
};

export interface LightboxRootContextValue {
  items: readonly unknown[];
  /** Value of each item, in the order of `items`. */
  values: readonly LightboxItemValue[];
  /** Index of the item shown in the viewer, or last shown. */
  index: number;
  activeItem: unknown;
  /** Value of the item shown in the viewer, or last shown. */
  activeValue: LightboxItemValue | undefined;
  open: boolean;
  phase: LightboxRootPhase;
  /** Value of the item whose image loads before the viewer opens. */
  pendingValue: LightboxItemValue | null;
  /** The trigger the image flies from or lands on, while it flies. */
  flyingTrigger: HTMLElement | null;
  /**
   * The trigger the image flies back to when the viewer closes, as
   * `closeTarget` picks it, while the viewer is open: its slot stays empty.
   */
  landingTrigger: HTMLElement | null;
  /** Whether the active image is zoomed in. */
  zoomed: boolean;
  /** Whether a tap hid the controls (caption, buttons). */
  controlsHidden: boolean;
  hasPrevious: boolean;
  hasNext: boolean;
  minScale: number;
  maxScale: number;
  /** Natural sizes of the media loaded so far, by item value. */
  mediaSizes: ReadonlyMap<LightboxItemValue, LightboxMediaSize>;
  /** Side of the previous item the item shown came from, on screen. */
  activationDirection: LightboxRootActivationDirection;
  /** Prefix of the ids that link the thumbnails to the slides. */
  id: string;
  /** The `Lightbox.ThumbnailList`, when there is one. */
  thumbnailList: LightboxThumbnailListEntry | null;
  /**
   * Loads the item's image, then opens the viewer on it. The image flies from
   * `eventDetails.trigger` (else the item's trigger), and focus returns to it on close.
   */
  openValue: (
    value: LightboxItemValue,
    eventDetails: LightboxRootChangeEventDetails,
  ) => Promise<void>;
  // Each asks `onValueChange` first, and returns whether the item changed.
  /** `velocity`: of the pull that dismissed it (px/ms), which the flight starts with. */
  close: (
    eventDetails: LightboxRootChangeEventDetails,
    velocity?: { x: number; y: number },
  ) => boolean;
  goTo: (
    index: number,
    eventDetails: LightboxRootChangeEventDetails,
  ) => boolean;
  goToPrevious: (eventDetails: LightboxRootChangeEventDetails) => boolean;
  goToNext: (eventDetails: LightboxRootChangeEventDetails) => boolean;
  zoomIn: () => void;
  zoomOut: () => void;
  resetZoom: () => void;
  panBy: (deltaX: number, deltaY: number) => void;
  toggleControls: () => void;

  // Wiring between the lightbox parts.
  /** Element focused when the viewer closes. */
  getFinalFocus: () => HTMLElement | null;
  setMediaSize: (value: LightboxItemValue, size: LightboxMediaSize) => void;
  /** Registers a trigger to fly to and from. Returns the unregister function. */
  registerTrigger: (
    value: LightboxItemValue,
    element: HTMLElement,
  ) => () => void;
  /** Registers a slide's media. Returns the unregister function. */
  registerMedia: (
    value: LightboxItemValue,
    entry: LightboxMediaEntry,
  ) => () => void;
  getActiveMedia: () => LightboxMediaEntry | undefined;
  /** Registers the `Lightbox.ThumbnailList`. Returns the unregister function. */
  registerThumbnailList: (entry: LightboxThumbnailListEntry) => () => void;
  setPopupElement: (element: HTMLElement | null) => void;
  setBackdropElement: (element: HTMLElement | null) => void;
  getZoom: () => LightboxZoom;
  /** Applies a zoom now, stopping any zoom animation. */
  setZoom: (zoom: LightboxZoom) => void;
  /** Animates to a zoom; `clamp` first brings it in bounds. */
  animateZoom: (
    zoom: LightboxZoom,
    options?: { clamp?: boolean | undefined },
  ) => void;
  setDismiss: (dismiss: LightboxDismiss, progress: number) => void;
  /** Animates the pull to dismiss to `dismiss`, then calls `onComplete`. */
  animateDismiss: (dismiss: LightboxDismiss, onComplete?: () => void) => void;
  /** Sets `data-swiping` on the popup and the backdrop, so the app can turn transitions off. */
  setSwiping: (swiping: boolean) => void;
  /** Writes how far the slides moved, in px on screen and as a share of a slide, on the popup. */
  setSwipe: (movementX: number, progress: number) => void;
  /** Writes the strength of a released swipe, 0.1 to 1, on the popup. */
  setSwipeStrength: (strength: number) => void;
  /** Moves the active item by `step` after a swipe left the track `fromOffset` px away. */
  stepIndex: (
    step: number,
    fromOffset: number,
    eventDetails: LightboxRootChangeEventDetails,
  ) => boolean;
  /** How the track should slide to the new index, read once by `Lightbox.Viewport`. */
  takeTrackTransition: () => LightboxTrackTransition | null;
}

/** Changes on every zoom frame, so it lives apart from `LightboxRootContext`. */
export interface LightboxRootZoomContextValue {
  scale: number;
  canZoomIn: boolean;
  canZoomOut: boolean;
}

export const LightboxRootContext =
  createContext<LightboxRootContextValue | null>(null);

export const LightboxRootZoomContext =
  createContext<LightboxRootZoomContextValue | null>(null);

export function useLightboxRootContext(): LightboxRootContextValue {
  const context = use(LightboxRootContext);
  if (!context) {
    throw new Error(
      "Base UI: LightboxRootContext is missing. " +
        "Lightbox parts must be placed within <Lightbox.Root>.",
    );
  }
  return context;
}

/**
 * Reads `LightboxRootContext` when there is one: `Lightbox.Trigger` can be
 * placed outside `Lightbox.Root` with a `handle`.
 */
export function useLightboxRootContextOptional(): LightboxRootContextValue | null {
  return use(LightboxRootContext);
}

export function useLightboxRootZoomContext(): LightboxRootZoomContextValue {
  const context = use(LightboxRootZoomContext);
  if (!context) {
    throw new Error(
      "Base UI: LightboxRootZoomContext is missing. " +
        "Lightbox parts must be placed within <Lightbox.Root>.",
    );
  }
  return context;
}
