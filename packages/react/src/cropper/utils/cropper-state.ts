// Algorithms that produce a new cropper state. Ported from `advanced-cropper`
// (MIT, Copyright (c) Norserium), see LICENSE.
import type { CropperHandlePosition } from "../handle/cropper-handle";
import type {
  CropperCoordinates,
  CropperPoint,
  CropperSize,
  CropperState,
} from "../types";
import {
  applyCropperMove,
  applyCropperScale,
  approximateCropperSize,
  fitCropperToPositionRestrictions,
  getCropperBrokenRatio,
  getCropperCenter,
  getCropperDiff,
  getCropperMaxScale,
  getCropperRatio,
  inverseCropperMove,
  mergeCropperPositionRestrictions,
  mergeCropperSizeRestrictions,
  moveCropperToPositionRestrictions,
  resizeCropperToSizeRestrictions,
  toCropperPositionRestrictions,
} from "./cropper-geometry";
import {
  copyCropperState,
  getCropperAreaPositionRestrictions,
  getCropperAreaSizeRestrictions,
  getCropperAspectRatio,
  getCropperMinimumSize,
  getCropperPositionRestrictions,
  getCropperSizeRestrictions,
  isCropperStateInitialized,
} from "./cropper-restrictions";
import {
  type CropperResizeOptions,
  resizeCropperCoordinatesByHandle,
} from "./cropper-resize";
import type {
  CropperCoordinatesTransform,
  CropperSettings,
} from "./cropper-settings";

/**
 * How `setCropperCoordinates` treats the visible area:
 * - `"limit"`: the crop stays within it;
 * - `"zoom"`: it zooms out to show the crop;
 * - `"unsafe"`: neither, the crop may leave it.
 */
export type CropperSetCoordinatesMode = "limit" | "zoom" | "unsafe";

/** Fits the crop to its restrictions and to the visible area, around its center. */
export function fitCropperCoordinates(
  state: CropperState,
  settings: CropperSettings,
): CropperState {
  if (!state.coordinates) return state;
  const result = copyCropperState(state);
  const { coordinates, visibleArea } = state;
  const sizeRestrictions = getCropperSizeRestrictions(state, settings);

  const size = approximateCropperSize({
    width: coordinates.width,
    height: coordinates.height,
    aspectRatio: getCropperAspectRatio(state, settings),
    sizeRestrictions: visibleArea
      ? {
          maxWidth: Math.min(visibleArea.width, sizeRestrictions.maxWidth),
          maxHeight: Math.min(visibleArea.height, sizeRestrictions.maxHeight),
          minWidth: Math.min(visibleArea.width, sizeRestrictions.minWidth),
          minHeight: Math.min(visibleArea.height, sizeRestrictions.minHeight),
        }
      : sizeRestrictions,
  });
  let fitted = { ...coordinates, ...size };
  fitted = applyCropperMove(
    fitted,
    getCropperDiff(getCropperCenter(coordinates), getCropperCenter(fitted)),
  );
  result.coordinates = moveCropperToPositionRestrictions(
    fitted,
    visibleArea
      ? mergeCropperPositionRestrictions(
          toCropperPositionRestrictions(visibleArea),
          getCropperPositionRestrictions(result, settings),
        )
      : getCropperPositionRestrictions(result, settings),
  );
  return result;
}

/** Fits the visible area to its restrictions and the viewport's ratio, around its center. */
export function fitCropperVisibleArea(
  state: CropperState,
  settings: CropperSettings,
): CropperState {
  if (!state.visibleArea) return state;
  const result = copyCropperState(state);
  const { visibleArea } = state;
  const boundaryRatio = getCropperRatio(result.boundary);

  const fitted = {
    ...visibleArea,
    ...approximateCropperSize({
      width: visibleArea.width,
      height: visibleArea.height,
      aspectRatio: { minimum: boundaryRatio, maximum: boundaryRatio },
      sizeRestrictions: getCropperAreaSizeRestrictions(state, settings),
    }),
  };
  result.visibleArea = applyCropperMove(
    fitted,
    getCropperDiff(getCropperCenter(visibleArea), getCropperCenter(fitted)),
  );
  // The limits of `fit-area` depend on the visible area's new size.
  result.visibleArea = moveCropperToPositionRestrictions(
    result.visibleArea,
    getCropperAreaPositionRestrictions(result, settings),
  );
  return result;
}

