// Drawing the crop on a canvas. Ported from `advanced-cropper` (MIT,
// Copyright (c) Norserium), see LICENSE.
import { ownerDocument } from "@base-ui/utils/owner";
import type {
  CropperCanvasOptions,
  CropperCoordinates,
  CropperSize,
  CropperTransforms,
  CropperState,
} from "../types";
import {
  approximateCropperSize,
  getCropperCenter,
  rotateCropperPoint,
  rotateCropperSize,
} from "./cropper-geometry";
import { isCropperStateInitialized } from "./cropper-restrictions";

/** Draws the image rotated and flipped, on a canvas the size of its bounding box. */
function drawCropperTransformedImage(
  canvas: HTMLCanvasElement,
  image: HTMLImageElement,
  transforms: CropperTransforms,
): HTMLCanvasElement {
  const { rotate, flip } = transforms;
  const size = { width: image.naturalWidth, height: image.naturalHeight };
  const transformedSize = rotateCropperSize(size, rotate);
  canvas.width = transformedSize.width;
  canvas.height = transformedSize.height;

  const context = canvas.getContext("2d");
  if (!context) return canvas;

  const center = rotateCropperPoint(
    getCropperCenter({ left: 0, top: 0, ...size }),
    rotate,
  );
  context.translate(
    -(center.left - transformedSize.width / 2),
    -(center.top - transformedSize.height / 2),
  );
  context.rotate((rotate * Math.PI) / 180);
  context.translate(
    flip.horizontal ? size.width : 0,
    flip.vertical ? size.height : 0,
  );
  context.scale(flip.horizontal ? -1 : 1, flip.vertical ? -1 : 1);
  context.drawImage(image, 0, 0, size.width, size.height);
  return canvas;
}

function drawCropperArea(
  canvas: HTMLCanvasElement,
  source: HTMLCanvasElement | HTMLImageElement,
  coordinates: CropperCoordinates,
  size: CropperSize,
  options: CropperCanvasOptions,
): HTMLCanvasElement {
  canvas.width = size.width;
  canvas.height = size.height;
  const context = canvas.getContext("2d");
  if (!context) return canvas;

  const {
    fillColor = "transparent",
    imageSmoothingEnabled = true,
    imageSmoothingQuality = "high",
  } = options;
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.imageSmoothingEnabled = imageSmoothingEnabled;
  context.imageSmoothingQuality = imageSmoothingQuality;
  context.fillStyle = fillColor;
  context.fillRect(0, 0, canvas.width, canvas.height);

  // Part of the crop outside the image is left to the fill.
  const offsetX = coordinates.left < 0 ? -coordinates.left : 0;
  const offsetY = coordinates.top < 0 ? -coordinates.top : 0;
  context.drawImage(
    source,
    coordinates.left + offsetX,
    coordinates.top + offsetY,
    coordinates.width,
    coordinates.height,
    offsetX * (canvas.width / coordinates.width),
    offsetY * (canvas.height / coordinates.height),
    canvas.width,
    canvas.height,
  );
  return canvas;
}

/** The size of the result: the crop's size within the options, at the crop's ratio. */
export function getCropperCanvasSize(
  coordinates: CropperSize,
  options: CropperCanvasOptions,
): CropperSize {
  const {
    width,
    height,
    minWidth = 0,
    minHeight = 0,
    maxWidth = Infinity,
    maxHeight = Infinity,
    maxArea = Infinity,
  } = options;
  const ratio = coordinates.width / coordinates.height;
  let size = approximateCropperSize({
    width: coordinates.width,
    height: coordinates.height,
    sizeRestrictions: {
      minWidth: width ?? minWidth,
      minHeight: height ?? minHeight,
      maxWidth: width ?? maxWidth,
      maxHeight: height ?? maxHeight,
    },
    aspectRatio: { minimum: ratio, maximum: ratio },
  });
  if (size.width * size.height > maxArea) {
    const scale = Math.sqrt(maxArea / (size.width * size.height));
    size = {
      width: Math.round(scale * size.width),
      height: Math.round(scale * size.height),
    };
  }
  // A canvas truncates a fractional size: round it, as `getCoordinates()` does.
  return {
    width: Math.max(1, Math.round(size.width)),
    height: Math.max(1, Math.round(size.height)),
  };
}

/** Draws the crop of `image` on a new canvas, or returns `null` before the image is on screen. */
export function drawCropperCanvas(
  state: CropperState | null,
  image: HTMLImageElement,
  options: CropperCanvasOptions = {},
): HTMLCanvasElement | null {
  if (!isCropperStateInitialized(state)) return null;
  const { transforms, coordinates } = state;
  const doc = ownerDocument(image);
  const transformed =
    transforms.rotate !== 0 ||
    transforms.flip.horizontal ||
    transforms.flip.vertical;
  const source = transformed
    ? drawCropperTransformedImage(
        doc.createElement("canvas"),
        image,
        transforms,
      )
    : image;
  return drawCropperArea(
    doc.createElement("canvas"),
    source,
    coordinates,
    getCropperCanvasSize(coordinates, options),
    options,
  );
}
