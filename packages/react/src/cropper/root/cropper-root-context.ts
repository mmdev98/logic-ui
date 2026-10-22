"use client";

import { createContext, use } from "react";
import type {
  CropperCanvasOptions,
  CropperCoordinates,
  CropperPoint,
  CropperSize,
  CropperState,
} from "../types";
import type { CropperCoordinatesTransform } from "../utils/cropper-settings";
import type { CropperEngine, CropperInteractions } from "./cropper-engine";
import type {
  CropperRootChangeEventReason,
  CropperRootStatus,
} from "./cropper-root";

/** The image the cropper shows, once loaded. */
export interface CropperLoadedImage {
  src: string;
  /** Natural size. */
  width: number;
  height: number;
  element: HTMLImageElement;
}

/**
 * What the cropper can do from code: through `actionsRef`, or through
 * `useCropperRootContext()` in a part of your own.
 */
export interface CropperRootActions {
  /** The full state, or `null` before the image is on screen. */
  getState: () => CropperState | null;
  /** The crop in whole pixels of the (rotated) image. */
  getCoordinates: () => CropperCoordinates | null;
  /** Draws the crop on a new canvas. The image must allow it (`crossOrigin`). */
  getCanvas: (options?: CropperCanvasOptions) => HTMLCanvasElement | null;
  /** Moves or resizes the crop, in image pixels; a size without position is kept centered. */
  setCoordinates: (
    coordinates: Exclude<CropperCoordinatesTransform, null>,
  ) => void;
  /** Replaces the state, such as one saved from `getState()`. */
  setState: (state: CropperState) => void;
  /** Zooms by `factor` (above 1 zooms in), around a point of the image or the center. */
  zoom: (factor: number, center?: CropperPoint) => void;
  /** Zooms to `zoom`, from 0 (widest view) to 1 (closest view). */
  setZoom: (zoom: number) => void;
  /** Moves the view by image pixels. */
  move: (left: number, top: number) => void;
  /** Rotates the image by `angle` degrees, clockwise. */
  rotate: (angle: number) => void;
  /** Mirrors the image as seen on screen. */
  flip: (horizontal: boolean, vertical?: boolean) => void;
  /** Starts over with the default crop. */
  reset: () => void;
}

export interface CropperRootContextValue {
  actions: CropperRootActions;
  status: CropperRootStatus;
  disabled: boolean;
  image: CropperLoadedImage | null;
  crossOrigin: "anonymous" | "use-credentials" | undefined;
  /** The crop keeps its size on screen (`stencilSize`): it can't be moved or resized. */
  fixedStencil: boolean;
  /** @internal */
  engine: CropperEngine;
  /** @internal Called by `Cropper.Viewport` with its size. */
  setBoundary: (boundary: CropperSize | null) => void;
  /** @internal Runs an action with a reason, for the parts. */
  runAction: (
    reason: CropperRootChangeEventReason,
    event: Event | undefined,
    action: (actions: CropperRootActions) => void,
  ) => void;
}

/** Values that change on every frame of a gesture. */
export interface CropperRootStateContextValue {
  state: CropperState | null;
  interactions: CropperInteractions;
  interacting: boolean;
  transitioning: boolean;
  /** From 0 (widest view) to 1 (closest view). */
  zoom: number;
}

export const CropperRootContext = createContext<CropperRootContextValue | null>(
  null,
);

export const CropperRootStateContext =
  createContext<CropperRootStateContextValue | null>(null);

export function useCropperRootContext(): CropperRootContextValue {
  const context = use(CropperRootContext);
  if (!context) {
    throw new Error(
      "Base UI: CropperRootContext is missing. " +
        "Cropper parts must be placed within <Cropper.Root>.",
    );
  }
  return context;
}

export function useCropperRootStateContext(): CropperRootStateContextValue {
  const context = use(CropperRootStateContext);
  if (!context) {
    throw new Error(
      "Base UI: CropperRootStateContext is missing. " +
        "Cropper parts must be placed within <Cropper.Root>.",
    );
  }
  return context;
}
