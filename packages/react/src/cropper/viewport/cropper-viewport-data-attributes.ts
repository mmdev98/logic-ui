/** Present while the image loads, or waits for `Cropper.Viewport` to have a size. */
export const loading = "data-loading";

/** Present once the image is on screen with its crop. */
export const loaded = "data-loaded";

/** Present when the image failed to load. */
export const error = "data-error";

/** Present when the cropper ignores the user. */
export const disabled = "data-disabled";

/** Present while a drag, pinch or wheel zoom is in progress. */
export const interacting = "data-interacting";

/** Present while a change animates, for `--cropper-transition-duration`. */
export const transitioning = "data-transitioning";
