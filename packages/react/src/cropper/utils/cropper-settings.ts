// The settings the cropper algorithms read, and their defaults. Ported from
// `advanced-cropper` (MIT, Copyright (c) Norserium), see LICENSE.
import type { CropperRootImageRestriction } from "../root/cropper-root";
import type {
  CropperAspectRatio,
  CropperCoordinates,
  CropperDefaultTransforms,
  CropperPoint,
  CropperPositionRestrictions,
  CropperSize,
  CropperSizeRestrictions,
  CropperState,
} from "../types";
import {
  getCropperFixedAspectRatio,
  getCropperFixedDefaultSize,
  getCropperFixedSizeRestrictions,
  fixCropperStencil,
} from "./cropper-fixed-stencil";
import {
  approximateCropperSize,
  type CropperAspectRatioRange,
  createCropperAspectRatio,
  getCropperIntersections,
  getCropperRatio,
  mergeCropperSizeRestrictions,
  moveCropperToPositionRestrictions,
  resizeCropperToSizeRestrictions,
  toCropperPositionRestrictions,
  toCropperSizeRestrictions,
} from "./cropper-geometry";
import {
  getCropperAreaSizeRestrictions,
  getCropperAspectRatio,
  getCropperPositionRestrictions,
  getCropperSizeRestrictions,
  getCropperTransformedImageSize,
} from "./cropper-restrictions";

/** A change to the crop: a partial rectangle, or a function that returns one. */
export type CropperCoordinatesTransform =
  | Partial<CropperCoordinates>
  | ((state: CropperState) => Partial<CropperCoordinates> | null)
  | null;

/** Which default wins when the cropper starts. */
export type CropperPriority = "coordinates" | "visible-area";

/** What the cropper was doing when a post-process step runs. */
export interface CropperPostprocessAction {
  name: string;
  /** The change is final: no gesture continues it. */
  immediately: boolean;
  transitions: boolean;
  interaction: boolean;
}

/** Everything the algorithms read, as functions of the state. */
export interface CropperSettings {
  getAspectRatio: (state: CropperState) => CropperAspectRatioRange;
  getSizeRestrictions: (state: CropperState) => CropperSizeRestrictions;
  getPositionRestrictions: (state: CropperState) => CropperPositionRestrictions;
  getAreaSizeRestrictions: (state: CropperState) => CropperSizeRestrictions;
  getAreaPositionRestrictions: (
    state: CropperState,
  ) => CropperPositionRestrictions;
  getDefaultCoordinates: (state: CropperState) => CropperCoordinatesTransform[];
  getDefaultVisibleArea: (state: CropperState) => CropperCoordinates;
  defaultTransforms: CropperDefaultTransforms | undefined;
  priority: CropperPriority;
  /** Resize the crop with the image when zooming. */
  adjustStencil: boolean;
  postProcess: (
    state: CropperState,
    action: CropperPostprocessAction,
  ) => CropperState;
}

export interface CropperSettingsOptions {
  aspectRatio?: CropperAspectRatio | undefined;
  minWidth?: number | undefined;
  minHeight?: number | undefined;
  maxWidth?: number | undefined;
  maxHeight?: number | undefined;
  imageRestriction?: CropperRootImageRestriction | undefined;
  adjustStencil?: boolean | undefined;
  stencilSize?:
    CropperSize | ((state: CropperState) => CropperSize) | undefined;
  defaultCoordinates?:
    | Partial<CropperCoordinates>
    | ((state: CropperState) => Partial<CropperCoordinates>)
    | undefined;
  defaultVisibleArea?:
    | CropperCoordinates
    | ((state: CropperState) => CropperCoordinates)
    | undefined;
  defaultTransforms?: CropperDefaultTransforms | undefined;
}

function toCropperNumber(value: number | undefined, fallback: number): number {
  return value !== undefined && !Number.isNaN(value) ? value : fallback;
}

/** The visible area keeps the image in view (`fill-area`, `fit-area`). */
export function getCropperDefaultAreaPositionRestrictions(
  state: CropperState,
  imageRestriction: CropperRootImageRestriction,
): CropperPositionRestrictions {
  const { visibleArea, boundary } = state;
  const imageSize = getCropperTransformedImageSize(state);

  if (imageRestriction === "fill-area") {
    return {
      left: 0,
      top: 0,
      right: imageSize.width,
      bottom: imageSize.height,
    };
  }
  if (imageRestriction !== "fit-area") return {};

  // The visible area may be larger than the image on one axis: center it there.
  if (getCropperRatio(boundary) > getCropperRatio(imageSize)) {
    const restrictions: CropperPositionRestrictions = {
      top: 0,
      bottom: imageSize.height,
    };
    if (visibleArea) {
      const overflow = Math.max(0, visibleArea.width - imageSize.width) / 2;
      restrictions.left = -overflow;
      restrictions.right = imageSize.width + overflow;
    }
    return restrictions;
  }
  const restrictions: CropperPositionRestrictions = {
    left: 0,
    right: imageSize.width,
  };
  if (visibleArea) {
    const overflow = Math.max(0, visibleArea.height - imageSize.height) / 2;
    restrictions.top = -overflow;
    restrictions.bottom = imageSize.height + overflow;
  }
  return restrictions;
}

