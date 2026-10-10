"use client";

import { createContext, use } from "react";

export interface LightboxViewportContextValue {
  /** Width of the viewport, and of each item (px). */
  width: number;
  /** Space between items, from the viewport's CSS `column-gap` (px). */
  gap: number;
  /** `-1` in right-to-left layouts, where the next item is on the left. */
  directionSign: 1 | -1;
}

/** The item a `Lightbox.Viewport` child renders, so `Lightbox.Slide` needs no props. */
export interface LightboxViewportSlideContextValue {
  index: number;
  /**
   * Slot on the track the item is drawn at. Its index, except for the item
   * left by a jump of several items, drawn next to the new one while it slides out.
   */
  position: number;
}

export const LightboxViewportContext =
  createContext<LightboxViewportContextValue | null>(null);

export const LightboxViewportSlideContext =
  createContext<LightboxViewportSlideContextValue | null>(null);

export function useLightboxViewportContext(): LightboxViewportContextValue {
  const context = use(LightboxViewportContext);
  if (!context) {
    throw new Error(
      "Base UI: LightboxViewportContext is missing. " +
        "Lightbox.Slide must be placed within <Lightbox.Viewport>.",
    );
  }
  return context;
}

export function useLightboxViewportSlideContext(): LightboxViewportSlideContextValue {
  const context = use(LightboxViewportSlideContext);
  if (!context) {
    throw new Error(
      "Base UI: LightboxViewportSlideContext is missing. " +
        "Lightbox.Slide must be returned by the function passed to <Lightbox.Viewport>.",
    );
  }
  return context;
}
