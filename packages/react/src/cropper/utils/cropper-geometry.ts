// Geometry of rectangles, sizes and limits. Ported from `advanced-cropper`
// (MIT, Copyright (c) Norserium), see LICENSE.
import type {
  CropperAspectRatio,
  CropperCoordinates,
  CropperPoint,
  CropperPositionRestrictions,
  CropperSize,
  CropperSizeRestrictions,
} from "../types";

/** Normalized aspect ratio range: `0` and `Infinity` leave a side free. */
export interface CropperAspectRatioRange {
  minimum: number;
  maximum: number;
}

/** How far each edge of a rectangle moves outwards. */
export interface CropperResizeDirections {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

export type CropperSide = keyof CropperResizeDirections;

export const CROPPER_SIDES: readonly CropperSide[] = [
  "left",
  "right",
  "top",
  "bottom",
];

const TOLERANCE = 1e-3;

export function isCropperRoughlyEqual(
  a: number,
  b: number,
  tolerance = TOLERANCE,
): boolean {
  return Math.abs(b - a) < tolerance;
}

export function isCropperGreater(
  a: number,
  b: number,
  tolerance = TOLERANCE,
): boolean {
  return isCropperRoughlyEqual(a, b, tolerance) ? false : a > b;
}

export function isCropperLower(
  a: number,
  b: number,
  tolerance = TOLERANCE,
): boolean {
  return isCropperRoughlyEqual(a, b, tolerance) ? false : a < b;
}

export function getCropperDistance(a: CropperPoint, b: CropperPoint): number {
  return Math.hypot(a.left - b.left, a.top - b.top);
}

export function getCropperDiff(a: CropperPoint, b: CropperPoint): CropperPoint {
  return { left: a.left - b.left, top: a.top - b.top };
}

export function getCropperCenter(object: CropperCoordinates): CropperPoint {
  return {
    left: object.left + object.width / 2,
    top: object.top + object.height / 2,
  };
}

export function getCropperRatio(object: CropperSize): number {
  return object.width / object.height;
}

export function getCropperOppositeSide(side: CropperSide): CropperSide {
  const opposites = {
    left: "right",
    top: "bottom",
    right: "left",
    bottom: "top",
  } as const;
  return opposites[side];
}

export function inverseCropperMove(move: CropperPoint): CropperPoint {
  return { left: -move.left, top: -move.top };
}

export function applyCropperMove<T extends CropperCoordinates>(
  object: T,
  move: CropperPoint,
): T {
  return {
    ...object,
    left: object.left + move.left,
    top: object.top + move.top,
  };
}

export function applyCropperDirections(
  coordinates: CropperCoordinates,
  directions: CropperResizeDirections,
): CropperCoordinates {
  return {
    left: coordinates.left - directions.left,
    top: coordinates.top - directions.top,
    width: coordinates.width + directions.left + directions.right,
    height: coordinates.height + directions.top + directions.bottom,
  };
}

/** Scales a rectangle around its center, or around `center`. */
export function applyCropperScale(
  object: CropperCoordinates,
  factor: number,
  center?: CropperPoint,
): CropperCoordinates {
  if (factor === 1) return object;
  const result = {
    width: object.width * factor,
    height: object.height * factor,
    left: object.left + (object.width * (1 - factor)) / 2,
    top: object.top + (object.height * (1 - factor)) / 2,
  };
  if (center) {
    const currentCenter = getCropperCenter(object);
    result.left += (center.left - currentCenter.left) * (1 - factor);
    result.top += (center.top - currentCenter.top) * (1 - factor);
  }
  return result;
}

/** Size of the box around a rectangle turned by `angle` degrees. */
export function rotateCropperSize(
  size: CropperSize,
  angle: number,
): CropperSize {
  const radians = (angle * Math.PI) / 180;
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);
  return {
    width: Math.abs(size.width * cos) + Math.abs(size.height * sin),
    height: Math.abs(size.width * sin) + Math.abs(size.height * cos),
  };
}

