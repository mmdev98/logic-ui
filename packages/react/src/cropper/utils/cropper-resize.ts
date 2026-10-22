// Resizing a rectangle by its edges within limits and an aspect ratio.
// Ported from `advanced-cropper` (MIT, Copyright (c) Norserium), see LICENSE.
import type { CropperHandlePosition } from "../handle/cropper-handle";
import type {
  CropperCoordinates,
  CropperPoint,
  CropperPositionRestrictions,
  CropperSizeRestrictions,
} from "../types";
import {
  applyCropperDirections,
  applyCropperMove,
  type CropperAspectRatioRange,
  type CropperResizeDirections,
  type CropperSide,
  CROPPER_SIDES,
  getCropperBrokenRatio,
  getCropperDiff,
  getCropperIntersections,
  getCropperOppositeSide,
  getCropperRatio,
  isCropperGreater,
  isCropperRoughlyEqual,
  moveCropperToPositionRestrictions,
} from "./cropper-geometry";

export interface CropperResizeOptions {
  /** Move the opposite edge when an edge reaches a limit. */
  compensate?: boolean | undefined;
  /** Keep the current aspect ratio (Shift while dragging a handle). */
  preserveAspectRatio?: boolean | undefined;
  /** The side whose length wins when the aspect ratio must be fixed. */
  respectDirection?: "width" | "height" | undefined;
  /** The crop when the drag started: the fixed side stays where it was. */
  reference?: CropperCoordinates | null | undefined;
}

export interface CropperResizeLimitations {
  aspectRatio: CropperAspectRatioRange;
  sizeRestrictions: CropperSizeRestrictions;
  positionRestrictions: CropperPositionRestrictions;
}

type CropperAllowedDirections = Record<CropperSide, boolean>;

const HORIZONTAL_SIDES: readonly CropperSide[] = ["left", "right"];
const VERTICAL_SIDES: readonly CropperSide[] = ["top", "bottom"];

interface FitDirectionsParams {
  directions: CropperResizeDirections;
  coordinates: CropperCoordinates;
  positionRestrictions: CropperPositionRestrictions;
  sizeRestrictions: CropperSizeRestrictions;
  allowedDirections: CropperAllowedDirections;
  preserveRatio?: boolean | undefined;
  compensate?: boolean | undefined;
}

