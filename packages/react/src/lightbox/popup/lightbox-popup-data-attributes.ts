/**
 * Present while the active image is zoomed in.
 */
export const zoomed = "data-zoomed";

/**
 * Present after a tap hid the controls (toolbar, caption, close button).
 */
export const controlsHidden = "data-controls-hidden";

/**
 * Present while the image flies back or fades out. Fade the controls then, not the popup: the image is inside it.
 */
export const endingStyle = "data-ending-style";

/**
 * Present while a finger or the mouse swipes or pulls the image, and until it settles back after a pull
 * to close. Turn transitions off meanwhile, so what follows `--lightbox-dismiss-progress` keeps
 * up with the finger.
 */
export const swiping = "data-swiping";

/**
 * Side of the previous item the item shown came from, on screen: `right`
 * after Next in a left-to-right layout. `none` when the viewer opens.
 * @type {'left' | 'right' | 'none'}
 */
export const activationDirection = "data-activation-direction";
