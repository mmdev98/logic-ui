// Moving, zooming, rotating and flipping the image under the crop. Ported
// from `advanced-cropper` (MIT, Copyright (c) Norserium), see LICENSE.
import type { CropperPoint, CropperState } from "../types";
import {
  applyCropperMove,
  applyCropperScale,
  approximateCropperSize,
  fitCropperToPositionRestrictions,
  getCropperCenter,
  getCropperDiff,
  getCropperDistance,
  getCropperMaxScale,
  getCropperMinScale,
  inverseCropperMove,
  isCropperRoughlyEqual,
  mergeCropperPositionRestrictions,
  mergeCropperSizeRestrictions,
  moveCropperToPositionRestrictions,
  resizeCropperToSizeRestrictions,
  rotateCropperPoint,
  toCropperPositionRestrictions,
  toCropperSizeRestrictions,
} from "./cropper-geometry";
import {
  copyCropperState,
  getCropperAreaPositionRestrictions,
  getCropperAreaSizeRestrictions,
  getCropperAspectRatio,
  getCropperCoefficient,
  getCropperPositionRestrictions,
  getCropperSizeRestrictions,
  getCropperTransformedImageSize,
  isCropperStateInitialized,
} from "./cropper-restrictions";
import type { CropperSettings } from "./cropper-settings";

/** A change to the image: a move, a zoom around a point, a rotation, a flip. */
export interface CropperImageTransform {
  /** Zoom factor: above 1 zooms in. */
  scale?:
    number | { factor: number; center?: CropperPoint | undefined } | undefined;
  move?: { left?: number | undefined; top?: number | undefined } | undefined;
  /** Degrees, clockwise. */
  rotate?:
    number | { angle: number; center?: CropperPoint | undefined } | undefined;
  flip?:
    | { horizontal?: boolean | undefined; vertical?: boolean | undefined }
    | undefined;
}

/** A pointer position, in client pixels. */
export interface CropperPointer {
  clientX: number;
  clientY: number;
}

