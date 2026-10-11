"use client";

import { createContext, use } from "react";
import type { LightboxItemValue } from "../types";
import type { LightboxMediaStatus } from "../media/lightbox-media";

export interface LightboxSlideContextValue {
  /** The item, as passed to `items`. */
  item: unknown;
  value: LightboxItemValue;
  index: number;
  active: boolean;
  /** The slide's element, which `Lightbox.Media` measures. */
  element: HTMLElement | null;
  /** Loading state of its `Lightbox.Media`. */
  status: LightboxMediaStatus;
  setStatus: (status: LightboxMediaStatus) => void;
  /** Links the slide to its `Lightbox.Caption` for screen readers. */
  setCaptionId: (id: string | undefined) => void;
}

export const LightboxSlideContext =
  createContext<LightboxSlideContextValue | null>(null);

export function useLightboxSlideContext(): LightboxSlideContextValue {
  const context = use(LightboxSlideContext);
  if (!context) {
    throw new Error(
      "Base UI: LightboxSlideContext is missing. " +
        "Lightbox.Media and Lightbox.Caption must be placed within <Lightbox.Slide>.",
    );
  }
  return context;
}
