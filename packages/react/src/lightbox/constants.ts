/** Scales of the zoom: limits, button step and double-tap target. */
export const LIGHTBOX_ZOOM_SCALE = {
  min: 1,
  max: 4,
  step: 0.5,
  doubleTap: 2.5,
} as const;

/** The viewer opens anyway when the image takes longer than this to load (ms). */
export const LIGHTBOX_PRELOAD_TIMEOUT = 3000;

/** Items rendered on each side of the active one; the others stay empty. */
export const LIGHTBOX_RENDERED_NEIGHBORS = 1;

/** Pixels an arrow key pans a zoomed image. */
export const LIGHTBOX_KEYBOARD_PAN_STEP = 80;

/** Motion of the image flying between a trigger and the viewer. */
export const LIGHTBOX_FLIGHT_DURATION = 350;
export const LIGHTBOX_FLIGHT_EASING = "cubic-bezier(0.32, 0.72, 0, 1)";

/** Time a swipe, zoom or drag takes to settle after release (ms). */
export const LIGHTBOX_SETTLE_DURATION = 300;

/** Distance a press moves before it becomes a drag (px). */
export const LIGHTBOX_DRAG_THRESHOLD = 8;

/** A swipe moves to the next item past this share of the width, or this speed (px/ms). */
export const LIGHTBOX_SWIPE_DISTANCE = 0.25;
export const LIGHTBOX_SWIPE_VELOCITY = 0.3;

/**
 * How a released swipe's speed becomes `--lightbox-swipe-strength`, like Base
 * UI's drawer: the time left at that speed (ms), clamped, mapped to `min`–1.
 */
export const LIGHTBOX_SWIPE_STRENGTH = {
  minVelocity: 0.2,
  maxVelocity: 4,
  minDuration: 80,
  maxDuration: 360,
  min: 0.1,
} as const;

/** A vertical drag closes the viewer past this share of the height, or this speed (px/ms). */
export const LIGHTBOX_DISMISS_DISTANCE = 0.15;
export const LIGHTBOX_DISMISS_VELOCITY = 0.5;

/** Two taps closer than this in time (ms) and space (px) are a double tap. */
export const LIGHTBOX_DOUBLE_TAP_DELAY = 300;
export const LIGHTBOX_DOUBLE_TAP_DISTANCE = 30;

/**
 * CSS variable set on `Lightbox.Popup` and `Lightbox.Backdrop` while the image
 * is dragged to close: 0 at rest, 1 at the closing distance.
 */
export const LIGHTBOX_DISMISS_PROGRESS_VARIABLE = "--lightbox-dismiss-progress";
