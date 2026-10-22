/** A point, in image pixels unless stated otherwise. */
export interface CropperPoint {
  left: number;
  top: number;
}

/** A size, in image pixels unless stated otherwise. */
export interface CropperSize {
  width: number;
  height: number;
}

/** A rectangle: its top left corner and its size. */
export interface CropperCoordinates extends CropperPoint, CropperSize {}

/** Rotation in degrees and mirroring applied to the image. */
export interface CropperTransforms {
  rotate: number;
  flip: {
    horizontal: boolean;
    vertical: boolean;
  };
}

/** Transforms to start from; a missing field keeps the image as it is. */
export interface CropperDefaultTransforms {
  rotate?: number | undefined;
  flip?:
    | {
        horizontal?: boolean | undefined;
        vertical?: boolean | undefined;
      }
    | undefined;
}

/**
 * Everything the cropper knows about the crop. Lengths are in pixels of the
 * transformed (rotated) image, except `boundary`, in pixels of the screen.
 */
export interface CropperState {
  /** Size of `Cropper.Viewport` on screen. */
  boundary: CropperSize;
  /** Natural size of the image. */
  imageSize: CropperSize;
  transforms: CropperTransforms;
  /** Part of the image shown in `Cropper.Viewport`. */
  visibleArea: CropperCoordinates | null;
  /** The crop. */
  coordinates: CropperCoordinates | null;
}

/**
 * The aspect ratio (width / height) the crop must keep: one number, or a
 * range. Leave out a bound to leave that side free.
 */
export type CropperAspectRatio =
  | number
  | {
      minimum?: number | undefined;
      maximum?: number | undefined;
    };

/** Smallest and largest size, in image pixels. */
export interface CropperSizeRestrictions {
  minWidth: number;
  minHeight: number;
  maxWidth: number;
  maxHeight: number;
}

/** Edges a rectangle must stay within, in image pixels. A missing edge is free. */
export interface CropperPositionRestrictions {
  left?: number | undefined;
  top?: number | undefined;
  right?: number | undefined;
  bottom?: number | undefined;
}

/** Options of the canvas `getCanvas()` draws the crop on. */
export interface CropperCanvasOptions {
  /** Width of the result; the height follows the crop's aspect ratio. */
  width?: number | undefined;
  /** Height of the result; the width follows the crop's aspect ratio. */
  height?: number | undefined;
  minWidth?: number | undefined;
  minHeight?: number | undefined;
  maxWidth?: number | undefined;
  maxHeight?: number | undefined;
  /** Largest number of pixels (width × height) of the result. */
  maxArea?: number | undefined;
  /**
   * Colour drawn behind the image, seen where the crop leaves it.
   * @default "transparent"
   */
  fillColor?: string | undefined;
  /** @default true */
  imageSmoothingEnabled?: boolean | undefined;
  /** @default "high" */
  imageSmoothingQuality?: ImageSmoothingQuality | undefined;
}
