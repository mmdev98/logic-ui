"use client";

import { createContext, use } from "react";
import type { CropperHandlePosition } from "../handle/cropper-handle";
import type { CropperPoint } from "../types";

/** What a press on a registered element drags. */
export type CropperViewportTarget =
  | { kind: "stencil"; isMovable: () => boolean }
  | {
      kind: "handle";
      position: CropperHandlePosition;
      isDisabled: () => boolean;
    };

export interface CropperViewportContextValue {
  /** Registers an element whose presses drag the crop. Returns the cleanup. */
  registerTarget: (
    element: Element,
    target: CropperViewportTarget,
  ) => () => void;
  /** The handle being dragged. */
  activeHandle: CropperHandlePosition | null;
  /**
   * Where the area the crop stays in starts: the viewport's padding. The
   * image and the crop are placed from there; the image shows in the padding
   * too.
   */
  inset: CropperPoint;
}

export const CropperViewportContext =
  createContext<CropperViewportContextValue | null>(null);

export function useCropperViewportContext(): CropperViewportContextValue {
  const context = use(CropperViewportContext);
  if (!context) {
    throw new Error(
      "Base UI: CropperViewportContext is missing. " +
        "Cropper.Image, Cropper.Stencil and Cropper.Handle must be placed within <Cropper.Viewport>.",
    );
  }
  return context;
}