/** Turns a point by `angle` degrees around `anchor`, or around the origin. */
export function rotateCropperPoint(
  point: CropperPoint,
  angle: number,
  anchor: CropperPoint = { left: 0, top: 0 },
): CropperPoint {
  const radians = (angle * Math.PI) / 180;
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);
  const left = point.left - anchor.left;
  const top = point.top - anchor.top;
  return {
    left: left * cos - top * sin + anchor.left,
    top: left * sin + top * cos + anchor.top,
  };
}

/** The edges of a rectangle, as limits for another one. */
export function toCropperPositionRestrictions(
  coordinates: CropperCoordinates,
): Record<CropperSide, number> {
  return {
    left: coordinates.left,
    top: coordinates.top,
    right: coordinates.left + coordinates.width,
    bottom: coordinates.top + coordinates.height,
  };
}

/** The largest size that fits within position limits. */
export function toCropperSizeRestrictions(
  restrictions: CropperPositionRestrictions,
): CropperSizeRestrictions {
  const { left, top, right, bottom } = restrictions;
  return {
    minWidth: 0,
    minHeight: 0,
    maxWidth:
      right !== undefined && left !== undefined ? right - left : Infinity,
    maxHeight:
      bottom !== undefined && top !== undefined ? bottom - top : Infinity,
  };
}

/** Keeps the tighter limit on each side. */
export function mergeCropperPositionRestrictions(
  a: CropperPositionRestrictions,
  b: CropperPositionRestrictions,
): CropperPositionRestrictions {
  const result: CropperPositionRestrictions = {};
  for (const side of CROPPER_SIDES) {
    const first = a[side];
    const second = b[side];
    if (first !== undefined && second !== undefined) {
      result[side] =
        side === "left" || side === "top"
          ? Math.max(first, second)
          : Math.min(first, second);
    } else if (first !== undefined || second !== undefined) {
      result[side] = first ?? second;
    }
  }
  return result;
}

/** Lowers a minimum that is larger than its maximum to that maximum. */
export function reconcileCropperSizeRestrictions(
  restrictions: CropperSizeRestrictions,
): CropperSizeRestrictions {
  return {
    ...restrictions,
    minWidth: Math.min(restrictions.minWidth, restrictions.maxWidth),
    minHeight: Math.min(restrictions.minHeight, restrictions.maxHeight),
  };
}

/** Keeps the tighter of two size restrictions. */
export function mergeCropperSizeRestrictions(
  a: CropperSizeRestrictions,
  b: Partial<CropperSizeRestrictions>,
): CropperSizeRestrictions {
  return reconcileCropperSizeRestrictions({
    minWidth: Math.max(a.minWidth, b.minWidth ?? 0),
    minHeight: Math.max(a.minHeight, b.minHeight ?? 0),
    maxWidth: Math.min(a.maxWidth, b.maxWidth ?? Infinity),
    maxHeight: Math.min(a.maxHeight, b.maxHeight ?? Infinity),
  });
}

/** How far a rectangle crosses each limit (0 when it doesn't). */
export function getCropperIntersections(
  object: CropperCoordinates,
  restrictions: CropperPositionRestrictions,
): CropperResizeDirections {
  const edges = toCropperPositionRestrictions(object);
  const result = { left: 0, top: 0, right: 0, bottom: 0 };
  for (const side of CROPPER_SIDES) {
    const limit = restrictions[side];
    if (limit === undefined) continue;
    result[side] =
      side === "left" || side === "top"
        ? Math.max(0, limit - edges[side])
        : Math.max(0, edges[side] - limit);
  }
  return result;
}

/** The move that brings a rectangle back within limits. */
export function fitCropperToPositionRestrictions(
  coordinates: CropperCoordinates,
  restrictions: CropperPositionRestrictions,
): CropperPoint {
  const intersections = getCropperIntersections(coordinates, restrictions);
  const move = { left: 0, top: 0 };
  if (intersections.left > 0) move.left = intersections.left;
  else if (intersections.right > 0) move.left = -intersections.right;
  if (intersections.top > 0) move.top = intersections.top;
  else if (intersections.bottom > 0) move.top = -intersections.bottom;
  return move;
}