/** Shrinks the resize so the result stays within the limits. */
function fitCropperDirections(
  params: FitDirectionsParams,
): CropperResizeDirections {
  const {
    coordinates,
    positionRestrictions,
    sizeRestrictions,
    preserveRatio,
    allowedDirections,
    compensate = true,
  } = params;
  const fitted = { ...params.directions };

  // Keep the width and height from going below 0.
  const { width, height } = applyCropperDirections(coordinates, fitted);
  if (width < 0) {
    const room = coordinates.width - sizeRestrictions.minWidth;
    if (fitted.left < 0 && fitted.right < 0) {
      const { left, right } = fitted;
      fitted.left = -room / (left / right);
      fitted.right = -room / (right / left);
    } else if (fitted.left < 0) {
      fitted.left = -room;
    } else if (fitted.right < 0) {
      fitted.right = -room;
    }
  }
  if (height < 0) {
    const room = coordinates.height - sizeRestrictions.minHeight;
    if (fitted.top < 0 && fitted.bottom < 0) {
      const { top, bottom } = fitted;
      fitted.top = -room / (top / bottom);
      fitted.bottom = -room / (bottom / top);
    } else if (fitted.top < 0) {
      fitted.top = -room;
    } else if (fitted.bottom < 0) {
      fitted.bottom = -room;
    }
  }

  // Keep within the position limits, moving the opposite edge if allowed.
  let breaks = getCropperIntersections(
    applyCropperDirections(coordinates, fitted),
    positionRestrictions,
  );
  const canBeCompensated = CROPPER_SIDES.every(
    (side) =>
      !isCropperGreater(breaks[getCropperOppositeSide(side)], 0) ||
      allowedDirections[side],
  );
  if (compensate && canBeCompensated) {
    if (breaks.left > 0 && breaks.right === 0) {
      fitted.right += breaks.left;
      fitted.left -= breaks.left;
    } else if (breaks.right > 0 && breaks.left === 0) {
      fitted.left += breaks.right;
      fitted.right -= breaks.right;
    }
    if (breaks.top > 0 && breaks.bottom === 0) {
      fitted.bottom += breaks.top;
      fitted.top -= breaks.top;
    } else if (breaks.bottom > 0 && breaks.top === 0) {
      fitted.top += breaks.bottom;
      fitted.bottom -= breaks.bottom;
    }
    breaks = getCropperIntersections(
      applyCropperDirections(coordinates, fitted),
      positionRestrictions,
    );
  }

  const maxResize = {
    width: Infinity,
    height: Infinity,
    left: Infinity,
    right: Infinity,
    top: Infinity,
    bottom: Infinity,
  };
  for (const side of CROPPER_SIDES) {
    if (breaks[side] && fitted[side]) {
      maxResize[side] = Math.max(0, 1 - breaks[side] / fitted[side]);
    }
  }
  if (preserveRatio) {
    const multiplier = Math.min(
      ...CROPPER_SIDES.map((side) => maxResize[side]),
    );
    if (multiplier !== Infinity) {
      for (const side of CROPPER_SIDES) fitted[side] *= multiplier;
    }
  } else {
    for (const side of CROPPER_SIDES) {
      if (maxResize[side] !== Infinity) fitted[side] *= maxResize[side];
    }
  }

  // Keep within the size restrictions.
  const size = applyCropperDirections(coordinates, fitted);
  const horizontal = fitted.right + fitted.left;
  if (horizontal) {
    if (size.width > sizeRestrictions.maxWidth) {
      maxResize.width =
        (sizeRestrictions.maxWidth - coordinates.width) / horizontal;
    } else if (size.width < sizeRestrictions.minWidth) {
      maxResize.width =
        (sizeRestrictions.minWidth - coordinates.width) / horizontal;
    }
  }
  const vertical = fitted.bottom + fitted.top;
  if (vertical) {
    if (size.height > sizeRestrictions.maxHeight) {
      maxResize.height =
        (sizeRestrictions.maxHeight - coordinates.height) / vertical;
    } else if (size.height < sizeRestrictions.minHeight) {
      maxResize.height =
        (sizeRestrictions.minHeight - coordinates.height) / vertical;
    }
  }
  if (preserveRatio) {
    const multiplier = Math.min(maxResize.width, maxResize.height);
    if (multiplier !== Infinity) {
      for (const side of CROPPER_SIDES) fitted[side] *= multiplier;
    }
  } else {
    if (maxResize.width !== Infinity) {
      for (const side of HORIZONTAL_SIDES) fitted[side] *= maxResize.width;
    }
    if (maxResize.height !== Infinity) {
      for (const side of VERTICAL_SIDES) fitted[side] *= maxResize.height;
    }
  }
  return fitted;
}

/** Share of an overlap given to `first`, in proportion to how far each side moved. */
function distributeCropperOverlap(
  overlap: number,
  first: number,
  second: number,
): number {
  if (isCropperRoughlyEqual(first + second, 0)) return overlap / 2;
  if (isCropperRoughlyEqual(first, 0)) return 0;
  if (isCropperRoughlyEqual(second, 0)) return overlap;
  return overlap * Math.abs(first / (first + second));
}

/**
 * Moves the edges of a rectangle outwards by `directions`, within the limits
 * and the aspect ratio.
 */