/** The visible area can't zoom out past the image (`fill-area`, `fit-area`). */
export function getCropperDefaultAreaSizeRestrictions(
  state: CropperState,
  imageRestriction: CropperRootImageRestriction,
): CropperSizeRestrictions {
  const imageSize = getCropperTransformedImageSize(state);
  const restrictions = {
    minWidth: 0,
    minHeight: 0,
    maxWidth: Infinity,
    maxHeight: Infinity,
  };
  if (imageRestriction === "fill-area") {
    restrictions.maxWidth = imageSize.width;
    restrictions.maxHeight = imageSize.height;
  } else if (imageRestriction === "fit-area") {
    const boundaryRatio = getCropperRatio(state.boundary);
    if (boundaryRatio > getCropperRatio(imageSize)) {
      restrictions.maxHeight = imageSize.height;
      restrictions.maxWidth = imageSize.height * boundaryRatio;
    } else {
      restrictions.maxWidth = imageSize.width;
      restrictions.maxHeight = imageSize.width / boundaryRatio;
    }
  }
  return restrictions;
}

/** The crop stays on the image unless `imageRestriction` is `none`. */
export function getCropperDefaultPositionRestrictions(
  state: CropperState,
  imageRestriction: CropperRootImageRestriction,
): CropperPositionRestrictions {
  if (imageRestriction === "none") return {};
  const imageSize = getCropperTransformedImageSize(state);
  return { left: 0, top: 0, right: imageSize.width, bottom: imageSize.height };
}

/** 80% of the visible area (or of the image), at the allowed ratio closest to it. */
export function getCropperDefaultSize(
  state: CropperState,
  settings: CropperSettings,
): CropperSize {
  const { imageSize, visibleArea } = state;
  const sizeRestrictions = getCropperSizeRestrictions(state, settings);
  const aspectRatio = getCropperAspectRatio(state, settings);

  let area: CropperSize;
  if (visibleArea) {
    area = visibleArea;
  } else {
    const limits = toCropperSizeRestrictions(
      getCropperPositionRestrictions(state, settings),
    );
    area = {
      width: Math.max(
        limits.minWidth,
        Math.min(limits.maxWidth, imageSize.width),
      ),
      height: Math.max(
        limits.minHeight,
        Math.min(limits.maxHeight, imageSize.height),
      ),
    };
  }

  const ratio = Math.min(
    aspectRatio.maximum || Infinity,
    Math.max(aspectRatio.minimum || 0, getCropperRatio(area)),
  );
  const size =
    area.width < area.height
      ? { width: area.width * 0.8, height: (area.width * 0.8) / ratio }
      : { width: area.height * 0.8 * ratio, height: area.height * 0.8 };

  return approximateCropperSize({ ...size, aspectRatio, sizeRestrictions });
}

/** Centers the crop in the visible area, or in the image. */
export function getCropperDefaultPosition(state: CropperState): CropperPoint {
  const { visibleArea, coordinates } = state;
  const area = visibleArea ?? {
    left: 0,
    top: 0,
    ...getCropperTransformedImageSize(state),
  };
  return {
    left:
      area.left + area.width / 2 - (coordinates ? coordinates.width / 2 : 0),
    top:
      area.top + area.height / 2 - (coordinates ? coordinates.height / 2 : 0),
  };
}

