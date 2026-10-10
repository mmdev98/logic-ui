"use client";

import { createContext, use } from "react";

export interface LightboxThumbnailListContextValue {
  /** Index of the thumbnail in the tab order (roving `tabIndex`). */
  focusIndex: number;
  setFocusIndex: (index: number) => void;
  /** Registers a thumbnail for the arrow keys. Returns the unregister function. */
  registerThumbnail: (index: number, element: HTMLElement) => () => void;
  /** The list's element, which `Lightbox.ThumbnailIndicator` measures in. */
  element: HTMLElement | null;
  getThumbnail: (index: number) => HTMLElement | undefined;
}

/** The item a `Lightbox.ThumbnailList` child renders, so `Lightbox.Thumbnail` needs no props. */
export interface LightboxThumbnailListItemContextValue {
  index: number;
}

export const LightboxThumbnailListContext =
  createContext<LightboxThumbnailListContextValue | null>(null);

export const LightboxThumbnailListItemContext =
  createContext<LightboxThumbnailListItemContextValue | null>(null);

export function useLightboxThumbnailListContext(): LightboxThumbnailListContextValue {
  const context = use(LightboxThumbnailListContext);
  if (!context) {
    throw new Error(
      "Base UI: LightboxThumbnailListContext is missing. " +
        "Lightbox.Thumbnail and Lightbox.ThumbnailIndicator must be placed within <Lightbox.ThumbnailList>.",
    );
  }
  return context;
}

export function useLightboxThumbnailListItemContext(): LightboxThumbnailListItemContextValue {
  const context = use(LightboxThumbnailListItemContext);
  if (!context) {
    throw new Error(
      "Base UI: LightboxThumbnailListItemContext is missing. " +
        "Lightbox.Thumbnail must be returned by the function passed to <Lightbox.ThumbnailList>.",
    );
  }
  return context;
}