export function resizeCropperCoordinates(
  coordinates: CropperCoordinates,
  resizeDirections: CropperResizeDirections,
  options: CropperResizeOptions & {
    allowedDirections?: CropperAllowedDirections | undefined;
  },
  limitations: CropperResizeLimitations,
): CropperCoordinates {
  const { aspectRatio, positionRestrictions, sizeRestrictions } = limitations;
  const allowedDirections = options.allowedDirections ?? {
    left: true,
    right: true,
    top: true,
    bottom: true,
  };
  let directions = { ...resizeDirections };

  // A crop already below its minimum size can't be resized on that axis.
  if (coordinates.width < sizeRestrictions.minWidth) {
    directions.left = 0;
    directions.right = 0;
  }
  if (coordinates.height < sizeRestrictions.minHeight) {
    directions.top = 0;
    directions.bottom = 0;
  }
  for (const side of CROPPER_SIDES) {
    if (!allowedDirections[side]) directions[side] = 0;
  }

  // 1. The resize that keeps the limits.
  directions = fitCropperDirections({
    coordinates,
    directions,
    sizeRestrictions,
    positionRestrictions,
    allowedDirections,
  });

  // 2. Fix it to keep the aspect ratio.
  let size = applyCropperDirections(coordinates, directions);
  let brokenRatio = options.preserveAspectRatio
    ? getCropperRatio(coordinates)
    : getCropperBrokenRatio(size.width / size.height, aspectRatio);

  if (brokenRatio) {
    let { respectDirection } = options;
    if (respectDirection !== "width" && respectDirection !== "height") {
      respectDirection =
        coordinates.width >= coordinates.height || brokenRatio === 1
          ? "width"
          : "height";
    }
    if (respectDirection === "width") {
      const overlapHeight = size.width / brokenRatio - coordinates.height;
      if (allowedDirections.top && allowedDirections.bottom) {
        const { top, bottom } = directions;
        directions.bottom = distributeCropperOverlap(
          overlapHeight,
          bottom,
          top,
        );
        directions.top = distributeCropperOverlap(overlapHeight, top, bottom);
      } else if (allowedDirections.bottom) {
        directions.bottom = overlapHeight;
      } else if (allowedDirections.top) {
        directions.top = overlapHeight;
      } else if (allowedDirections.right) {
        directions.right = 0;
      } else if (allowedDirections.left) {
        directions.left = 0;
      }
    } else {
      const overlapWidth = coordinates.width - size.height * brokenRatio;
      if (allowedDirections.left && allowedDirections.right) {
        const { left, right } = directions;
        directions.left = -distributeCropperOverlap(overlapWidth, left, right);
        directions.right = -distributeCropperOverlap(overlapWidth, right, left);
      } else if (allowedDirections.left) {
        directions.left = -overlapWidth;
      } else if (allowedDirections.right) {
        directions.right = -overlapWidth;
      } else if (allowedDirections.top) {
        directions.top = 0;
      } else if (allowedDirections.bottom) {
        directions.bottom = 0;
      }
    }

    // 3. Fit the resize with the right ratio to the limits again.
    directions = fitCropperDirections({
      directions,
      coordinates,
      sizeRestrictions,
      positionRestrictions,
      preserveRatio: true,
      compensate: options.compensate,
      allowedDirections,
    });
  }

  // 4. Drop a resize that still breaks the ratio.
  size = applyCropperDirections(coordinates, directions);
  brokenRatio = options.preserveAspectRatio
    ? getCropperRatio(coordinates)
    : getCropperBrokenRatio(size.width / size.height, aspectRatio);
  if (
    brokenRatio &&
    isCropperGreater(Math.abs(brokenRatio - size.width / size.height), 0)
  ) {
    directions = { left: 0, top: 0, right: 0, bottom: 0 };
  }

  return moveCropperToPositionRestrictions(
    applyCropperDirections(coordinates, directions),
    positionRestrictions,
  );
}

/** The edges a handle moves. */
export function getCropperAllowedDirections(
  position: CropperHandlePosition,
): CropperAllowedDirections {
  return {
    left: !position.includes("right"),
    top: !position.includes("bottom"),
    right: !position.includes("left"),
    bottom: !position.includes("top"),
  };
}

/** Turns the move of a handle into how far each edge moves outwards. */
export function getCropperHandleDirections(
  position: CropperHandlePosition,
  move: CropperPoint,
): CropperResizeDirections {
  const allowed = getCropperAllowedDirections(position);
  const horizontal = position.includes("left") || position.includes("right");
  const vertical = position.includes("top") || position.includes("bottom");
  const directions = {
    left: horizontal ? -move.left : 0,
    right: horizontal ? move.left : 0,
    top: vertical ? -move.top : 0,
    bottom: vertical ? move.top : 0,
  };
  for (const side of CROPPER_SIDES) {
    if (!allowed[side]) directions[side] = 0;
  }
  return directions;
}

/** The corner or edge that stays in place while a handle is dragged. */
function getCropperHandleAnchor(
  coordinates: CropperCoordinates,
  position: CropperHandlePosition,
): CropperPoint {
  const horizontal = position.includes("left")
    ? 1
    : position.includes("right")
      ? 0
      : 0.5;
  const vertical = position.includes("top")
    ? 1
    : position.includes("bottom")
      ? 0
      : 0.5;
  return {
    left: coordinates.left + coordinates.width * horizontal,
    top: coordinates.top + coordinates.height * vertical,
  };
}

/** Resizes the crop by dragging the handle at `position` by `move`. */
export function resizeCropperCoordinatesByHandle(
  coordinates: CropperCoordinates,
  position: CropperHandlePosition,
  move: CropperPoint,
  options: CropperResizeOptions,
  limitations: CropperResizeLimitations,
): CropperCoordinates {
  let result = resizeCropperCoordinates(
    coordinates,
    getCropperHandleDirections(position, move),
    { ...options, allowedDirections: getCropperAllowedDirections(position) },
    limitations,
  );
  if (options.reference) {
    // Keep the fixed side where it was when the drag started.
    result = applyCropperMove(
      result,
      getCropperDiff(
        getCropperHandleAnchor(options.reference, position),
        getCropperHandleAnchor(result, position),
      ),
    );
  }
  return moveCropperToPositionRestrictions(
    result,
    limitations.positionRestrictions,
  );
}