export function moveCropperToPositionRestrictions<T extends CropperCoordinates>(
  coordinates: T,
  restrictions: CropperPositionRestrictions,
): T {
  return applyCropperMove(
    coordinates,
    fitCropperToPositionRestrictions(coordinates, restrictions),
  );
}

/** The scale that keeps a size's ratio and brings it within restrictions. */
export function getCropperScaleToSizeRestrictions(
  size: CropperSize,
  restrictions: CropperSizeRestrictions,
): number {
  const ratio = getCropperRatio(size);
  const { minWidth, minHeight, maxWidth, maxHeight } = restrictions;
  let scale = 1;

  if (minWidth > 0 && minHeight > 0) {
    if (ratio > minWidth / minHeight) {
      if (size.height < minHeight) scale = minHeight / size.height;
    } else if (size.width < minWidth) {
      scale = minWidth / size.width;
    }
  } else if (minWidth > 0) {
    if (size.width < minWidth) scale = minWidth / size.width;
  } else if (minHeight > 0) {
    if (size.height < minHeight) scale = minHeight / size.height;
  }

  if (maxWidth < Infinity && maxHeight < Infinity) {
    if (ratio > maxWidth / maxHeight) {
      if (size.width > maxWidth) scale = maxWidth / size.width;
    } else if (size.height > maxHeight) {
      scale = maxHeight / size.height;
    }
  } else if (maxWidth < Infinity) {
    if (size.width > maxWidth) scale = maxWidth / size.width;
  } else if (maxHeight < Infinity) {
    if (size.height > maxHeight) scale = maxHeight / size.height;
  }
  return scale;
}

export function resizeCropperToSizeRestrictions(
  coordinates: CropperCoordinates,
  restrictions: CropperSizeRestrictions,
): CropperCoordinates {
  return applyCropperScale(
    coordinates,
    getCropperScaleToSizeRestrictions(coordinates, restrictions),
  );
}

export function getCropperMaxScale(
  size: CropperSize,
  restrictions: CropperSizeRestrictions,
): number {
  return Math.min(
    restrictions.maxWidth ? restrictions.maxWidth / size.width : Infinity,
    restrictions.maxHeight ? restrictions.maxHeight / size.height : Infinity,
  );
}

export function getCropperMinScale(
  size: CropperSize,
  restrictions: CropperSizeRestrictions,
): number {
  return Math.max(
    restrictions.minWidth ? restrictions.minWidth / size.width : 0,
    restrictions.minHeight ? restrictions.minHeight / size.height : 0,
  );
}

export function createCropperAspectRatio(
  aspectRatio: CropperAspectRatio | undefined,
): CropperAspectRatioRange {
  if (typeof aspectRatio === "number") {
    return { minimum: aspectRatio, maximum: aspectRatio };
  }
  const minimum = aspectRatio?.minimum;
  const maximum = aspectRatio?.maximum;
  return {
    minimum: minimum !== undefined && Number.isFinite(minimum) ? minimum : 0,
    maximum:
      maximum !== undefined && !Number.isNaN(maximum) ? maximum : Infinity,
  };
}

/** The bound a ratio breaks, or `undefined` when it is within the range. */
export function getCropperBrokenRatio(
  ratio: number,
  aspectRatio: CropperAspectRatioRange,
): number | undefined {
  if (aspectRatio.minimum && isCropperLower(ratio, aspectRatio.minimum)) {
    return aspectRatio.minimum;
  }
  if (aspectRatio.maximum && isCropperGreater(ratio, aspectRatio.maximum)) {
    return aspectRatio.maximum;
  }
  return undefined;
}

export function intersectCropperAspectRatios(
  main: CropperAspectRatioRange,
  subset: CropperAspectRatioRange,
): CropperAspectRatioRange {
  return {
    minimum: Math.min(main.maximum, Math.max(main.minimum, subset.minimum)),
    maximum: Math.max(main.minimum, Math.min(main.maximum, subset.maximum)),
  };
}

