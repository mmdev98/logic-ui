/**
 * Progress of the drag that closes the viewer: 0 at rest, 1 at the closing
 * distance. Fade with `opacity: calc(1 - var(--lightbox-dismiss-progress, 0))`.
 * @type {number}
 */
export const dismissProgress = "--lightbox-dismiss-progress";

/**
 * How far the image is dragged to close, from where it rests.
 * @type {CSS length}
 */
export const dismissMovementX = "--lightbox-dismiss-movement-x";

/**
 * How far the image is dragged to close, from where it rests.
 * @type {CSS length}
 */
export const dismissMovementY = "--lightbox-dismiss-movement-y";
