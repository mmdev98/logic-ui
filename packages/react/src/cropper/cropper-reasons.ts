/**
 * Why the crop changed, as passed in `eventDetails.reason`. Imported as
 * `* as REASONS`, like Base UI's `reason-parts`: the parts write
 * `REASONS.wheel`, and `CropperRootChangeEventReason` is a union of their
 * types. The values are Base UI's where it has one.
 */

/** A new image was shown, or the cropper started over on it. */
export const imageLoad = "image-load" as const;

/** `Cropper.Viewport` changed size. */
export const viewportResize = "viewport-resize" as const;

/** A prop such as `aspectRatio` changed and the crop was fitted to it. */
export const settingsChange = "settings-change" as const;

/** `Cropper.Stencil` was dragged. */
export const stencilDrag = "stencil-drag" as const;

/** A `Cropper.Handle` was dragged. */
export const handleDrag = "handle-drag" as const;

/** The image was dragged. */
export const imageDrag = "image-drag" as const;

/** Two fingers pinched or turned the image. */
export const pinch = "pinch" as const;

/** The wheel or a trackpad pinch zoomed the image. */
export const wheel = "wheel" as const;

/** A key moved, resized or zoomed the crop. */
export const keyboard = "keyboard" as const;

/** `Cropper.ZoomIn` was pressed. */
export const zoomInPress = "zoom-in-press" as const;

/** `Cropper.ZoomOut` was pressed. */
export const zoomOutPress = "zoom-out-press" as const;

/** `Cropper.Rotate` was pressed. */
export const rotatePress = "rotate-press" as const;

/** `Cropper.Flip` was pressed. */
export const flipPress = "flip-press" as const;

/** `Cropper.Reset` was pressed. */
export const resetPress = "reset-press" as const;

/** A call on `actionsRef` or on the context's actions. */
export const imperativeAction = "imperative-action" as const;

/** Another cause. */
export const none = "none" as const;