/** Applies changes to the crop, in order, within the restrictions. */
export function setCropperCoordinates(
  state: CropperState,
  settings: CropperSettings,
  transform: CropperCoordinatesTransform | CropperCoordinatesTransform[],
  mode: CropperSetCoordinatesMode = "zoom",
): CropperState {
  const aspectRatio = getCropperAspectRatio(state, settings);
  const { visibleArea } = state;
  const limited = Boolean(visibleArea && mode === "limit");

  let sizeRestrictions = getCropperSizeRestrictions(state, settings);
  let positionRestrictions = getCropperPositionRestrictions(state, settings);
  if (visibleArea && limited) {
    sizeRestrictions = {
      minWidth: Math.min(visibleArea.width, sizeRestrictions.minWidth),
      minHeight: Math.min(visibleArea.height, sizeRestrictions.minHeight),
      maxWidth: Math.min(visibleArea.width, sizeRestrictions.maxWidth),
      maxHeight: Math.min(visibleArea.height, sizeRestrictions.maxHeight),
    };
    positionRestrictions = mergeCropperPositionRestrictions(
      positionRestrictions,
      toCropperPositionRestrictions(visibleArea),
    );
  }

  const move = (current: CropperCoordinates, target: CropperPoint) =>
    moveCropperToPositionRestrictions(
      applyCropperMove(current, getCropperDiff(target, current)),
      positionRestrictions,
    );

  const resize = (current: CropperCoordinates, target: CropperSize) =>
    move(
      {
        ...approximateCropperSize({
          width: target.width,
          height: target.height,
          sizeRestrictions,
          aspectRatio,
        }),
        left: 0,
        top: 0,
      },
      current,
    );

  let coordinates: CropperCoordinates = state.coordinates
    ? { ...state.coordinates }
    : { left: 0, top: 0, width: 0, height: 0 };

  for (const item of Array.isArray(transform) ? transform : [transform]) {
    const changes =
      typeof item === "function" ? item({ ...state, coordinates }) : item;
    if (!changes) continue;
    if (changes.width !== undefined || changes.height !== undefined) {
      coordinates = resize(coordinates, { ...coordinates, ...changes });
    }
    if (changes.left !== undefined || changes.top !== undefined) {
      coordinates = move(coordinates, { ...coordinates, ...changes });
    }
  }

  const result = { ...copyCropperState(state), coordinates };
  if (!result.visibleArea || mode !== "zoom") return result;

  // Zoom out until the crop fits in the visible area, then show it.
  const overflowWidth = Math.max(
    0,
    coordinates.width - result.visibleArea.width,
  );
  const overflowHeight = Math.max(
    0,
    coordinates.height - result.visibleArea.height,
  );
  const scale =
    overflowWidth > overflowHeight
      ? coordinates.width / result.visibleArea.width
      : coordinates.height / result.visibleArea.height;
  if (scale > 1) {
    result.visibleArea = applyCropperScale(
      result.visibleArea,
      Math.min(
        scale,
        getCropperMaxScale(
          result.visibleArea,
          getCropperAreaSizeRestrictions(state, settings),
        ),
      ),
    );
  }
  result.visibleArea = applyCropperMove(
    result.visibleArea,
    inverseCropperMove(
      fitCropperToPositionRestrictions(
        coordinates,
        toCropperPositionRestrictions(result.visibleArea),
      ),
    ),
  );
  return fitCropperVisibleArea(result, settings);
}