/** Moves the visible area by `move` and zooms it by `scale`, keeping the crop where it can. */
export function transformCropperImage(
  state: CropperState,
  settings: CropperSettings,
  transform: CropperImageTransform,
): CropperState {
  if (!isCropperStateInitialized(state)) return state;
  const { scale = 1, move = {} } = transform;
  const result = copyCropperState(state);

  // Zooming in the image is zooming out the visible area.
  const scaleFactor = 1 / (typeof scale === "number" ? scale : scale.factor);
  const scaleCenter = typeof scale === "number" ? undefined : scale.center;
  const isScaling =
    Boolean(scaleFactor) && !isCropperRoughlyEqual(scaleFactor, 1);

  result.visibleArea = applyCropperMove(result.visibleArea, {
    left: move.left ?? 0,
    top: move.top ?? 0,
  });

  const sizeRestrictions = getCropperSizeRestrictions(result, settings);
  const positionRestrictions = getCropperPositionRestrictions(result, settings);
  const areaSizeRestrictions = getCropperAreaSizeRestrictions(result, settings);

  const stencilLimits = {
    minimum: Math.max(
      sizeRestrictions.minWidth
        ? sizeRestrictions.minWidth / result.coordinates.width
        : 0,
      sizeRestrictions.minHeight
        ? sizeRestrictions.minHeight / result.coordinates.height
        : 0,
    ),
    maximum: Math.min(
      sizeRestrictions.maxWidth
        ? sizeRestrictions.maxWidth / result.coordinates.width
        : Infinity,
      sizeRestrictions.maxHeight
        ? sizeRestrictions.maxHeight / result.coordinates.height
        : Infinity,
      getCropperMaxScale(
        result.coordinates,
        toCropperSizeRestrictions(positionRestrictions),
      ),
    ),
  };
  const areaLimits = {
    minimum: getCropperMinScale(result.visibleArea, areaSizeRestrictions),
    maximum: getCropperMaxScale(result.visibleArea, areaSizeRestrictions),
  };

  // Scale the crop with the visible area as far as both allow.
  let stencilScale = 1;
  if (isScaling) {
    if (scaleFactor < 1) {
      stencilScale = Math.min(
        1,
        Math.max(
          scaleFactor,
          Math.max(areaLimits.minimum, stencilLimits.minimum),
        ),
      );
    } else if (scaleFactor > 1) {
      stencilScale = Math.max(
        1,
        Math.min(
          scaleFactor,
          Math.min(areaLimits.maximum, stencilLimits.maximum),
        ),
      );
    }
  }
  if (stencilScale) {
    result.visibleArea = applyCropperScale(
      result.visibleArea,
      stencilScale,
      scaleCenter,
    );
  }

  const relative = {
    left: state.coordinates.left - state.visibleArea.left,
    right:
      state.visibleArea.width +
      state.visibleArea.left -
      (state.coordinates.width + state.coordinates.left),
    top: state.coordinates.top - state.visibleArea.top,
    bottom:
      state.visibleArea.height +
      state.visibleArea.top -
      (state.coordinates.height + state.coordinates.top),
  };

  // Keep the crop's limits reachable, then the visible area's own limits.
  const { left, top, right, bottom } = positionRestrictions;
  result.visibleArea = moveCropperToPositionRestrictions(result.visibleArea, {
    left: left !== undefined ? left - relative.left * stencilScale : undefined,
    top: top !== undefined ? top - relative.top * stencilScale : undefined,
    right:
      right !== undefined ? right + relative.right * stencilScale : undefined,
    bottom:
      bottom !== undefined
        ? bottom + relative.bottom * stencilScale
        : undefined,
  });
  result.visibleArea = moveCropperToPositionRestrictions(
    result.visibleArea,
    getCropperAreaPositionRestrictions(result, settings),
  );

  // The crop keeps its place within the visible area.
  result.coordinates = {
    width: result.coordinates.width * stencilScale,
    height: result.coordinates.height * stencilScale,
    left: result.visibleArea.left + relative.left * stencilScale,
    top: result.visibleArea.top + relative.top * stencilScale,
  };
  result.coordinates = moveCropperToPositionRestrictions(
    result.coordinates,
    mergeCropperPositionRestrictions(
      toCropperPositionRestrictions(result.visibleArea),
      positionRestrictions,
    ),
  );

  // Zoom the visible area alone when the crop can't follow.
  if (isScaling && settings.adjustStencil) {
    let areaScale = 1;
    if (scaleFactor > 1) {
      areaScale = Math.min(areaLimits.maximum, scaleFactor) / stencilScale;
    } else if (scaleFactor < 1) {
      areaScale = Math.max(
        result.coordinates.height / result.visibleArea.height,
        result.coordinates.width / result.visibleArea.width,
        scaleFactor / stencilScale,
      );
    }
    if (areaScale !== 1) {
      result.visibleArea = applyCropperScale(
        result.visibleArea,
        areaScale,
        scaleFactor > 1 ? scaleCenter : getCropperCenter(result.coordinates),
      );
      result.visibleArea = moveCropperToPositionRestrictions(
        result.visibleArea,
        getCropperAreaPositionRestrictions(result, settings),
      );
      result.visibleArea = applyCropperMove(
        result.visibleArea,
        inverseCropperMove(
          fitCropperToPositionRestrictions(
            result.coordinates,
            toCropperPositionRestrictions(result.visibleArea),
          ),
        ),
      );
    }
  }
  return result;
}