export function isCropperSizeConsistent(
  size: CropperSize,
  restrictions: Partial<CropperSizeRestrictions>,
): boolean {
  const { minWidth, minHeight, maxWidth, maxHeight } = restrictions;
  return (
    (maxWidth === undefined || !isCropperGreater(size.width, maxWidth)) &&
    (maxHeight === undefined || !isCropperGreater(size.height, maxHeight)) &&
    (minHeight === undefined || !isCropperLower(size.height, minHeight)) &&
    (minWidth === undefined || !isCropperLower(size.width, minWidth))
  );
}

export function isCropperPositionConsistent(
  coordinates: CropperCoordinates,
  restrictions: CropperPositionRestrictions,
): boolean {
  const { left, top, right, bottom } = restrictions;
  return (
    (left === undefined || !isCropperLower(coordinates.left, left)) &&
    (top === undefined || !isCropperLower(coordinates.top, top)) &&
    (right === undefined ||
      !isCropperGreater(coordinates.left + coordinates.width, right)) &&
    (bottom === undefined ||
      !isCropperGreater(coordinates.top + coordinates.height, bottom))
  );
}

function getCropperSizeDistance(a: CropperSize, b: CropperSize): number {
  return (a.width - b.width) ** 2 + (a.height - b.height) ** 2;
}

/**
 * The candidate closest to `reference` that keeps the restrictions and the
 * aspect ratio. When none does, the minimum sizes are ignored.
 */
export function getCropperCloserSize(
  candidates: CropperSize[],
  reference: CropperSize,
  getRestrictions: (size: CropperSize) => CropperSizeRestrictions,
  getAspectRatio: (size: CropperSize) => CropperAspectRatioRange,
): CropperSize | null {
  const traverse = (ignoreMinimum: boolean): CropperSize | null => {
    let closest: CropperSize | null = null;
    for (const size of candidates) {
      const { maxWidth, maxHeight, minWidth, minHeight } =
        getRestrictions(size);
      const restrictions = ignoreMinimum
        ? { maxWidth, maxHeight }
        : { maxWidth, maxHeight, minWidth, minHeight };
      if (
        size.width &&
        size.height &&
        isCropperSizeConsistent(size, restrictions) &&
        !getCropperBrokenRatio(getCropperRatio(size), getAspectRatio(size)) &&
        (!closest ||
          isCropperLower(
            getCropperSizeDistance(size, reference),
            getCropperSizeDistance(closest, reference),
          ))
      ) {
        closest = size;
      }
    }
    return closest;
  };
  return traverse(false) ?? traverse(true);
}

/**
 * The size closest to `width` × `height` that keeps the restrictions and
 * the aspect ratio. Expects each minimum to be below its maximum.
 */
export function approximateCropperSize(params: {
  width: number;
  height: number;
  sizeRestrictions?: CropperSizeRestrictions | undefined;
  aspectRatio?: CropperAspectRatioRange | undefined;
}): CropperSize {
  const { width, height } = params;
  const restrictions = params.sizeRestrictions ?? {
    minWidth: 0,
    minHeight: 0,
    maxWidth: Infinity,
    maxHeight: Infinity,
  };
  const aspectRatio = params.aspectRatio ?? { minimum: 0, maximum: Infinity };

  const clamped = {
    width: Math.max(
      restrictions.minWidth,
      Math.min(restrictions.maxWidth, width),
    ),
    height: Math.max(
      restrictions.minHeight,
      Math.min(restrictions.maxHeight, height),
    ),
  };

  const candidates: CropperSize[] = [clamped];
  for (const ratio of [aspectRatio.minimum, aspectRatio.maximum]) {
    if (ratio && ratio !== Infinity) {
      candidates.push(
        { width: clamped.width, height: clamped.width / ratio },
        { width: clamped.height * ratio, height: clamped.height },
      );
    }
  }

  // Scale each candidate as much as needed to keep the minimum size.
  const fitted = candidates.map((candidate) => {
    const scale = getCropperScaleToSizeRestrictions(candidate, restrictions);
    return { width: candidate.width * scale, height: candidate.height * scale };
  });

  return (
    getCropperCloserSize(
      fitted,
      { width, height },
      () => restrictions,
      () => aspectRatio,
    ) ?? clamped
  );
}
