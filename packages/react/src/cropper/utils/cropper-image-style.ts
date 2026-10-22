// Inline styles that place the image under the crop. Ported from
// `advanced-cropper` (MIT, Copyright (c) Norserium), see LICENSE.
import type { CropperCoordinates, CropperSize, CropperState } from "../types";
import { getCropperRatio } from "./cropper-geometry";
import {
  getCropperCoefficient,
  getCropperTransformedImageSize,
  isCropperStateInitialized,
} from "./cropper-restrictions";

/** Inline style of an image placed by the cropper. */
export interface CropperImageStyle {
  position: "absolute";
  left: number;
  top: number;
  width: number;
  height: number;
  maxWidth: "none";
  transformOrigin: "center";
  transform: string;
}

/**
 * The image is laid out at most 512 px wide and scaled up with `transform`,
 * so a large photo doesn't make the browser lay out a huge element.
 */
const CROPPER_LAYOUT_SIZE = 512;

/**
 * Places the image so that `area` (image pixels) shows at the top left corner
 * of its container, `coefficient` image pixels per screen pixel.
 */
export function getCropperImageStyle(
  imageSize: CropperSize,
  state: CropperState,
  area: CropperCoordinates,
  coefficient: number,
): CropperImageStyle {
  const layoutSize =
    imageSize.width > imageSize.height
      ? {
          width: Math.min(CROPPER_LAYOUT_SIZE, imageSize.width),
          height:
            Math.min(CROPPER_LAYOUT_SIZE, imageSize.width) /
            getCropperRatio(imageSize),
        }
      : {
          width:
            Math.min(CROPPER_LAYOUT_SIZE, imageSize.height) *
            getCropperRatio(imageSize),
          height: Math.min(CROPPER_LAYOUT_SIZE, imageSize.height),
        };
  const transformedSize = getCropperTransformedImageSize(state);
  const scale = (1 / coefficient) * (imageSize.width / layoutSize.width);
  const { rotate, flip } = state.transforms;

  // The layout box is centered on the rotated image's box, and scaled around its center.
  const translateX =
    -(layoutSize.width - transformedSize.width) / (2 * coefficient) -
    ((1 - 1 / coefficient) * layoutSize.width) / 2 -
    area.left / coefficient;
  const translateY =
    -(layoutSize.height - transformedSize.height) / (2 * coefficient) -
    ((1 - 1 / coefficient) * layoutSize.height) / 2 -
    area.top / coefficient;

  return {
    position: "absolute",
    left: 0,
    top: 0,
    width: layoutSize.width,
    height: layoutSize.height,
    maxWidth: "none",
    transformOrigin: "center",
    transform:
      `translate3d(${translateX}px, ${translateY}px, 0px) rotate(${rotate}deg) ` +
      `scaleX(${scale * (flip.horizontal ? -1 : 1)}) scaleY(${scale * (flip.vertical ? -1 : 1)})`,
  };
}

/** Places the image behind the crop in `Cropper.Viewport`. */
export function getCropperBackgroundStyle(
  imageSize: CropperSize,
  state: CropperState | null,
): CropperImageStyle | null {
  if (!isCropperStateInitialized(state)) return null;
  return getCropperImageStyle(
    imageSize,
    state,
    state.visibleArea,
    getCropperCoefficient(state),
  );
}

/**
 * Places the image so the crop fills a box of `size` (screen pixels),
 * centered when their ratios differ.
 */
export function getCropperPreviewStyle(
  imageSize: CropperSize,
  state: CropperState | null,
  size: CropperSize,
): CropperImageStyle | null {
  if (!isCropperStateInitialized(state) || !size.width || !size.height) {
    return null;
  }
  const { coordinates } = state;
  const coefficient =
    getCropperRatio(coordinates) > getCropperRatio(size)
      ? coordinates.width / size.width
      : coordinates.height / size.height;
  return getCropperImageStyle(
    imageSize,
    state,
    {
      ...coordinates,
      left:
        coordinates.left - (size.width * coefficient - coordinates.width) / 2,
      top:
        coordinates.top - (size.height * coefficient - coordinates.height) / 2,
    },
    coefficient,
  );
}