/** Sets the visible area; with `safe`, the crop is brought back within it. */
export function setCropperVisibleArea(
  state: CropperState,
  settings: CropperSettings,
  visibleArea: CropperCoordinates,
  safe = true,
): CropperState {
  const result = fitCropperVisibleArea(
    { ...copyCropperState(state), visibleArea },
    settings,
  );
  return safe ? fitCropperCoordinates(result, settings) : result;
}

/** The first state for an image in a viewport of size `boundary`. */
export function createCropperState(
  options: {
    boundary: CropperSize;
    imageSize: CropperSize;
  },
  settings: CropperSettings,
): CropperState {
  const { defaultTransforms } = settings;
  let state: CropperState = {
    boundary: { ...options.boundary },
    imageSize: { ...options.imageSize },
    transforms: {
      rotate: defaultTransforms?.rotate ?? 0,
      flip: {
        horizontal: defaultTransforms?.flip?.horizontal ?? false,
        vertical: defaultTransforms?.flip?.vertical ?? false,
      },
    },
    visibleArea: null,
    coordinates: null,
  };

  if (settings.priority === "visible-area") {
    state = setCropperVisibleArea(
      state,
      settings,
      settings.getDefaultVisibleArea(state),
      false,
    );
    state = setCropperCoordinates(
      state,
      settings,
      settings.getDefaultCoordinates(state),
      "limit",
    );
  } else {
    state = setCropperCoordinates(
      state,
      settings,
      settings.getDefaultCoordinates(state),
      "unsafe",
    );
    state = setCropperVisibleArea(
      state,
      settings,
      settings.getDefaultVisibleArea(state),
      true,
    );
  }
  return state;
}

/** Adapts the state to a new viewport size, keeping the crop where it is on the image. */
export function setCropperBoundary(
  state: CropperState,
  settings: CropperSettings,
  boundary: CropperSize,
): CropperState {
  let result: CropperState = { ...copyCropperState(state), boundary };
  if (!isCropperStateInitialized(result) || !state.visibleArea) return result;

  // Fit the visible area to the new ratio, keeping its width.
  const visibleArea = { ...result.visibleArea };
  visibleArea.height = visibleArea.width / getCropperRatio(boundary);
  visibleArea.top += (state.visibleArea.height - visibleArea.height) / 2;
  result.visibleArea = visibleArea;

  // Zoom out so the crop, at least at its minimum size, still fits.
  const sizeRestrictions = getCropperSizeRestrictions(result, settings);
  const neededHeight = Math.max(
    sizeRestrictions.minHeight,
    result.coordinates.height,
  );
  const neededWidth = Math.max(
    sizeRestrictions.minWidth,
    result.coordinates.width,
  );
  if (
    neededHeight > result.visibleArea.height ||
    neededWidth > result.visibleArea.width
  ) {
    result.visibleArea = applyCropperScale(
      result.visibleArea,
      Math.max(
        neededHeight / result.visibleArea.height,
        neededWidth / result.visibleArea.width,
      ),
    );
  }
  result.visibleArea = resizeCropperToSizeRestrictions(
    result.visibleArea,
    getCropperAreaSizeRestrictions(result, settings),
  );

  // Move the visible area rather than the crop.
  const move = inverseCropperMove(
    fitCropperToPositionRestrictions(
      result.coordinates,
      toCropperPositionRestrictions(result.visibleArea),
    ),
  );
  if (result.visibleArea.width < result.coordinates.width) move.left = 0;
  if (result.visibleArea.height < result.coordinates.height) move.top = 0;
  result.visibleArea = applyCropperMove(result.visibleArea, move);
  result.visibleArea = moveCropperToPositionRestrictions(
    result.visibleArea,
    getCropperAreaPositionRestrictions(result, settings),
  );

  result = fitCropperCoordinates(result, settings);
  return result;
}

