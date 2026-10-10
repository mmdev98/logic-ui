/**
 * Whether the thumbnails run left to right or top to bottom.
 * @type {'horizontal' | 'vertical'}
 */
export const orientation = "data-orientation";

/**
 * Present while thumbnails are scrolled out of view before the start: fade
 * that edge with a mask.
 */
export const overflowStart = "data-overflow-start";

/**
 * Present while thumbnails are scrolled out of view past the end.
 */
export const overflowEnd = "data-overflow-end";

/**
 * Present while the mouse drags the strip. Turn off snapping and transitions
 * meanwhile.
 */
export const dragging = "data-dragging";