/** Rotates the image by `angle` degrees around `center`, or around the crop. */
export function rotateCropperImage(
  state: CropperState,
  settings: CropperSettings,
  rotate: NonNullable<CropperImageTransform["rotate"]>,
): CropperState {
  if (!isCropperStateInitialized(state)) return state;
  const result = copyCropperState(state);
  const angle = typeof rotate === "number" ? rotate : rotate.angle;
  const imageCenter = rotateCropperPoint(
    getCropperCenter({
      left: 0,
      top: 0,
      ...getCropperTransformedImageSize(state),
    }),
    angle,
  );

  result.transforms.rotate += angle;
  result.coordinates = {
    ...approximateCropperSize({
      sizeRestrictions: getCropperSizeRestrictions(result, settings),
      aspectRatio: getCropperAspectRatio(result, settings),
      width: result.coordinates.width,
      height: result.coordinates.height,
    }),
    ...rotateCropperPoint(getCropperCenter(result.coordinates), angle),
  };

  const center =
    typeof rotate !== "number" && rotate.center
      ? rotate.center
      : getCropperCenter(state.coordinates);
  const shift = getCropperDiff(
    getCropperCenter(state.coordinates),
    rotateCropperPoint(getCropperCenter(state.coordinates), angle, center),
  );
  const imageSize = getCropperTransformedImageSize(result);
  result.coordinates.left -=
    imageCenter.left -
    imageSize.width / 2 +
    result.coordinates.width / 2 -
    shift.left;
  result.coordinates.top -=
    imageCenter.top -
    imageSize.height / 2 +
    result.coordinates.height / 2 -
    shift.top;

  // The visible area must still hold the crop.
  result.visibleArea = resizeCropperToSizeRestrictions(
    result.visibleArea,
    mergeCropperSizeRestrictions(
      getCropperAreaSizeRestrictions(result, settings),
      {
        minWidth: result.coordinates.width,
        minHeight: result.coordinates.height,
      },
    ),
  );
  result.coordinates = moveCropperToPositionRestrictions(
    result.coordinates,
    getCropperPositionRestrictions(result, settings),
  );
  result.visibleArea = applyCropperMove(
    result.visibleArea,
    getCropperDiff(
      getCropperCenter(result.coordinates),
      getCropperCenter(state.coordinates),
    ),
  );
  result.visibleArea = moveCropperToPositionRestrictions(
    result.visibleArea,
    getCropperAreaPositionRestrictions(result, settings),
  );
  return result;
}

/** Mirrors the image, keeping the crop on the same part of it. */
export function flipCropperImage(
  state: CropperState,
  settings: CropperSettings,
  horizontal = false,
  vertical = false,
): CropperState {
  if (!isCropperStateInitialized(state)) return state;
  const result = copyCropperState(state);
  const { rotate } = state.transforms;

  if (horizontal || vertical) {
    const imageSize = getCropperTransformedImageSize(state);
    const imageCenter = rotateCropperPoint(
      { left: imageSize.width / 2, top: imageSize.height / 2 },
      -rotate,
    );
    const mirror = (point: CropperPoint): CropperPoint => {
      const old = rotateCropperPoint(point, -rotate);
      return rotateCropperPoint(
        {
          left: horizontal ? 2 * imageCenter.left - old.left : old.left,
          top: vertical ? 2 * imageCenter.top - old.top : old.top,
        },
        rotate,
      );
    };
    const coordinatesCenter = getCropperCenter(result.coordinates);
    result.coordinates = applyCropperMove(
      result.coordinates,
      getCropperDiff(mirror(coordinatesCenter), coordinatesCenter),
    );
    const areaCenter = getCropperCenter(result.visibleArea);
    result.visibleArea = applyCropperMove(
      result.visibleArea,
      getCropperDiff(mirror(areaCenter), areaCenter),
    );
    result.visibleArea = moveCropperToPositionRestrictions(
      result.visibleArea,
      getCropperAreaPositionRestrictions(result, settings),
    );
  }
  if (horizontal) {
    result.transforms.flip.horizontal = !state.transforms.flip.horizontal;
  }
  if (vertical) {
    result.transforms.flip.vertical = !state.transforms.flip.vertical;
  }
  return result;
}

/** Applies a rotation, a flip, then a move and zoom. */
export function applyCropperImageTransform(
  state: CropperState,
  settings: CropperSettings,
  transform: CropperImageTransform,
): CropperState {
  let result = state;
  if (transform.rotate) {
    result = rotateCropperImage(result, settings, transform.rotate);
  }
  if (transform.flip) {
    result = flipCropperImage(
      result,
      settings,
      transform.flip.horizontal,
      transform.flip.vertical,
    );
  }
  if (transform.move || transform.scale) {
    result = transformCropperImage(result, settings, transform);
  }
  return result;
}

/** A point in the viewport (screen pixels) as a point on the image. */
function toCropperImagePoint(
  state: CropperState,
  point: CropperPoint,
): CropperPoint {
  if (!state.visibleArea) return point;
  const coefficient = getCropperCoefficient(state);
  return {
    left: point.left * coefficient + state.visibleArea.left,
    top: point.top * coefficient + state.visibleArea.top,
  };
}