/** Moves the crop by `directions` (image pixels), within the visible area. */
export function moveCropperCoordinates(
  state: CropperState,
  settings: CropperSettings,
  directions: CropperPoint,
): CropperState {
  if (!isCropperStateInitialized(state)) return state;
  const result = copyCropperState(state);
  result.coordinates = moveCropperToPositionRestrictions(
    applyCropperMove(state.coordinates, directions),
    mergeCropperPositionRestrictions(
      toCropperPositionRestrictions(state.visibleArea),
      getCropperPositionRestrictions(result, settings),
    ),
  );
  return result;
}

/** Resizes the crop by dragging the handle at `position` by `move` (image pixels). */
export function resizeCropperCoordinatesInState(
  state: CropperState,
  settings: CropperSettings,
  position: CropperHandlePosition,
  move: CropperPoint,
  options: CropperResizeOptions,
): CropperState {
  if (!isCropperStateInitialized(state)) return state;
  const { visibleArea } = state;
  const minimumSize = getCropperMinimumSize(state);
  const sizeRestrictions = getCropperSizeRestrictions(state, settings);
  return {
    ...copyCropperState(state),
    coordinates: resizeCropperCoordinatesByHandle(
      state.coordinates,
      position,
      move,
      options,
      {
        positionRestrictions: mergeCropperPositionRestrictions(
          getCropperPositionRestrictions(state, settings),
          toCropperPositionRestrictions(visibleArea),
        ),
        sizeRestrictions: {
          maxWidth: Math.min(sizeRestrictions.maxWidth, visibleArea.width),
          maxHeight: Math.min(sizeRestrictions.maxHeight, visibleArea.height),
          minWidth: Math.max(
            Math.min(sizeRestrictions.minWidth, visibleArea.width),
            minimumSize,
          ),
          minHeight: Math.max(
            Math.min(sizeRestrictions.minHeight, visibleArea.height),
            minimumSize,
          ),
        },
        aspectRatio: getCropperAspectRatio(state, settings),
      },
    ),
  };
}

/** Brings a state that breaks its restrictions (after the settings changed) back within them. */
export function reconcileCropperState(
  state: CropperState,
  settings: CropperSettings,
): CropperState {
  if (!isCropperStateInitialized(state)) return state;
  const result = copyCropperState(state);
  const aspectRatio = getCropperAspectRatio(state, settings);
  const sizeRestrictions = getCropperSizeRestrictions(state, settings);
  const areaSizeRestrictions = getCropperAreaSizeRestrictions(state, settings);

  // Fit the crop's size, around its center.
  const brokenRatio = getCropperBrokenRatio(
    getCropperRatio(state.coordinates),
    aspectRatio,
  );
  const desired = brokenRatio
    ? {
        height: state.coordinates.height,
        width: state.coordinates.height * brokenRatio,
      }
    : state.coordinates;
  let coordinates = {
    ...result.coordinates,
    ...approximateCropperSize({
      width: desired.width,
      height: desired.height,
      aspectRatio,
      sizeRestrictions: mergeCropperSizeRestrictions(
        areaSizeRestrictions,
        sizeRestrictions,
      ),
    }),
  };
  coordinates = applyCropperMove(
    coordinates,
    getCropperDiff(
      getCropperCenter(state.coordinates),
      getCropperCenter(coordinates),
    ),
  );

  // Zoom the visible area out if the crop grew past it, around its center.
  const scale = Math.max(
    coordinates.width / result.visibleArea.width,
    coordinates.height / result.visibleArea.height,
    1,
  );
  const boundaryRatio = getCropperRatio(result.boundary);
  const visibleArea = {
    ...state.visibleArea,
    ...approximateCropperSize({
      width: state.visibleArea.width * scale,
      height: state.visibleArea.height * scale,
      aspectRatio: { minimum: boundaryRatio, maximum: boundaryRatio },
      sizeRestrictions: areaSizeRestrictions,
    }),
  };
  result.coordinates = coordinates;
  result.visibleArea = applyCropperMove(
    visibleArea,
    getCropperDiff(
      getCropperCenter(state.visibleArea),
      getCropperCenter(visibleArea),
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
      getCropperPositionRestrictions(result, settings),
    ),
  );
  return result;
}
