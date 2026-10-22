// Queries on the cropper state. Ported from `advanced-cropper` (MIT,
// Copyright (c) Norserium), see LICENSE.
import type {
  CropperCoordinates,
  CropperPositionRestrictions,
  CropperSize,
  CropperSizeRestrictions,
  CropperState,
} from "../types";
import type { CropperSettings } from "./cropper-settings";
import {
  type CropperAspectRatioRange,
  getCropperBrokenRatio,
  getCropperRatio,
  isCropperPositionConsistent,
  isCropperSizeConsistent,
  moveCropperToPositionRestrictions,
  reconcileCropperSizeRestrictions,
  rotateCropperSize,
} from "./cropper-geometry";

/** A state with an image on screen: its crop and visible area are set. */
export interface CropperInitializedState extends CropperState {
  visibleArea: CropperCoordinates;
  coordinates: CropperCoordinates;
}

export function isCropperStateInitialized(
  state: CropperState | null,
): state is CropperInitializedState {
  return Boolean(state?.visibleArea && state.coordinates);
}

export function copyCropperState<T extends CropperState | null>(state: T): T {
  if (!state) return state;
  return {
    boundary: { ...state.boundary },
    imageSize: { ...state.imageSize },
    transforms: {
      rotate: state.transforms.rotate,
      flip: { ...state.transforms.flip },
    },
    visibleArea: state.visibleArea ? { ...state.visibleArea } : null,
    coordinates: state.coordinates ? { ...state.coordinates } : null,
  } as T;
}

/** Image pixels per screen pixel. */
export function getCropperCoefficient(state: CropperState): number {
  return state.visibleArea ? state.visibleArea.width / state.boundary.width : 0;
}

/** Size of the box around the rotated image. */
export function getCropperTransformedImageSize(
  state: CropperState,
): CropperSize {
  if (state.imageSize.width && state.imageSize.height) {
    return rotateCropperSize(state.imageSize, state.transforms.rotate);
  }
  return { width: 0, height: 0 };
}

export function getCropperAspectRatio(
  state: CropperState,
  settings: CropperSettings,
): CropperAspectRatioRange {
  return settings.getAspectRatio(state);
}

export function getCropperPositionRestrictions(
  state: CropperState,
  settings: CropperSettings,
): CropperPositionRestrictions {
  return settings.getPositionRestrictions(state);
}

export function getCropperAreaPositionRestrictions(
  state: CropperState,
  settings: CropperSettings,
): CropperPositionRestrictions {
  return settings.getAreaPositionRestrictions(state);
}

/** Size restrictions of the crop, narrowed so it can fit its position limits. */
export function getCropperSizeRestrictions(
  state: CropperState,
  settings: CropperSettings,
): CropperSizeRestrictions {
  const restrictions = { ...settings.getSizeRestrictions(state) };
  const { left, top, right, bottom } = getCropperPositionRestrictions(
    state,
    settings,
  );
  if (left !== undefined && right !== undefined) {
    restrictions.maxWidth = Math.min(restrictions.maxWidth, right - left);
  }
  if (top !== undefined && bottom !== undefined) {
    restrictions.maxHeight = Math.min(restrictions.maxHeight, bottom - top);
  }
  return reconcileCropperSizeRestrictions(restrictions);
}

/** Size restrictions of the visible area, made to keep the viewport's ratio. */
export function getCropperAreaSizeRestrictions(
  state: CropperState,
  settings: CropperSettings,
): CropperSizeRestrictions {
  const restrictions = { ...settings.getAreaSizeRestrictions(state) };
  if (restrictions.maxWidth < Infinity && restrictions.maxHeight < Infinity) {
    const ratio = getCropperRatio(state.boundary);
    if (ratio > restrictions.maxWidth / restrictions.maxHeight) {
      restrictions.maxHeight = restrictions.maxWidth / ratio;
    } else {
      restrictions.maxWidth = restrictions.maxHeight * ratio;
    }
  }
  return reconcileCropperSizeRestrictions(restrictions);
}

/**
 * Smallest side the crop can be resized to: about the size of a handle on
 * screen, so the handles never overlap.
 */
export function getCropperMinimumSize(state: CropperState): number {
  return state.coordinates
    ? Math.min(
        state.coordinates.width,
        state.coordinates.height,
        20 * getCropperCoefficient(state),
      )
    : 1;
}

/** The crop on screen, relative to the viewport. */
export function getCropperStencilCoordinates(
  state: CropperState | null,
): CropperCoordinates {
  if (!isCropperStateInitialized(state)) {
    return { left: 0, top: 0, width: 0, height: 0 };
  }
  const { width, height, left, top } = state.coordinates;
  const coefficient = getCropperCoefficient(state);
  return {
    width: width / coefficient,
    height: height / coefficient,
    left: (left - state.visibleArea.left) / coefficient,
    top: (top - state.visibleArea.top) / coefficient,
  };
}

/** The crop in whole pixels, still within its restrictions. */
export function getCropperRoundedCoordinates(
  state: CropperState,
  settings: CropperSettings,
): CropperCoordinates | null {
  if (!isCropperStateInitialized(state)) return null;
  const { coordinates } = state;
  const sizeRestrictions = getCropperSizeRestrictions(state, settings);
  const rounded = {
    width: Math.round(coordinates.width),
    height: Math.round(coordinates.height),
    left: Math.round(coordinates.left),
    top: Math.round(coordinates.top),
  };
  if (rounded.width > sizeRestrictions.maxWidth) {
    rounded.width = Math.floor(coordinates.width);
  } else if (rounded.width < sizeRestrictions.minWidth) {
    rounded.width = Math.ceil(coordinates.width);
  }
  if (rounded.height > sizeRestrictions.maxHeight) {
    rounded.height = Math.floor(coordinates.height);
  } else if (rounded.height < sizeRestrictions.minHeight) {
    rounded.height = Math.ceil(coordinates.height);
  }
  return moveCropperToPositionRestrictions(
    rounded,
    getCropperPositionRestrictions(state, settings),
  );
}

/** Whether the state keeps every restriction of the settings. */
export function isCropperStateConsistent(
  state: CropperState,
  settings: CropperSettings,
): boolean {
  if (!isCropperStateInitialized(state)) return true;
  return (
    !getCropperBrokenRatio(
      getCropperRatio(state.coordinates),
      getCropperAspectRatio(state, settings),
    ) &&
    isCropperSizeConsistent(
      state.visibleArea,
      getCropperAreaSizeRestrictions(state, settings),
    ) &&
    isCropperSizeConsistent(
      state.coordinates,
      getCropperSizeRestrictions(state, settings),
    ) &&
    isCropperPositionConsistent(
      state.visibleArea,
      getCropperAreaPositionRestrictions(state, settings),
    ) &&
    isCropperPositionConsistent(
      state.coordinates,
      getCropperPositionRestrictions(state, settings),
    )
  );
}
