/**
 * Progress of the drag that closes the viewer: 0 at rest, 1 at the closing
 * distance. Fade with `opacity: calc(1 - var(--lightbox-dismiss-progress, 0))`.
 * @type {number}
 */
export const dismissProgress = "--lightbox-dismiss-progress";

/**
 * How far the slides have moved from the one shown, on screen: negative to
 * the left. Set while a swipe drags them and while they settle, `0px` at rest.
 * @type {CSS length}
 */
export const swipeMovementX = "--lightbox-swipe-movement-x";

/**
 * The same as a share of one slide: `0` at rest, `1` a whole slide to the
 * right, `-1` to the left. Move things with the swipe:
 * `translate: calc(var(--lightbox-swipe-progress, 0) * 2rem) 0`.
 * @type {number}
 */
export const swipeProgress = "--lightbox-swipe-progress";

/**
 * How hard a released swipe was flicked, `0.1` to `1` (a slow release), like
 * Base UI's drawer: the slides settle in 300ms times it. Scale a transition
 * that follows them: `transition-duration: calc(300ms * var(--lightbox-swipe-strength, 1))`.
 * @type {number}
 */
export const swipeStrength = "--lightbox-swipe-strength";

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

/**
 * Scale of the active image: `1` at rest.
 * @type {number}
 */
export const zoomScale = "--lightbox-zoom-scale";

/**
 * The zoom from rest to the largest scale: `0` to `1`. Fade the controls as
 * the image zooms in: `opacity: calc(1 - var(--lightbox-zoom-progress, 0))`.
 * @type {number}
 */
export const zoomProgress = "--lightbox-zoom-progress";
