/**
 * Length of the flight the image is on, or was last on: `350ms`. Fade the
 * backdrop over it: `transition-duration: var(--lightbox-flight-duration)`.
 * @type {CSS time}
 */
export const flightDuration = "--lightbox-flight-duration";

/**
 * Curve of that flight: a `cubic-bezier()`, or a `linear()` spring after
 * a pull to dismiss. `transition-timing-function: var(--lightbox-flight-easing)`.
 * @type {CSS easing function}
 */
export const flightEasing = "--lightbox-flight-easing";

/**
 * Progress of the pull to dismiss: 0 at rest, 1 at the closing
 * distance. Fade with `opacity: calc(1 - var(--lightbox-dismiss-progress, 0))`.
 * @type {number}
 */
export const dismissProgress = "--lightbox-dismiss-progress";

/**
 * How far the image is pulled to dismiss, from where it rests.
 * @type {CSS length}
 */
export const dismissMovementX = "--lightbox-dismiss-movement-x";

/**
 * How far the image is pulled to dismiss, from where it rests.
 * @type {CSS length}
 */
export const dismissMovementY = "--lightbox-dismiss-movement-y";