/** Turns a transform in screen pixels, relative to the viewport, into image pixels. */
export function normalizeCropperImageTransform(
  state: CropperState,
  transform: CropperImageTransform,
): CropperImageTransform {
  const coefficient = getCropperCoefficient(state);
  const result: CropperImageTransform = { ...transform };
  const { scale, rotate, move } = transform;
  if (scale) {
    result.scale =
      typeof scale === "number"
        ? { factor: scale }
        : {
            factor: scale.factor,
            center: scale.center && toCropperImagePoint(state, scale.center),
          };
  }
  if (rotate) {
    result.rotate =
      typeof rotate === "number"
        ? { angle: rotate }
        : {
            angle: rotate.angle,
            center: rotate.center && toCropperImagePoint(state, rotate.center),
          };
  }
  if (move) {
    result.move = {
      left: (move.left ?? 0) * coefficient,
      top: (move.top ?? 0) * coefficient,
    };
  }
  return result;
}

/** A flip on screen: swaps the axes when the image is turned sideways. */
export function normalizeCropperFlip(
  state: CropperState,
  horizontal: boolean,
  vertical: boolean,
): { horizontal: boolean; vertical: boolean } {
  const angle = Math.abs(state.transforms.rotate % 180);
  return angle <= 45 || angle >= 135
    ? { horizontal, vertical }
    : { horizontal: vertical, vertical: horizontal };
}

function getCropperPointerCentroid(
  pointers: CropperPointer[],
  origin: CropperPoint,
): { center: CropperPoint; spread: number } {
  const center = { left: 0, top: 0 };
  for (const pointer of pointers) {
    center.left += (pointer.clientX - origin.left) / pointers.length;
    center.top += (pointer.clientY - origin.top) / pointers.length;
  }
  let spread = 0;
  for (const pointer of pointers) {
    spread += getCropperDistance(center, {
      left: pointer.clientX - origin.left,
      top: pointer.clientY - origin.top,
    });
  }
  return { center, spread };
}

/**
 * The image transform made by pointers moving from `previous` to `current`:
 * one drags the image, two pinch to zoom (and rotate). In screen pixels,
 * relative to `origin`, the viewport's top left corner.
 */
export function getCropperPointersTransform(
  current: CropperPointer[],
  previous: CropperPointer[],
  origin: CropperPoint,
  options: { move: boolean; scale: boolean; rotate: boolean },
): CropperImageTransform {
  const result: CropperImageTransform = {};
  const [first, second] = current;
  const [previousFirst, previousSecond] = previous;
  if (!first || !previousFirst) return result;

  if (current.length === 1 && previous.length === 1) {
    if (options.move) {
      result.move = {
        left: previousFirst.clientX - first.clientX,
        top: previousFirst.clientY - first.clientY,
      };
    }
    return result;
  }
  if (current.length < 2 || previous.length < 2) return result;

  const before = getCropperPointerCentroid(previous, origin);
  const after = getCropperPointerCentroid(current, origin);

  if (options.rotate && second && previousSecond) {
    const dx = [
      first.clientX - second.clientX,
      previousFirst.clientX - previousSecond.clientX,
    ] as const;
    const dy = [
      first.clientY - second.clientY,
      previousFirst.clientY - previousSecond.clientY,
    ] as const;
    const y = dx[0] * dy[1] - dx[1] * dy[0];
    const x = dx[0] * dx[1] + dy[0] * dy[1];
    if (!isCropperRoughlyEqual(x, 0) && !isCropperRoughlyEqual(y, 0)) {
      result.rotate = {
        angle: -(Math.atan2(y, x) * 180) / Math.PI,
        center: after.center,
      };
    }
  }
  if (options.move) {
    result.move = {
      left: before.center.left - after.center.left,
      top: before.center.top - after.center.top,
    };
  }
  if (options.scale && before.spread) {
    result.scale = {
      factor: after.spread / before.spread,
      center: after.center,
    };
  }
  return result;
}

/**
 * The zoom made by one wheel event, around the cursor: `ratio` of the view
 * per step. A trackpad pinch sends many small events with `ctrlKey`; their
 * zoom follows their size instead.
 */
export function getCropperWheelTransform(
  event: { deltaY: number; ctrlKey: boolean },
  point: CropperPoint,
  ratio: number,
): CropperImageTransform {
  const factor = event.ctrlKey
    ? Math.exp(-event.deltaY / 100)
    : 1 - ratio * Math.sign(event.deltaY);
  return { scale: { factor, center: point } };
}
