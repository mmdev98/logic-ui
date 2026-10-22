// A crop of fixed size on screen: the image moves and zooms behind it.
// Ported from the `stencil-size` extension of `advanced-cropper` (MIT,
// Copyright (c) Norserium), see LICENSE.
import type {
  CropperSize,
  CropperSizeRestrictions,
  CropperState,
} from "../types";
import type { CropperSettings } from "./cropper-settings";
import {
  applyCropperMove,
  applyCropperScale,
  approximateCropperSize,
  type CropperAspectRatioRange,
  createCropperAspectRatio,
  getCropperCenter,
  getCropperDiff,
  getCropperRatio,
  getCropperScaleToSizeRestrictions,
  intersectCropperAspectRatios,
  mergeCropperPositionRestrictions,
  moveCropperToPositionRestrictions,
  toCropperPositionRestrictions,
} from "./cropper-geometry";
import {
  copyCropperState,
  getCropperAreaPositionRestrictions,
  getCropperAreaSizeRestrictions,
  getCropperAspectRatio,
  getCropperSizeRestrictions,
  isCropperStateInitialized,
} from "./cropper-restrictions";

type GetStencilSize = (state: CropperState) => CropperSize;

/** The stencil size on screen, at an allowed ratio, within the viewport. */
export function getCropperFixedStencilSize(
  state: CropperState,
  getStencilSize: GetStencilSize,
  aspectRatio: CropperAspectRatioRange,
): CropperSize {
  const requested = getStencilSize(state);
  let size = approximateCropperSize({
    ...requested,
    aspectRatio: intersectCropperAspectRatios(
      aspectRatio,
      createCropperAspectRatio(getCropperRatio(requested)),
    ),
  });
  const { boundary } = state;
  if (size.width > boundary.width || size.height > boundary.height) {
    size = approximateCropperSize({
      ...size,
      sizeRestrictions: {
        minWidth: 0,
        minHeight: 0,
        maxWidth: boundary.width,
        maxHeight: boundary.height,
      },
      aspectRatio: createCropperAspectRatio(getCropperRatio(size)),
    });
  }
  return size;
}

export function getCropperFixedAspectRatio(
  state: CropperState,
  getStencilSize: GetStencilSize,
  aspectRatio: CropperAspectRatioRange,
): CropperAspectRatioRange {
  return createCropperAspectRatio(
    getCropperRatio(
      getCropperFixedStencilSize(state, getStencilSize, aspectRatio),
    ),
  );
}

/** The crop can't be larger than the stencil at the widest visible area. */
export function getCropperFixedSizeRestrictions(
  state: CropperState,
  settings: CropperSettings,
  getStencilSize: GetStencilSize,
  aspectRatio: CropperAspectRatioRange,
): CropperSizeRestrictions {
  const stencil = getCropperFixedStencilSize(
    state,
    getStencilSize,
    aspectRatio,
  );
  const area = getCropperAreaSizeRestrictions(state, settings);
  return {
    minWidth: 0,
    minHeight: 0,
    maxWidth: (area.maxWidth * stencil.width) / state.boundary.width,
    maxHeight: (area.maxHeight * stencil.height) / state.boundary.height,
  };
}

/** The crop that shows as the stencil size on screen. */
export function getCropperFixedDefaultSize(
  state: CropperState,
  settings: CropperSettings,
  getStencilSize: GetStencilSize,
  aspectRatio: CropperAspectRatioRange,
): CropperSize {
  const { imageSize, visibleArea, boundary } = state;
  const stencil = getCropperFixedStencilSize(
    state,
    getStencilSize,
    aspectRatio,
  );
  const area = visibleArea ?? imageSize;

  let width: number;
  let height: number;
  if (getCropperRatio(area) > getCropperRatio(boundary)) {
    height = (stencil.height * area.height) / boundary.height;
    width = height * getCropperRatio(stencil);
  } else {
    width = (stencil.width * area.width) / boundary.width;
    height = width / getCropperRatio(stencil);
  }
  return approximateCropperSize({
    width,
    height,
    aspectRatio: getCropperAspectRatio(state, settings),
    sizeRestrictions: getCropperSizeRestrictions(state, settings),
  });
}

/** Zooms the visible area so the crop shows at the stencil size, centered. */
export function fixCropperStencil(
  state: CropperState,
  settings: CropperSettings,
  getStencilSize: GetStencilSize,
  aspectRatio: CropperAspectRatioRange,
): CropperState {
  if (!isCropperStateInitialized(state)) return state;
  const result = copyCropperState(state);
  const stencil = getCropperFixedStencilSize(
    state,
    getStencilSize,
    aspectRatio,
  );

  result.visibleArea = applyCropperScale(
    result.visibleArea,
    (result.coordinates.width * result.boundary.width) /
      (result.visibleArea.width * stencil.width),
  );

  // Keep the visible area within its restrictions, scaling the crop with it.
  const scale = getCropperScaleToSizeRestrictions(
    result.visibleArea,
    getCropperAreaSizeRestrictions(result, settings),
  );
  if (scale !== 1) {
    result.visibleArea = applyCropperScale(result.visibleArea, scale);
    result.coordinates = applyCropperScale(result.coordinates, scale);
  }

  result.visibleArea = applyCropperMove(
    result.visibleArea,
    getCropperDiff(
      getCropperCenter(result.coordinates),
      getCropperCenter(result.visibleArea),
    ),
  );
  result.visibleArea = moveCropperToPositionRestrictions(
    result.visibleArea,
    getCropperAreaPositionRestrictions(result, settings),
  );
  result.coordinates = moveCropperToPositionRestrictions(
    result.coordinates,
    mergeCropperPositionRestrictions(
      toCropperPositionRestrictions(result.visibleArea),
      getCropperAreaPositionRestrictions(result, settings),
    ),
  );
  return result;
}