/** Shows the whole image, or the crop and the image around it. */
export function getCropperDefaultVisibleArea(
  state: CropperState,
  settings: CropperSettings,
): CropperCoordinates {
  const { coordinates, boundary } = state;
  const imageSize = getCropperTransformedImageSize(state);
  const boundaryRatio = getCropperRatio(boundary);

  if (!coordinates) {
    const imageRatio = getCropperRatio(imageSize);
    const width =
      imageRatio < boundaryRatio
        ? imageSize.height * boundaryRatio
        : imageSize.width;
    const height =
      imageRatio < boundaryRatio
        ? imageSize.height
        : imageSize.width / boundaryRatio;
    return {
      left: imageSize.width / 2 - width / 2,
      top: imageSize.height / 2 - height / 2,
      width,
      height,
    };
  }

  // Fit the larger of the crop and the image.
  const reference = {
    width: Math.max(coordinates.width, imageSize.width),
    height: Math.max(coordinates.height, imageSize.height),
  };
  const wide = getCropperRatio(reference) > boundaryRatio;
  let visibleArea = resizeCropperToSizeRestrictions(
    {
      left: 0,
      top: 0,
      width: wide ? reference.width : reference.height * boundaryRatio,
      height: wide ? reference.width / boundaryRatio : reference.height,
    },
    getCropperAreaSizeRestrictions(state, settings),
  );

  // Center the crop.
  visibleArea = {
    ...visibleArea,
    left: coordinates.left + coordinates.width / 2 - visibleArea.width / 2,
    top: coordinates.top + coordinates.height / 2 - visibleArea.height / 2,
  };

  // Keep the image in view, unless the crop leaves it on that axis.
  const outside = getCropperIntersections(
    coordinates,
    toCropperPositionRestrictions({ left: 0, top: 0, ...imageSize }),
  );
  const restrictions: CropperPositionRestrictions = {};
  if (!outside.left && !outside.right && visibleArea.width <= imageSize.width) {
    restrictions.left = 0;
    restrictions.right = imageSize.width;
  }
  if (
    !outside.top &&
    !outside.bottom &&
    visibleArea.height <= imageSize.height
  ) {
    restrictions.top = 0;
    restrictions.bottom = imageSize.height;
  }
  return moveCropperToPositionRestrictions(visibleArea, restrictions);
}

/** Builds the settings from the props of `Cropper.Root`. */
export function createCropperSettings(
  options: CropperSettingsOptions,
): CropperSettings {
  const {
    imageRestriction = "fit-area",
    stencilSize,
    defaultCoordinates,
    defaultVisibleArea,
    defaultTransforms,
  } = options;

  const pixelRestrictions: CropperSizeRestrictions = {
    minWidth: toCropperNumber(options.minWidth, 0),
    minHeight: toCropperNumber(options.minHeight, 0),
    maxWidth: toCropperNumber(options.maxWidth, Infinity),
    maxHeight: toCropperNumber(options.maxHeight, Infinity),
  };
  const aspectRatio = createCropperAspectRatio(options.aspectRatio);
  const getStencilSize =
    stencilSize === undefined
      ? undefined
      : typeof stencilSize === "function"
        ? stencilSize
        : () => stencilSize;

  const settings: CropperSettings = {
    getAspectRatio: (state) =>
      getStencilSize
        ? getCropperFixedAspectRatio(state, getStencilSize, aspectRatio)
        : aspectRatio,
    getSizeRestrictions: (state) =>
      getStencilSize
        ? mergeCropperSizeRestrictions(
            pixelRestrictions,
            getCropperFixedSizeRestrictions(
              state,
              settings,
              getStencilSize,
              aspectRatio,
            ),
          )
        : pixelRestrictions,
    getPositionRestrictions: (state) =>
      getCropperDefaultPositionRestrictions(state, imageRestriction),
    getAreaSizeRestrictions: (state) =>
      getCropperDefaultAreaSizeRestrictions(state, imageRestriction),
    getAreaPositionRestrictions: (state) =>
      getCropperDefaultAreaPositionRestrictions(state, imageRestriction),
    getDefaultCoordinates: (state) => {
      const centered = (current: CropperState) =>
        getCropperDefaultPosition(current);
      if (defaultCoordinates === undefined) {
        const size = getStencilSize
          ? getCropperFixedDefaultSize(
              state,
              settings,
              getStencilSize,
              aspectRatio,
            )
          : getCropperDefaultSize(state, settings);
        return [size, centered];
      }
      const coordinates =
        typeof defaultCoordinates === "function"
          ? defaultCoordinates(state)
          : defaultCoordinates;
      // A size without a position is centered.
      return coordinates.left === undefined && coordinates.top === undefined
        ? [coordinates, centered]
        : [coordinates];
    },
    getDefaultVisibleArea: (state) => {
      if (defaultVisibleArea === undefined) {
        return getCropperDefaultVisibleArea(state, settings);
      }
      return typeof defaultVisibleArea === "function"
        ? defaultVisibleArea(state)
        : defaultVisibleArea;
    },
    defaultTransforms,
    priority: defaultVisibleArea === undefined ? "coordinates" : "visible-area",
    adjustStencil: getStencilSize ? false : (options.adjustStencil ?? true),
    postProcess: (state, action) =>
      getStencilSize && action.immediately
        ? fixCropperStencil(state, settings, getStencilSize, aspectRatio)
        : state,
  };
  return settings;
}
