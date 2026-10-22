/** Time the crop and the image take to settle after a button or key press (ms). */
export const CROPPER_TRANSITION_DURATION = 350;

/** Zoom factor of `Cropper.ZoomIn`, and its inverse for `Cropper.ZoomOut`. */
export const CROPPER_ZOOM_STEP = 1.25;

/** Share of the view one wheel step zooms. */
export const CROPPER_WHEEL_RATIO = 0.1;

/** A wheel zoom ends after this long without a wheel event (ms). */
export const CROPPER_WHEEL_TIMEOUT = 500;

/** Degrees `Cropper.Rotate` turns the image by default. */
export const CROPPER_ROTATE_ANGLE = 90;

/** Screen pixels an arrow key moves the crop or a handle; with Shift, the large step. */
export const CROPPER_KEYBOARD_STEP = 10;
export const CROPPER_KEYBOARD_LARGE_STEP = 50;

/**
 * Distance a finger moves on `Cropper.Stencil` before the crop follows (px),
 * so a second finger can still start a pinch.
 */
export const CROPPER_TOUCH_DRAG_THRESHOLD = 30;
