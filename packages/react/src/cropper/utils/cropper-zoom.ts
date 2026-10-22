// Zoom as a value from 0 (widest view) to 1 (closest view). Ported from the
// `absolute-zoom` extension of `advanced-cropper` (MIT, Copyright (c)
// Norserium), see LICENSE.
import type { CropperState } from "../types";
import {
  getCropperRatio,
  isCropperGreater,
  mergeCropperSizeRestrictions,
} from "./cropper-geometry";
import {
  type CropperInitializedState,
  getCropperAreaSizeRestrictions,
  getCropperSizeRestrictions,
  getCropperTransformedImageSize,
  isCropperStateInitialized,
} from "./cropper-restrictions";
import type { CropperSettings } from "./cropper-settings";

/** Narrowest visible area: the crop at its minimum size (1 px at least). */
function getCropperMinimumAreaWidth(
  state: CropperInitializedState,
  settings: CropperSettings,
): number {
  const { coordinates, visibleArea } = state;
  const raw = settings.getSizeRestrictions(state);
  const adjustStencil =
    settings.adjustStencil && (raw.minWidth > 0 || raw.minHeight > 0);
  const sizeRestrictions = getCropperSizeRestrictions(state, {
    ...settings,
    getSizeRestrictions: (current) => {
      const restrictions = settings.getSizeRestrictions(current);
      return {
        ...restrictions,
        minWidth: Math.max(1, restrictions.minWidth),
        minHeight: Math.max(1, restrictions.minHeight),
      };
    },
  });
  const areaRestrictions = getCropperAreaSizeRestrictions(state, settings);

  const scale = isCropperGreater(
    sizeRestrictions.minWidth / sizeRestrictions.minHeight,
    getCropperRatio(coordinates),
  )
    ? sizeRestrictions.minWidth / coordinates.width
    : sizeRestrictions.minHeight / coordinates.height;
  const allowed = {
    minWidth: visibleArea.width * scale,
    minHeight: visibleArea.height * scale,
  };

  let minimum;
  if (adjustStencil) {
    const box = isCropperGreater(
      getCropperRatio(visibleArea),
      getCropperRatio(coordinates),
    )
      ? {
          minWidth: coordinates.height * getCropperRatio(visibleArea),
          minHeight: coordinates.height,
        }
      : {
          minWidth: coordinates.width,
          minHeight: coordinates.width / getCropperRatio(visibleArea),
        };
    minimum = mergeCropperSizeRestrictions(areaRestrictions, {
      minWidth: Math.min(allowed.minWidth, box.minWidth),
      minHeight: Math.min(allowed.minHeight, box.minHeight),
    });
  } else {
    minimum = mergeCropperSizeRestrictions(areaRestrictions, allowed);
  }
  return isCropperGreater(
    minimum.minWidth / minimum.minHeight,
    getCropperRatio(visibleArea),
  )
    ? minimum.minHeight * getCropperRatio(visibleArea)
    : minimum.minWidth;
}

/** Widest visible area: the crop at its maximum size. */
function getCropperMaximumAreaWidth(
  state: CropperInitializedState,
  settings: CropperSettings,
): number {
  const { coordinates, visibleArea } = state;
  const ratio = getCropperRatio(coordinates);
  const imageSize = getCropperTransformedImageSize(state);
  const sizeRestrictions = { ...getCropperSizeRestrictions(state, settings) };

  if (sizeRestrictions.maxWidth === Infinity) {
    sizeRestrictions.maxWidth = imageSize.width;
  }
  if (sizeRestrictions.maxHeight === Infinity) {
    sizeRestrictions.maxHeight = imageSize.height;
  }
  if (
    isCropperGreater(
      sizeRestrictions.maxWidth / sizeRestrictions.maxHeight,
      ratio,
    )
  ) {
    sizeRestrictions.maxWidth = sizeRestrictions.maxHeight * ratio;
  } else {
    sizeRestrictions.maxHeight = sizeRestrictions.maxWidth / ratio;
  }

  const areaRestrictions = getCropperAreaSizeRestrictions(state, settings);
  const scale = isCropperGreater(
    sizeRestrictions.maxWidth / sizeRestrictions.maxHeight,
    ratio,
  )
    ? sizeRestrictions.maxWidth / coordinates.width
    : sizeRestrictions.maxHeight / coordinates.height;
  const allowed = {
    maxWidth: visibleArea.width * scale,
    maxHeight: visibleArea.height * scale,
  };

  let maximum;
  if (settings.adjustStencil) {
    const box = isCropperGreater(
      getCropperRatio(visibleArea),
      getCropperRatio(imageSize),
    )
      ? {
          maxWidth: imageSize.height * getCropperRatio(visibleArea),
          maxHeight: imageSize.height,
        }
      : {
          maxWidth: imageSize.width,
          maxHeight: imageSize.width / getCropperRatio(visibleArea),
        };
    maximum = mergeCropperSizeRestrictions(areaRestrictions, {
      maxWidth: Math.max(allowed.maxWidth, box.maxWidth),
      maxHeight: Math.max(allowed.maxHeight, box.maxHeight),
    });
  } else {
    maximum = mergeCropperSizeRestrictions(areaRestrictions, allowed);
  }
  return isCropperGreater(
    maximum.maxWidth / maximum.maxHeight,
    getCropperRatio(visibleArea),
  )
    ? maximum.maxHeight * getCropperRatio(visibleArea)
    : maximum.maxWidth;
}

/** The current zoom, from 0 (widest view) to 1 (closest view). */
export function getCropperZoom(
  state: CropperState | null,
  settings: CropperSettings,
  clamp = true,
): number {
  if (!isCropperStateInitialized(state)) return 0;
  const minimum = getCropperMinimumAreaWidth(state, settings);
  const maximum = getCropperMaximumAreaWidth(state, settings);
  if (maximum === minimum) return 0;
  const value = 1 - (state.visibleArea.width - minimum) / (maximum - minimum);
  return clamp ? Math.min(1, Math.max(0, value)) : value;
}

/** The zoom factor that brings the current zoom to `zoom` (0 to 1). */
export function getCropperZoomFactor(
  state: CropperState | null,
  settings: CropperSettings,
  zoom: number,
): number {
  if (!isCropperStateInitialized(state)) return 1;
  const minimum = getCropperMinimumAreaWidth(state, settings);
  const maximum = getCropperMaximumAreaWidth(state, settings);
  const getWidth = (value: number) => maximum - value * (maximum - minimum);
  const target = getWidth(zoom);
  return target ? getWidth(getCropperZoom(state, settings, false)) / target : 1;
}
